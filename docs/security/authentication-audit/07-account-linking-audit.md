# OAuth Account Linking Security Audit

> Audit Date: 2026-07-27 | Commit: `32af9be` | Branch: `main`

---

## Scope

This report covers the security of Google OAuth account linking and unlinking as implemented across:

| File | Role |
|---|---|
| `src/auth/services/oauth.service.ts` | Login-time account lookup via `OAuthAccountRepository` |
| `src/auth/repositories/oauth-account.repository.ts` | `findByProvider()`, `link()`, `touchLastUsed()` |
| `src/app/api/auth/google/route.ts` | OAuth flow initiation |
| `src/app/api/auth/google/callback/route.ts` | OAuth callback — session issuance after account resolution |
| `src/auth/config/env.ts` | Google OAuth configuration |
| `src/auth/services/session.service.ts` | Session creation after successful linking resolution |
| `src/auth/repositories/user.repository.ts` | User lookup and lifecycle enforcement |

---

## 1. Linking Policy

### 1.1 Auto-Linking vs Pre-Provisioned

**Assessment: Strong — Pre-Provisioned Only (FIX-C3)**

The codebase implements explicit pre-provisioned linking only. Auto-linking by verified email has been deliberately removed as a security control (FIX-C3).

**Evidence** (`oauth.service.ts:256-267`):
```typescript
// FIX-C3: explicit, pre-provisioned linking ONLY. For a fixed internal-user
// app (no public registration) we must NOT auto-link by verified email —
// that lets anyone controlling a Google identity asserting a matching
// verified email link to / authenticate as a provisioned internal user,
// bypassing password/MFA discipline (account takeover).
const oauthAccount = await this.oauthRepo.findByProvider('google', profile.sub);
if (!oauthAccount) {
  // No pre-provisioned link exists. Do NOT log in and do NOT create a row.
  throw new Error('Google sign-in is not enabled for this account. Contact an administrator.');
}
```

This is the correct security posture for an internal application with a fixed set of users. The attack prevented is:

1. Attacker creates a Google account with the same email as a target user (or uses a verified Google Workspace email).
2. Without FIX-C3, the OAuth callback would auto-create an `oauth_accounts` row mapping the attacker's Google `sub` to the target user.
3. Attacker could then authenticate as the target user via Google OAuth, bypassing password and MFA.

**Current flow**: Only accounts explicitly linked by an administrator (via the `link()` method in `OAuthAccountRepository`) are accepted. The admin must create the `oauth_accounts` record linking a specific Google `sub` to a specific internal `userId`.

### 1.2 What Happens When Local Account Exists with Same Email

**Assessment: Safe**

