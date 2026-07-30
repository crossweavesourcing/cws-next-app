# Google OAuth Audit

## Overview

This document details the security audit of the Google OAuth/OpenID Connect implementation in the CWS Next App, covering PKCE, state parameter, nonce, redirect URI validation, JWKS-based id_token verification, account linking, and rate limiting.

## Components Audited

| Component | File(s) |
|---|---|
| OAuth service | `src/auth/services/oauth.service.ts` |
| OAuth start route | `src/app/api/auth/google/route.ts` |
| OAuth callback route | `src/app/api/auth/google/callback/route.ts` |
| Environment config | `src/auth/config/env.ts` |
| Risk evaluation | `src/auth/risk/evaluate-login-risk.ts` |
| Alerting | `src/auth/services/alerting.service.ts` |

---

## PKCE Implementation

### Implementation

```typescript
// src/auth/services/oauth.service.ts:140-173
buildAuthorizationUrl(): OAuthStartResult {
  const state = crypto.randomBytes(32).toString('hex');
  const codeVerifier = crypto.randomBytes(48).toString('hex');
  const nonce = crypto.randomBytes(24).toString('hex');

  const codeChallenge = crypto
    .createHash('sha256')
    .update(codeVerifier)
    .digest('base64url');

  const params = new URLSearchParams({
    // ...
    code_challenge: codeChallenge,
    code_challenge_method: 'S256',
    // ...
  });
}
```

### Analysis

| Aspect | Assessment | Evidence |
|---|---|---|
| Code verifier length | 48 bytes (384 bits) — exceeds RFC 7636 minimum of 32 bytes | `oauth.service.ts:147` |
| Challenge method | S256 (SHA-256) — correct (plain is not used) | `oauth.service.ts:150-153` |
| Challenge generation | `SHA-256(codeVerifier)` → base64url — correct per RFC 7636 | `oauth.service.ts:150-153` |
| Storage | Code verifier stored in signed cookie (`cws_oauth_state`) | `route.ts:28-34` |
| Verification | Sent to Google token endpoint in exchange | `oauth.service.ts:373` |

### Findings

#### OAUTH-001: PKCE Correctly Implemented

| Field | Value |
|---|---|
| Finding ID | OAUTH-001 |
| Severity | Informational |
| Location | `src/auth/services/oauth.service.ts:140-173` |
| Evidence | S256 challenge method, 48-byte verifier, stored in signed cookie |
| Description | PKCE is correctly implemented with S256 challenge method. The code verifier is 48 bytes (exceeding the RFC 7636 minimum of 32 bytes), and the challenge is computed as SHA-256 of the verifier. The verifier is stored in a signed, HttpOnly cookie for the callback round-trip. |
| Impact | None — correctly implemented |
| Existing Control | S256 challenge, 48-byte verifier, signed cookie storage |
| Remediation | None |
| Recommendation Priority | Informational |

---

## State Parameter (CSRF Protection)

### Implementation

```typescript
// src/auth/services/oauth.service.ts:146
const state = crypto.randomBytes(32).toString('hex');

// src/auth/services/oauth.service.ts:248
if (!state || !expectedState || state !== expectedState) {
  throw new Error('OAuth state mismatch (possible CSRF).');
}

// src/app/api/auth/google/route.ts:28-34
cookieStore.set(OAUTH_STATE_COOKIE, JSON.stringify(start), {
  httpOnly: true,
  secure: isSecureCookies(),
  sameSite: 'lax',
  path: '/',
  maxAge: 10 * 60,
});
```

### Analysis

| Aspect | Assessment | Evidence |
|---|---|---|
| Entropy | 32 bytes (256 bits) — adequate | `oauth.service.ts:146` |
| Storage | HttpOnly, signed cookie (JSON of state + codeVerifier + nonce) | `route.ts:28-34` |
| Verification | Direct comparison (`state !== expectedState`) | `oauth.service.ts:248` |
| Lifetime | 10 minutes | `route.ts:33` |
| One-time use | Cookie cleared on callback (success or failure) | `callback/route.ts:44-51` |

### Findings

#### OAUTH-002: State Comparison Uses Non-Timing-Safe Comparison

