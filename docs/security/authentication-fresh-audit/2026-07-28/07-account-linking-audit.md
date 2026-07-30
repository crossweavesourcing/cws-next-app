# 07 — Google Account Linking Security Audit

| Field | Value |
|---|---|
| Audit date | 2026-07-28 |
| Scope | OAuth account linking, pre-provisioned model, concurrent callback handling |
| Standards | OWASP ASVS 2.2 (Authentication), NIST SP 800-63B |

## 1. Architecture Overview

The application uses a **pre-provisioned-only** account linking model. No public registration exists; an OAuth identity (Google) is only accepted if an `oauth_accounts` row has been explicitly created beforehand by an administrator or through an authenticated, password+MFA-gated session (later workstream).

### 1.1 Key Components

| Component | File | Purpose |
|---|---|---|
| `OAuthAccountRepository` | `src/auth/repositories/oauth-account.repository.ts` | Link/unlink/find provider accounts |
| `OAuthService` | `src/auth/services/oauth.service.ts` | OAuth flow orchestration |
| `oauth_accounts` schema | `src/database/schemas/oauth-accounts.schema.ts` | Document structure |
| `oauth_accounts` indexes | `src/database/indexes/oauth-accounts.indexes.ts` | Compound unique index |

## 2. Pre-Provisioned-Only Linking Model (FIX-C3)

### 2.1 Design Decision

The `OAuthService.handleCallbackInternal` method implements the FIX-C3 mitigation (`src/auth/services/oauth.service.ts:256-267`):

```typescript
// FIX-C3: explicit, pre-provisioned linking ONLY. For a fixed internal-user
// app (no public registration) we must NOT auto-link by verified email —
// that lets anyone controlling a Google identity asserting a matching
// verified email link to / authenticate as a provisioned internal user,
// bypassing password/MFA discipline (account takeover).
const oauthAccount = await this.oauthRepo.findByProvider('google', profile.sub);
if (!oauthAccount) {
  throw new Error('Google sign-in is not enabled for this account. Contact an administrator.');
}
```

**Assessment: Correctly implemented.** The system never auto-links by email. Only a pre-existing `oauth_accounts` row matching `(provider='google', providerAccountId=profile.sub)` grants access.

### 2.2 Email Matching Analysis