When a Google OAuth callback arrives:
1. The id_token is verified and the `sub` (Google's unique user ID) is extracted.
2. `oauthRepo.findByProvider('google', profile.sub)` looks up the pre-provisioned link.
3. If no link exists, the login is rejected — regardless of whether a local account with the same email exists.
4. There is no email-based lookup in the OAuth path.

This means a local account with `admin@example.com` is NOT accessible via Google OAuth unless an admin has explicitly created an `oauth_accounts` row linking that specific Google `sub` to that user's `userId`.

### 1.3 What Happens When Google Account Already Exists

**Assessment: Safe**

The `link()` method in `OAuthAccountRepository` (`oauth-account.repository.ts:23-51`) is idempotent on `(provider, providerAccountId)`:
- If a link already exists, it updates `providerEmail` and `lastUsedAt` — it does not create a duplicate or reassign to a different user.
- There is no code path that calls `link()` during login. The `touchLastUsed()` method is called instead (`oauth.service.ts:276`), which only updates the timestamp.

### 1.4 Email Verification Status Handling

**Assessment: Inconsistent — see OAUTH-003 (from OAuth audit)**

- **Web path**: `profile.email_verified` is extracted from the id_token (`oauth.service.ts:497`) but never checked during `handleCallbackInternal`. The pre-provisioned link lookup by `sub` is the only access control.
- **Mobile path**: `profile.email_verified` is explicitly checked (`oauth.service.ts:514`): `if (!profile.email_verified) throw new Error('Google email is not verified.');`

The web path's lack of `email_verified` checking is mitigated by the pre-provisioning model: the administrator has already verified the user's identity before creating the link. However, adding the check would be defense-in-depth.

---

## 2. Unlinking Security

### 2.1 Unlinking Mechanism

**Assessment: Not Implemented (by Design)**

There is no Server Action, Route Handler, or UI for unlinking a Google OAuth account. The `OAuthAccountRepository` provides only:
- `findByProvider()` — lookup
- `link()` — create/update link
- `touchLastUsed()` — update timestamp

No `unlink()`, `remove()`, or `delete()` method exists.

This is the safe default for a fixed-user internal application. Unlinking introduces several risks that are avoided entirely:
- User unlinks their only login method and locks themselves out
- CSRF attacks on the unlink action
- Session revocation timing after unlink

### 2.2 Can User Unlink Their Only Login Method?

**N/A — No unlinking mechanism exists.**

If unlinking is added in the future, the following controls must be implemented:
- Prevent unlinking if it would leave the user with zero login methods
- Require reauthentication (password or MFA) before unlinking
- Revoke all sessions after unlinking (since the OAuth identity is no longer trusted)

### 2.3 Reauthentication Required

**N/A — No unlinking mechanism exists.**

For future implementation: unlinking must require reauthentication. The user should prove they are the account owner before removing a credential.

### 2.4 Session Revocation After Unlink

**N/A — No unlinking mechanism exists.**

For future implementation: after unlinking, all active sessions for the user should be revoked, since the OAuth identity that contributed to authentication is no longer trusted. The `accountSecurityVersion` bump mechanism (`session.service.ts:213-221`) could be used to invalidate existing sessions.

---

## 3. Account Takeover Vectors

### 3.1 Can Attacker Link Google to Another User's Account?

**Mitigated — No Public Linking Endpoint**

The `OAuthAccountRepository.link()` method (`oauth-account.repository.ts:23-51`) accepts a `userId`, `provider`, `providerAccountId`, and `providerEmail`. However, this method is:
- Not exposed via any Server Action or Route Handler
- Only callable from server-side code
- Not reachable from the browser

An attacker would need to:
1. Gain server-side code execution, OR
2. Find an API endpoint that calls `link()` with attacker-controlled parameters

Neither exists in the current codebase. The only code path that interacts with `oauth_accounts` during login is `findByProvider()` (read-only) and `touchLastUsed()` (timestamp update).

**Note for future work**: When a linking UI/API is added, it must:
- Require an authenticated session
- Require password + MFA reauthentication
- Validate that the Google `sub` does not already belong to another user
- Validate that the user's email matches the Google account's email
- Use CSRF protection
- Log the action to the audit trail

### 3.2 CSRF on Linking/Unlinking

**N/A — No linking/unlinking endpoints exist.**

For future implementation:
- All linking/unlinking actions must be wrapped with `withCsrfGuard` (Server Actions) or use the HMAC-signed session cookie verification (Route Handlers).
- The existing CSRF infrastructure (`src/auth/lib/csrf.ts`) should be reused.

### 3.3 Race Conditions in Account Creation

**N/A — No account creation via OAuth.**

The OAuth flow only looks up pre-existing accounts. No user or `oauth_accounts` row is created during login.

If linking is added in the future, the `link()` method's idempotency on `(provider, providerAccountId)` (`oauth-account.repository.ts:30`) prevents duplicate creation, but a unique index on `(provider, providerAccountId)` should be added to the MongoDB collection to prevent race conditions at the database level.

### 3.4 Email Normalization Differences

**Assessment: Low Risk — see OAUTH-014**

Google provides the `email` claim in the id_token. The OAuth path does not normalize this email before storage in the `providerEmail` field (`oauth-account.repository.ts:27`). However:

- The `providerEmail` field is stored for reference/display only — it is NOT used for account lookup.
- Account lookup is by `(provider, providerAccountId)` (the Google `sub`), not by email.
- The internal user's email is managed separately in the `user_emails` collection with proper normalization (`userRepository.ts:17`: `email.trim().toLowerCase()`).

**Risk scenario**: If a future feature compares `providerEmail` with the user's internal email for display or validation, normalization differences could cause false mismatches. For example, Google might provide `Admin@Example.COM` while the internal record stores `admin@example.com`.

**Mitigation**: When displaying `providerEmail`, apply `.trim().toLowerCase()` normalization. When comparing with internal emails, always compare normalized forms.

---

## 4. Findings

### OAUTH-014: providerEmail Not Normalized on Storage

- **Finding ID**: OAUTH-014
- **Severity**: Low
- **Confidence**: Medium
- **Production blocker**: No
- **Evidence**: `src/auth/repositories/oauth-account.repository.ts:27`, `src/auth/repositories/oauth-account.repository.ts:34`
- **Attack scenario**: Google provides an email with non-standard casing (e.g., `User@Gmail.COM`). The `providerEmail` is stored as-is. A future feature that compares this with the internal email (`user@example.com`) could produce a false mismatch, potentially causing a user to see "email mismatch" warnings or be denied access.
- **Impact**: Low in the current codebase — `providerEmail` is not used for any access control decisions or comparisons. It is stored as metadata. However, it could cause confusion in a future account-security dashboard or linking UI.
- **Root cause**: `providerEmail` is stored directly from the Google profile without normalization.
- **Remediation**: Apply `providerEmail?.trim().toLowerCase()` before storage in both `link()` and in any future code path that reads `providerEmail`. Add a comment documenting that this field is normalized.
- **Acceptance criteria**: `providerEmail` is always stored in normalized (lowercase, trimmed) form. Unit tests verify normalization.
- **Regression tests**: Test `link()` with mixed-case email; verify stored value is lowercase.

---

### OAUTH-015: No Unique Index Enforcement on (provider, providerAccountId)

- **Finding ID**: OAUTH-015
- **Severity**: Medium
- **Confidence**: Medium
- **Production blocker**: Yes (for future linking features)
- **Evidence**: `src/auth/repositories/oauth-account.repository.ts:30-31`
- **Attack scenario**: Two concurrent requests call `link()` with the same `(provider, providerAccountId)` but different `userId` values. The `findOne` at line 30 returns null for both, and both `insertOne` calls succeed, creating a duplicate link. The second link would shadow the first, potentially allowing account takeover.
- **Impact**: In the current codebase, `link()` is only callable from server-side code that is not exposed to the browser, so concurrent race conditions are unlikely. However, this is a latent vulnerability that becomes exploitable when a public linking endpoint is added.
- **Root cause**: The `link()` method uses a find-then-insert pattern without a unique index guarantee. There is no database-level constraint preventing duplicate `(provider, providerAccountId)` entries.
- **Remediation**: Add a unique compound index on `{ provider: 1, providerAccountId: 1 }` in the `oauth_accounts` collection. Additionally, wrap the `link()` method in a try/catch for duplicate key errors and handle them idempotently (return the existing document).
- **Acceptance criteria**: MongoDB has a unique index on `(provider, providerAccountId)` in the `oauth_accounts` collection; concurrent `link()` calls for the same provider account produce exactly one document.
- **Regression tests**: Concurrent insertion test with the same `(provider, providerAccountId)`; verify exactly one document exists after both complete.

---

### OAUTH-016: No Database-Level Uniqueness for (userId, provider)

- **Finding ID**: OAUTH-016
- **Severity**: Low
- **Confidence**: Medium
- **Production blocker**: No
- **Evidence**: `src/auth/repositories/oauth-account.repository.ts:39-50`
- **Attack scenario**: If `link()` is called multiple times for the same `(userId, provider)` with different `providerAccountId` values (e.g., the user's Google account was re-registered and got a new `sub`), multiple `oauth_accounts` rows could exist for the same user and provider.
- **Impact**: The login path uses `findByProvider('google', profile.sub)` which looks up by `providerAccountId`, so multiple rows for the same user would not cause a login failure. However, it could lead to confusion in account management UIs and stale links that should have been updated rather than duplicated.
- **Root cause**: No unique index on `(userId, provider)` to prevent multiple Google links per user.
- **Remediation**: Consider whether the business rule is "one Google account per user" (add unique index) or "multiple Google accounts per user" (document the design). For an internal fixed-user app, one Google account per user is the expected model.
- **Acceptance criteria**: Document the intended linking policy; add appropriate unique indexes.
- **Regression tests**: Test that linking a second Google account to the same user either updates the existing link or rejects with a clear error.

---

### OAUTH-017: No Audit Trail for OAuth Account Linking Events

- **Finding ID**: OAUTH-017
- **Severity**: Low
- **Confidence**: High
- **Production blocker**: No
- **Evidence**: `src/auth/repositories/oauth-account.repository.ts:23-51`
- **Attack scenario**: An administrator links a Google account to a user, but there is no audit log entry recording this action. If a security incident occurs, there is no way to determine who linked which Google account and when.
- **Impact**: Reduced forensic capability. The `linkedAt` field (`oauth-account.repository.ts:46`) records when the link was created, but not who created it or from where.
- **Root cause**: The `link()` method does not emit audit log entries. The comment at `oauth.service.ts:278` explicitly notes that `auth.oauth.linked` events are not emitted at login time — but there is also no code path that emits them at linking time.
- **Remediation**: When the linking UI/API is added, ensure it logs an `auth.oauth.linked` audit event with the admin's userId, session, IP, and the target user. The `link()` method itself could accept an `actor` parameter for audit purposes.
- **Acceptance criteria**: Every create/update/delete of an `oauth_accounts` row is logged to the audit trail with actor identity.
- **Regression tests**: Integration test that verifies audit log entries are created for linking operations.

---

### OAUTH-018: No Mechanism to Revoke Google OAuth Refresh Tokens

- **Finding ID**: OAUTH-018
- **Severity**: Low
- **Confidence**: Medium
- **Production blocker**: No
- **Evidence**: `src/auth/services/oauth.service.ts` (no Google token revocation call)
- **Attack scenario**: A user's Google account is compromised. The application has no mechanism to revoke Google's refresh tokens (if any were obtained). The attacker could continue to use the compromised Google account to authenticate.
- **Impact**: Low — the application does not store or use Google refresh tokens (it only uses the id_token from the authorization code exchange). If the Google account is compromised, the attacker would need to authenticate through Google's own flow, which the user (or admin) can revoke via Google Account settings. However, the application should document that Google-side revocation must be done separately.
- **Root cause**: The OAuth flow only exchanges the authorization code for an id_token; no refresh token is requested or stored.
- **Remediation**: Document that Google account revocation must be done via Google Account settings. If Google refresh tokens are ever requested in the future, implement token revocation via Google's revocation endpoint.
- **Acceptance criteria**: Documentation covers Google-side account revocation; no Google refresh tokens are stored by the application.

---

### OAUTH-019: No check That Pre-Provisioned Link Points to Active User

- **Finding ID**: OAUTH-019
- **Severity**: Informational
- **Confidence**: High
- **Production blocker**: No
- **Evidence**: `src/auth/services/oauth.service.ts:268-274`
- **Attack scenario**: An admin provisions a Google link for a user, then later deactivates or deletes the user. The `oauth_accounts` row still exists. A subsequent Google login attempt would:
1. Find the pre-provisioned link (succeeds).
2. Look up the user by `userId` (succeeds if not soft-deleted, but status check at line 273 catches it).
3. Reject with "This account is not active" (correct behavior).
- **Impact**: None — the code correctly checks `user.status !== 'active'` at line 273. This finding documents that the check exists and is working as intended.
- **Root cause**: N/A — this is a positive control.
- **Remediation**: N/A — the existing check is correct. Consider adding a cleanup job that removes `oauth_accounts` rows for deleted/inactive users.
- **Acceptance criteria**: Login is rejected when the linked user is inactive; audit log records the rejection.

---

### OAUTH-020: link() Method Does Not Validate User Existence

- **Finding ID**: OAUTH-020
- **Severity**: Low
- **Confidence**: Medium
- **Production blocker**: No
- **Evidence**: `src/auth/repositories/oauth-account.repository.ts:23-51`
- **Attack scenario**: An admin (or future API) calls `link()` with a `userId` that does not exist in the `users` collection. The `oauth_accounts` row is created, but login would fail at `oauth.service.ts:271` because `userRepo.findById(userId)` returns null.
- **Impact**: An orphaned `oauth_accounts` row is created. The user cannot log in via Google (correctly rejected), but the orphaned row is a data integrity issue.
- **Root cause**: `link()` inserts directly without verifying that the target `userId` exists.
- **Remediation**: Add a pre-check in `link()`: `const user = await userRepo.findById(userId); if (!user) throw ...`. Alternatively, rely on the foreign key relationship enforced by the login-time check and accept orphaned rows as a data quality issue.
- **Acceptance criteria**: `link()` either validates user existence or documents that it does not.
- **Regression tests**: Test `link()` with a non-existent `userId`; verify behavior (error or orphaned row).

---

## 5. Summary

| ID | Finding | Severity | Production Blocker |
|---|---|---|---|
| OAUTH-014 | providerEmail not normalized on storage | Low | No |
| OAUTH-015 | No unique index on (provider, providerAccountId) | Medium | Yes (future) |
| OAUTH-016 | No uniqueness for (userId, provider) | Low | No |
| OAUTH-017 | No audit trail for linking events | Low | No |
| OAUTH-018 | No mechanism to revoke Google OAuth tokens | Low | No |
| OAUTH-019 | Pre-provisioned link to active user check (positive) | Informational | No |
| OAUTH-020 | link() does not validate user existence | Low | No |

---

## 6. Production Readiness Assessment

**Account linking is production-ready for the current pre-provisioned-only model.**

The security posture is strong:
- **No auto-linking** — prevents account takeover via email matching (FIX-C3).
- **No public linking/unlinking endpoints** — eliminates CSRF, race condition, and authorization bypass vectors entirely.
- **Pre-provisioned links only** — administrators control which Google accounts can authenticate as which users.
- **Login-time user status check** — deactivated/suspended users cannot log in even with a valid pre-provisioned link.
- **Idempotent link creation** — prevents duplicate links for the same Google account.

**Caveats for future work**:
- OAUTH-015 (unique index) becomes a production blocker when a public linking API is added.
- When linking/unlinking UI is introduced, it must require MFA reauthentication, CSRF protection, email validation, and audit logging.
- The `providerEmail` normalization (OAUTH-014) should be addressed before any UI displays this field.