| Field | Value |
|---|---|
| Finding ID | OAUTH-002 |
| Severity | Low |
| Location | `src/auth/services/oauth.service.ts:248` |
| Evidence | `state !== expectedState` — standard JavaScript inequality check |
| Description | The OAuth state comparison uses JavaScript's `!==` operator instead of a timing-safe comparison function like `crypto.timingSafeEqual()`. In theory, this could leak information about the state value through timing side-channels (each matching character adds a small delay before the first mismatch is detected). However, the practical risk is extremely low because: (1) the state is 256 bits of randomness (64 hex chars), making brute-force infeasible; (2) the comparison happens server-side with no network round-trip per character; (3) JavaScript string comparison is not constant-time but the timing variance across 64-character hex strings is measured in nanoseconds, well below network jitter. |
| Attack Scenario | An attacker measures the precise response time of the OAuth callback to determine how many leading characters of the state match their guess. For a 256-bit random value, this would still require 2^255 attempts on average. |
| Impact | Low — 256-bit entropy makes the attack infeasible regardless of timing leakage |
| Existing Control | 256-bit entropy; HttpOnly cookie; 10-minute expiry |
| Remediation | Replace `state !== expectedState` with `crypto.timingSafeEqual(Buffer.from(state), Buffer.from(expectedState))` for defense-in-depth. This is a simple change that eliminates the theoretical timing channel and is consistent with other comparisons in the codebase (`token.ts:53`). |
| Recommendation Priority | Low — defense-in-depth improvement |

#### OAUTH-003: OAuth State Cookie SameSite='lax' (Inconsistency)

| Field | Value |
|---|---|
| Finding ID | OAUTH-003 |
| Severity | Low |
| Location | `src/app/api/auth/google/route.ts:31` |
| Evidence | `sameSite: 'lax'` on `cws_oauth_state` cookie; `sameSite: 'lax'` on `cws_refresh` in callback route |
| Description | The `cws_oauth_state` cookie is set with `SameSite: 'lax'`. This is **correct** for the OAuth flow because: (1) the cookie must survive the cross-origin redirect to Google and back (Strict cookies would not be sent on the top-level navigation back from Google); (2) the state cookie contains the PKCE verifier and nonce, which are needed at the callback. However, this creates an inconsistency with the `cws_refresh` cookie, which is set to `SameSite: 'strict'` in the refresh route but `SameSite: 'lax'` in the OAuth callback route. |
| Attack Scenario | An attacker crafts a cross-site form POST that triggers the OAuth callback. The `lax` state cookie would be sent, but the state parameter in the URL would still need to match, providing CSRF protection. |
| Impact | Low — the state parameter provides CSRF protection regardless of SameSite; Lax is required for the OAuth redirect flow |
| Existing Control | State parameter verification; HttpOnly cookie; 10-minute expiry |
| Remediation | No change needed for the OAuth state cookie — Lax is correct. However, fix the refresh cookie inconsistency in the callback route: change `sameSite: 'lax'` to `sameSite: 'strict'` on line 152-157 of `callback/route.ts` to match the refresh route. See OAUTH-004. |
| Recommendation Priority | Low |

#### OAUTH-004: Refresh Cookie SameSite Inconsistency in Callback Route

| Field | Value |
|---|---|
| Finding ID | OAUTH-004 |
| Severity | Medium |
| Location | `src/app/api/auth/google/callback/route.ts:151-157` |
| Evidence | `sameSite: 'lax'` on REFRESH_COOKIE in callback route vs `sameSite: 'strict'` in refresh route (`src/app/api/auth/refresh/route.ts:114`) |
| Description | The refresh cookie (`cws_refresh`) is set with `SameSite: 'lax'` in the OAuth callback route, but `SameSite: 'strict'` in the refresh route and in `setAuthCookies()` (the shared cookie-setting function). This inconsistency means that after an OAuth login, the refresh cookie is more permissive than after a password login. With `SameSite: 'lax'`, the refresh cookie would be sent on cross-site top-level form POSTs, which is the exact CSRF hole that `SameSite: 'strict'` is designed to prevent. The refresh token is a high-value credential that grants the ability to mint new session tokens. |
| Attack Scenario | After an OAuth login, an attacker crafts a cross-site form POST to `/api/auth/refresh`. With `SameSite: 'lax'`, the browser sends the refresh cookie, allowing the attacker to rotate the token and potentially hijack the session. However, the refresh endpoint also requires `assertSameOriginStrict()` (CSRF origin check), which provides a second layer of defense. |
| Impact | Medium — the SameSite lax setting is inconsistent with the security policy; the CSRF origin check mitigates but the defense-in-depth layer is weakened |
| Existing Control | `assertSameOriginStrict()` on refresh endpoint; refresh token is opaque + server-verified |
| Remediation | Change `sameSite: 'lax'` to `sameSite: 'strict'` on line 152 of `src/app/api/auth/google/callback/route.ts`. The refresh token is only consumed by same-site XHR/fetch POSTs, so Strict is the correct policy. |
| Recommendation Priority | Medium |