The `profile.sub` (Google's immutable user ID, not the email) is used as the linking key. The `providerEmail` is stored for reference but is **never** used as a lookup key during login (`OAuthAccountRepository.findByProvider` queries on `provider` + `providerAccountId` only).

**Risk if email auto-linking were added:** An attacker controlling a Google account that shares a verified email with a provisioned user could authenticate as that user, bypassing password/MFA. FIX-C3 explicitly prevents this.

### 2.3 Current Linking Mechanism

There is **no public linking or unlinking UI**. The only path to create an `oauth_accounts` row is:
1. An administrator manually inserts a record (via seed script or direct DB operation).
2. A future "connect Google" flow within an authenticated, password+MFA-gated session (referenced as a "later workstream" in code comments at `oauth.service.ts:261-262`).

**Finding OAUTH-LINK-001: No user-facing account linking UI exists.**
- **Severity:** Informational
- **Status:** By design — requires future workstream implementation
- **Impact:** Users cannot self-service connect/disconnect Google accounts

## 3. OAuth Account Repository: Idempotent Linking

### 3.1 `link()` Method Analysis

`OAuthAccountRepository.link()` (`oauth-account.repository.ts:23-51`) implements idempotent linking:

1. Queries `(provider, providerAccountId)` — if found, updates `providerEmail` and `lastUsedAt` and returns existing doc.
2. If not found, inserts a new `OAuthAccountDocument`.

**Finding OAUTH-LINK-002: `link()` is not currently called during login.**
- **Severity:** Informational
- **Status:** By design — pre-provisioned rows only
- **Note:** The `link()` method exists for the future linking workstream. It is safe for concurrent calls because of the unique index (see §4).

### 3.2 `touchLastUsed()` Method

Called after a successful OAuth callback (`oauth.service.ts:276`). Updates `lastUsedAt` on `(provider, providerAccountId)`. Non-security-critical metadata update.

## 4. Unique Index Analysis

### 4.1 Current Indexes

`oauth-accounts.indexes.ts`:

```typescript
{
  key:    { provider: 1, providerAccountId: 1 },
  unique: true,
  name:   'uidx_provider_accountId',
}
```

**Assessment: The compound unique index on `(provider, providerAccountId)` already exists and is correctly declared.** This prevents:
- Duplicate linking of the same Google identity to multiple users
- Race conditions during concurrent OAuth callbacks for the same Google user

### 4.2 Missing Index Concern

The schema and indexes are complete for the current use case. No additional indexes are needed:
- `userId` index exists for reverse lookups (all providers for a user)
- `(provider, providerAccountId)` unique index covers the primary lookup path

**Finding OAUTH-LINK-003: Unique index correctly prevents duplicate linking.**
- **Severity:** N/A (pass)
- **Status:** Verified

## 5. Concurrent Callback Duplicate Record Prevention

### 5.1 Race Condition Analysis

If two concurrent OAuth callbacks arrive for the same Google user (e.g., user double-clicks the login button):

1. Both call `OAuthService.handleCallbackInternal()`.
2. Both call `oauthRepo.findByProvider('google', profile.sub)`.
3. Both find the pre-provisioned row → proceed to session creation.
4. Both create sessions → two concurrent sessions for the same user.

**This is not a linking race condition** (the row already exists). The race is in session creation, which is handled by the concurrent session limit (5 per user) in `SessionService.enforceConcurrentSessionLimit()`.

If the `link()` method were called during login (it is not currently), the unique index at the database level would cause one insert to fail with a duplicate key error, preventing duplicate rows.

### 5.2 Token Exchange Race

Google authorization codes are single-use on Google's side. Two concurrent exchanges with the same code would fail — Google rejects the second token exchange.

**Finding OAUTH-LINK-004: No duplicate record risk during OAuth callbacks.**
- **Severity:** N/A (pass)
- **Rationale:** Pre-provisioned rows + unique index + Google code single-use

## 6. Unlinking Analysis

### 6.1 No Unlinking UI Exists

There is no Server Action, Route Handler, or UI component for unlinking a Google account. The `OAuthAccountRepository` has no `unlink()` or `remove()` method.

### 6.2 Implications

- **Positive:** No attack vector for session fixation or account takeover via unlinking.
- **Negative:** Users cannot disconnect compromised Google accounts without administrator DB access.

**Finding OAUTH-LINK-005: No user-facing unlinking mechanism exists.**
- **Severity:** Informational
- **Status:** By design — administrative operation only

## 7. Session Creation After OAuth Callback

### 7.1 MFA Enforcement

After a successful Google callback, the risk engine evaluates (`oauth.service.ts:288-296`). If the policy requires 2FA (`require_2fa` or `require_strong_2fa`), a pending authentication is created and the user is redirected to `/dashboard/verify-2fa`. No session is issued until MFA completes.

### 7.2 Force Password Change

If the user has `forcePasswordChange` set or an expired password, a `cws_pw_pending` cookie is issued instead of a session. The user must change their password before receiving a session.

**Finding OAUTH-LINK-006: Google login enforces MFA via risk engine.**
- **Severity:** N/A (pass)
- **Note:** Risk engine determines if 2FA is required. If risk level is low and no TOTP/passkey is configured, Google login may complete without 2FA. This is the designed behavior — the risk engine is the gatekeeper.

## 8. ID Token Verification

### 8.1 Signature Verification

`OAuthService.verifyIdToken()` (`oauth.service.ts:428-504`) performs:
1. JWT structure validation (3 parts)
2. Algorithm check (`RS256` only)
3. JWKS resolution with local cache + forced refetch on `kid` miss
4. RSA-SHA256 signature verification using Google's public key
5. Standard claims validation: `iss`, `aud`, `exp`, `iat`, `nonce`

### 8.2 Nonce Replay Protection

The nonce is generated per-request (`crypto.randomBytes(24).toString('hex')`) and verified against the id_token's `nonce` claim. This prevents replay of intercepted tokens.

**Finding OAUTH-LINK-007: ID token verification is comprehensive.**
- **Severity:** N/A (pass)
- **Notes:**
  - Clock tolerance: 60 seconds (acceptable)
  - JWKS cache is non-authoritative (best-effort per instance)
  - Missing nonce is allowed when `expectedNonce` is null (mobile flow)

## 9. State/CSRF Protection

### 9.1 Authorization URL

`OAuthService.buildAuthorizationUrl()` generates:
- `state`: 32 random bytes (hex) — CSRF protection
- `codeVerifier`: 48 random bytes (hex) — PKCE
- `nonce`: 24 random bytes (hex) — id_token replay protection

### 9.2 Callback Validation

At callback time (`oauth.service.ts:248-249`):
```typescript
if (!state || !expectedState || state !== expectedState) {
  throw new Error('OAuth state mismatch (possible CSRF).');
}
```

State and code_verifier are stored in a short-lived cookie by the caller (OAuth start route) and validated at callback. The comparison is string equality — timing-safe comparison is not used, but this is acceptable for state values that are high-entropy random tokens (not secrets).

**Finding OAUTH-LINK-008: OAuth state/CSRF protection correctly implemented.**
- **Severity:** N/A (pass)

## 10. Summary of Findings

| ID | Finding | Severity | Status |
|---|---|---|---|
| OAUTH-LINK-001 | No user-facing account linking UI | Informational | By design |
| OAUTH-LINK-002 | `link()` method exists but is not called during login | Informational | By design |
| OAUTH-LINK-003 | Compound unique index prevents duplicate linking | N/A | Pass |
| OAUTH-LINK-004 | No duplicate record risk during OAuth callbacks | N/A | Pass |
| OAUTH-LINK-005 | No user-facing unlinking mechanism | Informational | By design |
| OAUTH-LINK-006 | Google login enforces MFA via risk engine | N/A | Pass |
| OAUTH-LINK-007 | ID token verification is comprehensive | N/A | Pass |
| OAUTH-LINK-008 | OAuth state/CSRF protection correctly implemented | N/A | Pass |

## 11. Recommendations

1. **Future linking workstream (noted in code):** When implementing user-facing Google connect/disconnect, ensure:
   - Linking requires password + MFA re-authentication (`requireSudoMode`)
   - Unlinking requires the user to have an alternative authentication method
   - Linking emits `auth.oauth.linked` audit event
   - Unlinking emits `auth.oauth.unlinked` audit event
2. **Consider rate limiting OAuth callbacks** per IP to prevent abuse of the token exchange endpoint.
3. **Monitor for orphaned `oauth_accounts` rows** where the referenced `userId` no longer exists or is inactive.