---

## Nonce Replay Protection

### Implementation

```typescript
// src/auth/services/oauth.service.ts:148
const nonce = crypto.randomBytes(24).toString('hex');

// src/auth/services/oauth.service.ts:492-494
if (expectedNonce !== null && claims.nonce !== expectedNonce) {
  throw new Error('id_token nonce mismatch (replay protection).');
}
```

### Analysis

| Aspect | Assessment | Evidence |
|---|---|---|
| Entropy | 24 bytes (192 bits) — adequate | `oauth.service.ts:148` |
| Verification | Direct comparison in `verifyIdToken()` | `oauth.service.ts:492-494` |
| Storage | In signed cookie alongside state + codeVerifier | `route.ts:28-34` |

### Findings

#### OAUTH-005: Nonce Correctly Implemented

| Field | Value |
|---|---|
| Finding ID | OAUTH-005 |
| Severity | Informational |
| Location | `src/auth/services/oauth.service.ts:148, 492-494` |
| Evidence | 24-byte random nonce; verified against id_token claims |
| Description | The nonce is correctly generated, stored in the signed cookie, and verified against the `nonce` claim in the Google-issued id_token. This prevents replay attacks where an attacker captures an id_token and attempts to use it in a different OAuth flow. |
| Impact | None — correctly implemented |
| Existing Control | Nonce verification in `verifyIdToken()` |
| Remediation | None |
| Recommendation Priority | Informational |

---

## Redirect URI Validation

### Implementation

The redirect URI is configured via `GOOGLE_REDIRECT_URI` environment variable and passed to both the authorization URL and the token exchange.

### Analysis

| Aspect | Assessment | Evidence |
|---|---|---|
| Configuration | `GOOGLE_REDIRECT_URI` env var (validated as URL) | `env.ts:37` |
| Used in auth URL | Yes — `redirect_uri` param | `oauth.service.ts:160` |
| Used in token exchange | Yes — `redirect_uri` body param | `oauth.service.ts:378` |
| HTTPS enforcement | Required by Google for redirect URIs | Google's OAuth implementation |

### Findings

#### OAUTH-006: Redirect URI Correctly Configured

| Field | Value |
|---|---|
| Finding ID | OAUTH-006 |
| Severity | Informational |
| Location | `src/auth/config/env.ts:37`, `src/auth/services/oauth.service.ts:160, 378` |
| Evidence | `GOOGLE_REDIRECT_URI: z.string().url().optional()` |
| Description | The redirect URI is configured via environment variable and validated as a URL. It is used consistently in both the authorization request and token exchange, preventing authorization code injection via redirect URI manipulation. Google enforces that the redirect URI must be pre-registered in the Google Cloud Console. |
| Impact | None — correctly implemented |
| Existing Control | Environment variable configuration; Google-side validation |
| Remediation | None |
| Recommendation Priority | Informational |

---

## JWKS-Based id_token Verification

### Implementation

```typescript
// src/auth/services/oauth.service.ts:428-504
private async verifyIdToken(idToken, env, expectedNonce, allowedAudiences) {
  // 1. Parse header, check alg === 'RS256'
  // 2. Fetch JWKS (cached, with kid-based refresh)
  // 3. Import public key from JWK
  // 4. Verify signature: crypto.verify('RSA-SHA256', data, key, signature)
  // 5. Verify claims: iss, aud, exp, iat, nonce, sub
}
```

### Analysis

| Aspect | Assessment | Evidence |
|---|---|---|
| Algorithm check | `RS256` — correct | `oauth.service.ts:444` |
| JWKS caching | In-memory, respects `Cache-Control: max-age` | `oauth.service.ts:33-106` |
| Cache miss handling | Re-fetch on `kid` mismatch (key rotation) | `oauth.service.ts:454-456` |
| Signature verification | `crypto.verify('RSA-SHA256', ...)` — Node.js built-in | `oauth.service.ts:470` |
| Issuer validation | `https://accounts.google.com` or `accounts.google.com` | `oauth.service.ts:480` |
| Audience validation | Must match `GOOGLE_CLIENT_ID` | `oauth.service.ts:483` |
| Expiry validation | `exp + 60s tolerance >= now` | `oauth.service.ts:486` |
| Issued-at validation | `iat - 60s tolerance <= now` | `oauth.service.ts:489` |
| Nonce validation | Verified against expected nonce | `oauth.service.ts:492` |
| Sub validation | Non-empty string | `oauth.service.ts:495` |

### Findings

#### OAUTH-007: JWKS Cache Resilience

| Field | Value |
|---|---|
| Finding ID | OAUTH-007 |
| Severity | Informational |
| Location | `src/auth/services/oauth.service.ts:53-106` |
| Evidence | `jwksCache` with `expiresAt`; re-fetch on kid miss; fail on network error |
| Description | The JWKS cache is designed for serverless resilience: it is per-instance (in-memory), non-authoritative, and always re-fetches on a `kid` miss (indicating key rotation). On network errors, it throws `OAuthProviderUnavailableError` rather than accepting a token without verification. This fail-closed design ensures that a Google outage does not result in accepting unverified tokens. |
| Attack Scenario | Google rotates signing keys; the cached JWKS does not contain the new `kid`. |
| Impact | None — re-fetch ensures fresh keys are always used |
| Existing Control | Kid-based cache invalidation; fail-closed on network error |
| Remediation | None |
| Recommendation Priority | Informational |

#### OAUTH-008: Clock Tolerance of 60 Seconds

| Field | Value |
|---|---|
| Finding ID | OAUTH-008 |
| Severity | Informational |
| Location | `src/auth/services/oauth.service.ts:478` |
| Evidence | `const clockTolerance = 60;` |
| Description | A 60-second clock tolerance is applied to `exp` and `iat` claims. This accommodates minor clock skew between the server and Google's token endpoint. The tolerance is symmetric (applied to both past and future) and is within the commonly recommended range (30-120 seconds). |
| Attack Scenario | An attacker submits an id_token that expired 59 seconds ago; it would still be accepted. |
| Impact | Informational — 60-second window is standard practice |
| Existing Control | Symmetric tolerance on both exp and iat |
| Remediation | None |
| Recommendation Priority | Informational |

#### OAUTH-009: No JWKS Fetch Timeout Configuration

| Field | Value |
|---|---|
| Finding ID | OAUTH-009 |
| Severity | Low |
| Location | `src/auth/services/oauth.service.ts:56` |
| Evidence | `res = await fetch(GOOGLE_JWKS_URL, { method: 'GET' })` — no timeout/abort |
| Description | The JWKS fetch does not configure a timeout or abort controller. If Google's JWKS endpoint is slow or unresponsive, the fetch could block for an extended period. In a serverless environment, this could consume the function's execution time limit. The geo-IP lookup (`geoip.ts:70-71`) correctly uses `AbortController` with a 300ms timeout, but the JWKS fetch does not. |
| Attack Scenario | Google's JWKS endpoint is slow; the OAuth callback blocks until the function times out. |
| Impact | Low — Google's JWKS endpoint is highly available; the impact is availability degradation, not security bypass |
| Existing Control | Fail-closed design (throws on any fetch error) |
| Remediation | Add a timeout to the JWKS fetch (e.g., 5-10 seconds) using `AbortController`, similar to the geo-IP lookup pattern. |
| Recommendation Priority | Low |

---

## Pre-Provisioned Linking (No Auto-Link)

### Implementation

```typescript
// src/auth/services/oauth.service.ts:263-267
const oauthAccount = await this.oauthRepo.findByProvider('google', profile.sub);
if (!oauthAccount) {
  throw new Error('Google sign-in is not enabled for this account. Contact an administrator.');
}
const userId = oauthAccount.userId;
```

### Analysis

| Aspect | Assessment | Evidence |
|---|---|---|
| Auto-link disabled | Yes — only pre-provisioned links accepted | `oauth.service.ts:263-267` |
| Lookup by provider + sub | `findByProvider('google', profile.sub)` | `oauth.service.ts:263` |
| No email-based linking | Correct — email match does not create links | FIX-C3 comment at `oauth.service.ts:257-262` |
| Explicit link flow | Not yet implemented (future workstream) | `oauth.service.ts:278-281` |

### Findings

#### OAUTH-010: Pre-Provisioned Linking Correctly Enforced

| Field | Value |
|---|---|
| Finding ID | OAUTH-010 |
| Severity | Informational |
| Location | `src/auth/services/oauth.service.ts:263-267` |
| Evidence | FIX-C3 comment and implementation |
| Description | The OAuth implementation correctly requires a pre-provisioned `oauth_accounts` row before accepting a Google login. There is no auto-linking by verified email, which prevents account takeover via a malicious Google account that asserts a matching verified email. This is documented as FIX-C3 with clear rationale. |
| Attack Scenario | Attacker creates a Google account with a verified email matching a provisioned admin user. |
| Impact | None — pre-provisioned linking prevents this attack |
| Existing Control | `findByProvider('google', sub)` — requires existing row |
| Remediation | None |
| Recommendation Priority | Informational |

---

## Rate Limiting

### Implementation

```typescript
// src/app/api/auth/google/callback/route.ts:15-16
const OAUTH_PER_IP_MAX = 20;
const OAUTH_PER_IP_WINDOW_MS = 15 * 60 * 1000;
```

### Analysis

| Aspect | Assessment | Evidence |
|---|---|---|
| Per-IP limit | 20 attempts / 15 minutes | `callback/route.ts:15` |
| Storage | MongoDB-backed (coherent across serverless instances) | `callback/route.ts:77-81` |
| Applied before exchange | Yes — checked before `handleCallback()` | `callback/route.ts:82-85` |
| Attempt recorded | Yes — both success and failure counted | `callback/route.ts:87-100` |

### Findings

#### OAUTH-011: Rate Limiting Correctly Implemented

| Field | Value |
|---|---|
| Finding ID | OAUTH-011 |
| Severity | Informational |
| Location | `src/app/api/auth/google/callback/route.ts:15-100` |
| Evidence | Per-IP limit, MongoDB-backed, recorded before exchange |
| Description | The OAuth callback has per-IP rate limiting (20 attempts/15min) that is MongoDB-backed for coherence across serverless instances. The counter is incremented before the token exchange, so even failed attempts count against the limit. On exceed, the callback redirects to login with a generic error. |
| Impact | None — correctly implemented |
| Existing Control | MongoDB-backed per-IP rate limiting |
| Remediation | None |
| Recommendation Priority | Informational |

---

## Error Handling

### Implementation

```typescript
// src/app/api/auth/google/callback/route.ts:160-186
} catch (err) {
  console.error('Google OAuth callback failed:', err);
  await new AuditLogRepository().log({...});
  await new AlertingService().recordFailure({...});
  clearState();
  return NextResponse.redirect(`${env.APP_URL}/dashboard/login/?error=oauth_failed`);
}
```

### Analysis

| Aspect | Assessment | Evidence |
|---|---|---|
| Generic redirect | Yes — always redirects to `/dashboard/login/?error=oauth_failed` | `callback/route.ts:185` |
| State cookie cleared | Yes — `clearState()` called on all error paths | `callback/route.ts:44-51, 184` |
| Audit logging | Yes — `auth.login.failure` with `AUTH_OAUTH_FAILED` | `callback/route.ts:162-176` |
| Alert forwarding | Yes — `alertingService.recordFailure()` | `callback/route.ts:178-183` |
| Error details logged | Yes — `console.error()` with full error message | `callback/route.ts:161` |

### Findings

#### OAUTH-012: Error Handling Correctly Implemented

| Field | Value |
|---|---|
| Finding ID | OAUTH-012 |
| Severity | Informational |
| Location | `src/app/api/auth/google/callback/route.ts:160-186` |
| Evidence | Generic redirect, audit logging, alert forwarding |
| Description | OAuth errors are handled with a generic redirect to the login page. Detailed error information is logged server-side for debugging but never exposed to the client. The state cookie is cleared on all paths (success and failure). |
| Impact | None — correctly implemented |
| Existing Control | Generic error responses; server-side logging |
| Remediation | None |
| Recommendation Priority | Informational |

---

## Security Event Alerting

### Implementation

```typescript
// src/auth/services/alerting.service.ts:168-183
async alertOauthFailed(params: {
  provider: string;
  userId: ObjectId | null;
  ipAddress: string | null;
  reason: string;
}): Promise<void> {
  this.emit({
    action: 'auth.oauth.failed',
    severity: 'warning',
    // ...
  });
}
```

### Findings

#### OAUTH-013: OAuth Failure Alerting Correctly Implemented

| Field | Value |
|---|---|
| Finding ID | OAUTH-013 |
| Severity | Informational |
| Location | `src/auth/services/alerting.service.ts:168-183` |
| Evidence | `alertOauthFailed()` emits to security sink |
| Description | OAuth failures are forwarded to the security alerting sink as `auth.oauth.failed` events with severity `warning`. This ensures OAuth abuse patterns are surfaced to monitoring systems. |
| Impact | None — correctly implemented |
| Existing Control | Security sink event emission |
| Remediation | None |
| Recommendation Priority | Informational |

---

## Summary

| Finding ID | Severity | Summary | Recommendation |
|---|---|---|---|
| OAUTH-001 | Info | PKCE correctly implemented (S256, 48-byte verifier) | None |
| OAUTH-002 | Low | State comparison uses `!==` not timing-safe | Replace with `timingSafeEqual()` |
| OAUTH-003 | Info | OAuth state cookie SameSite='lax' is correct for OAuth flow | None (Lax required) |
| OAUTH-004 | **Medium** | Refresh cookie SameSite='lax' in callback vs 'strict' elsewhere | Change to `'strict'` |
| OAUTH-005 | Info | Nonce correctly implemented | None |
| OAUTH-006 | Info | Redirect URI correctly configured | None |
| OAUTH-007 | Info | JWKS cache resilience correct | None |
| OAUTH-008 | Info | 60-second clock tolerance acceptable | None |
| OAUTH-009 | Low | No timeout on JWKS fetch | Add AbortController timeout |
| OAUTH-010 | Info | Pre-provisioned linking enforced (FIX-C3) | None |
| OAUTH-011 | Info | Rate limiting correctly implemented | None |
| OAUTH-012 | Info | Error handling correctly implemented | None |
| OAUTH-013 | Info | OAuth failure alerting correctly implemented | None |

## Key Finding: OAUTH-004 (Refresh Cookie SameSite Inconsistency)

### Detailed Analysis

The `cws_refresh` cookie is the most sensitive credential in the OAuth flow — it grants the ability to mint new session tokens via the `/api/auth/refresh` endpoint. The security policy established in `src/auth/lib/cookies.ts:30-43` explicitly states:

> High-value tokens (`cws_refresh`, pending 2FA/step-up/pw cookies, device token) are **Strict**: they are only ever read on same-site XHR/fetch or same-site Server Action POSTs, so Strict blocks a browser from *sending* them on a cross-site top-level form POST (the Lax CSRF hole).

However, in `src/app/api/auth/google/callback/route.ts:151-157`:

```typescript
cookieStore.set(REFRESH_COOKIE, result.refreshToken, {
  httpOnly: true,
  secure,
  sameSite: 'lax',  // ← should be 'strict'
  path: '/api/auth/refresh',
  maxAge: Math.floor(env.REFRESH_TOKEN_TTL_MS / 1000),
});
```

This is inconsistent with:
- `src/app/api/auth/refresh/route.ts:114` — `sameSite: 'strict'`
- `src/auth/lib/cookies.ts:98` — `strictCookieOpts()` used for refresh

The `assertSameOriginStrict()` guard on the refresh endpoint provides a second layer of CSRF protection, but the SameSite cookie policy is the first line of defense and should be consistent.

### Remediation

Change line 152 of `src/app/api/auth/google/callback/route.ts` from `sameSite: 'lax'` to `sameSite: 'strict'`.
