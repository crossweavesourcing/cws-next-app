# Google OAuth / OpenID Connect Security Audit

> Audit Date: 2026-07-27 | Commit: `32af9be` | Branch: `main`

---

## Scope

This report covers the Google OAuth 2.0 Authorization Code Flow with PKCE as implemented across:

| File | Role |
|---|---|
| `src/auth/services/oauth.service.ts` | Core OAuth logic: authorization URL build, code exchange, id_token verification, session issuance |
| `src/app/api/auth/google/route.ts` | `GET /api/auth/google` — flow initiation, state cookie mint |
| `src/app/api/auth/google/callback/route.ts` | `GET /api/auth/google/callback` — callback handler, rate limiting, cookie lifecycle |
| `src/auth/config/env.ts` | `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REDIRECT_URI` schema + boot guards |
| `src/auth/repositories/oauth-account.repository.ts` | Provider account linking and lookup |
| `src/auth/services/session.service.ts` | Session + refresh token issuance after OAuth |

---

## 1. OAuth Flow Security

### 1.1 Authorization Code Flow

**Assessment: Strong**

The implementation follows the OAuth 2.0 Authorization Code flow correctly:

1. Client builds authorization URL and redirects to Google (`oauth.service.ts:155-168`).
2. Google redirects back with `code` and `state`.
3. Callback handler exchanges `code` for tokens at `https://oauth2.googleapis.com/token` (`oauth.service.ts:368-416`).
4. `id_token` from the token response is verified and used for user identity.
5. A local session + refresh token are issued.

### 1.2 PKCE (S256)

**Assessment: Strong**

- **Code verifier**: 48 random bytes via `crypto.randomBytes(48)` (`oauth.service.ts:147`).
- **Code challenge**: SHA-256 hash of the verifier, base64url-encoded (`oauth.service.ts:150-153`).
- **Method**: `code_challenge_method: 'S256'` (`oauth.service.ts:163`).
- **Verification**: `code_verifier` is sent in the token exchange body (`oauth.service.ts:375`).
- **Storage**: Verifier is persisted in the `cws_oauth_state` httpOnly cookie alongside state and nonce.

This prevents authorization code interception attacks even if the authorization code is captured.

### 1.3 State Parameter

**Assessment: Strong**

- **Generation**: 32 random bytes via `crypto.randomBytes(32)` (`oauth.service.ts:146`).
- **Storage**: Serialized as JSON inside the `cws_oauth_state` cookie (`route.ts:28`).
- **Cookie properties**: `httpOnly`, `secure` (production), `sameSite: 'lax'`, `path: '/'`, `maxAge: 600` (10 min) (`route.ts:29-34`).
- **Validation**: Constant-time equality check — `state !== expectedState` (`oauth.service.ts:248`).
- **Single-use**: Cookie is cleared on all outcomes (success and failure) (`callback/route.ts:44-51`, `114`, `184`).

**Note**: The state comparison uses standard string equality (`!==`), not a constant-time comparison. For a 32-byte random hex string the practical risk is negligible, but a `crypto.timingSafeEqual` comparison would be defense-in-depth.

### 1.4 Nonce

**Assessment: Strong**

- **Generation**: 24 random bytes via `crypto.randomBytes(24)` (`oauth.service.ts:148`).
- **Storage**: Stored in the same `cws_oauth_state` cookie as state and code verifier.
- **Validation**: Checked against the `nonce` claim in the verified id_token payload (`oauth.service.ts:487-489`).
- **Replay protection**: Combined with the one-time state cookie, each nonce can only be used once per login attempt.

### 1.5 Redirect URI Validation

**Assessment: Strong**

- **Source**: `GOOGLE_REDIRECT_URI` from validated env schema (`env.ts:36`).
- **Schema**: `z.string().url()` — must be a valid URL.
- **Usage**: Passed both in the authorization URL and the token exchange body (`oauth.service.ts:157`, `378`).
- **Not user-controlled**: The redirect URI comes from server configuration, not from request parameters, preventing open redirect attacks.

**Note**: `GOOGLE_REDIRECT_URI` is `optional()` in the env schema. If unset, the flow will fail at runtime in `buildAuthorizationUrl()` (`oauth.service.ts:142`). This is acceptable since Google OAuth is itself optional, but `validateSecurityConfig` does not enforce it even when `GOOGLE_CLIENT_ID` is set — only `GOOGLE_CLIENT_SECRET` is conditionally required (`env.ts:161`).

### 1.6 HTTPS Enforcement

**Assessment: Strong**

- `SECURE_COOKIES` must be `'true'` in production or the app refuses to boot (`env.ts:273-280`).
- All OAuth cookies (`cws_oauth_state`, `cws_session`, `cws_refresh`, `cws_2fa_pending`, `cws_pw_pending`) use `secure: isSecureCookies()`.
- Google endpoints used are all HTTPS: `accounts.google.com`, `oauth2.googleapis.com`, `www.googleapis.com`.

---

## 2. Token Verification

### 2.1 ID Token Signature Verification

**Assessment: Strong**

- Manual JWT parsing and RSA-SHA256 verification (`oauth.service.ts:434-473`).
- Algorithm restricted to `RS256` only (`oauth.service.ts:444`) — prevents algorithm confusion attacks.
- Public key reconstructed from JWKS `{ n, e }` values (`oauth.service.ts:463-466`).
- Signature verified with `crypto.verify('RSA-SHA256', ...)` (`oauth.service.ts:470`).

### 2.2 Issuer Validation

**Assessment: Strong**

- Accepts both `https://accounts.google.com` and `accounts.google.com` (`oauth.service.ts:478`).
- Both are valid Google OIDC issuers.

### 2.3 Audience Validation

**Assessment: Strong**

- `allowedAudiences` defaults to `[GOOGLE_CLIENT_ID]` (`oauth.service.ts:432`).
- Checked as `allowedAudiences.includes(claims.aud)` (`oauth.service.ts:481`).
- Mobile path uses `MOBILE_GOOGLE_CLIENT_IDS` which can contain multiple client IDs (`oauth.service.ts:513`).

### 2.4 Expiry Checking

**Assessment: Adequate — see OAUTH-001**

- `claims.exp < now` (`oauth.service.ts:484`).
- Tokens without `exp` or with non-numeric `exp` are rejected.

### 2.5 Clock Skew Handling

**Assessment: Gap — see Finding OAUTH-001**

### 2.6 JWKS Caching

**Assessment: Strong**

- Local in-memory cache with TTL from `Cache-Control: max-age` header (`oauth.service.ts:38-106`).
- Default fallback: 1 hour when header is absent (`oauth.service.ts:41`).
- Cache is explicitly non-authoritative — cold starts refetch (`oauth.service.ts:21-32`).
- On `kid` miss (key rotation), forces a fresh fetch before rejecting (`oauth.service.ts:453-456`).
- Network/HTTP failures throw `OAuthProviderUnavailableError` — never accepts without verification (`oauth.service.ts:57-65`).
- Empty keys array is rejected (`oauth.service.ts:77-79`).

---

## 3. Attack Vector Analysis

### 3.1 Login CSRF

**Mitigated.** The `state` parameter binds the OAuth request to the user's browser session via the `cws_oauth_state` cookie. An attacker cannot complete the OAuth flow for a victim without knowledge of the state value stored in the victim's httpOnly cookie.

### 3.2 OAuth Callback Replay

**Mitigated.** The state cookie is single-use: cleared on all outcomes (`callback/route.ts:44-51`). A replayed callback with the same `code` will fail the state comparison because the cookie is already deleted.

### 3.3 State Bypass

**Mitigated.** State is required (`oauth.service.ts:248`): `!state || !expectedState || state !== expectedState` throws before any token exchange.

### 3.4 Nonce Bypass

**Mitigated.** Nonce is embedded in the id_token at Google's authorization endpoint and verified against the stored nonce after signature verification (`oauth.service.ts:487-489`). An attacker cannot forge a valid nonce in the id_token without compromising Google's signing key.

### 3.5 Token Substitution

**Mitigated.** The audience claim is validated against `GOOGLE_CLIENT_ID` (`oauth.service.ts:481`). A token issued for a different OAuth client will be rejected.

### 3.6 Mix-Up Attacks

**Not applicable.** The implementation supports only a single OAuth provider (Google). Mix-up attacks require multiple concurrent IdPs.

### 3.7 Open Redirect via Callback URL

**Mitigated.** The redirect URI is sourced from server configuration (`GOOGLE_REDIRECT_URI` env var), not from any user-supplied parameter. The authorization URL is built server-side and the redirect after callback goes to `APP_URL` (`callback/route.ts:55`, `59`, `185`).

### 3.8 Authorization Code Injection

**Mitigated.** PKCE binds the authorization code to the client that initiated the flow. Even if an attacker injects a code into a victim's callback, the token exchange will fail because the attacker does not possess the code verifier stored in the victim's state cookie.

### 3.9 Token Confusion / JWT Injection

**Mitigated.** The issuer is validated against Google's known issuers (`oauth.service.ts:478`). An attacker cannot use a JWT from a different issuer.

---

## 4. Error Handling

### 4.1 Information Leakage in OAuth Errors

**Assessment: Adequate**

- OAuth failures redirect to `${APP_URL}/dashboard/login/?error=oauth_failed` (`callback/route.ts:185`).
- The error parameter is a generic string, not an internal message.
- Internal error messages are logged server-side (`callback/route.ts:161`) and sent to the alerting sink (`oauth.service.ts:216-227`), but never exposed to the client.
- Different error codes (`oauth_cancelled`, `oauth_invalid`, `oauth_failed`, `oauth_rate_limited`) are distinguishable by the client but do not leak internal details.

### 4.2 Consent Rejection Handling

**Mitigated.** When the user rejects consent at Google, Google returns `error=access_denied`. The callback handler detects the `error` query parameter and redirects to login with `error=oauth_cancelled` (`callback/route.ts:53-56`).

### 4.3 Provider Unavailability Handling

**Mitigated.** Network errors during JWKS fetch or token exchange throw `OAuthProviderUnavailableError` (`oauth.service.ts:58`, `390`). The callback handler catches these, logs + alerts, and redirects with a generic error (`callback/route.ts:160-185`). The application never accepts a token without successful verification.

---

## 5. Findings

### OAUTH-001: No Clock Skew Leeway for id_token Expiry

- **Finding ID**: OAUTH-001
- **Severity**: Medium
- **Confidence**: High
- **Production blocker**: No
- **Evidence**: `src/auth/services/oauth.service.ts:484`
- **Attack scenario**: A user initiates OAuth login, Google issues an id_token with `exp` within a few seconds of the current time. Due to network latency or clock skew between Google's servers and the application server, the token's `exp` may be slightly in the past by the time verification occurs, causing a false rejection.
- **Impact**: Legitimate users experience intermittent login failures. Not exploitable for security bypass — it only causes denial of service for the affected login attempt.
- **Root cause**: `claims.exp < now` uses a strict comparison with no leeway. Google's own documentation recommends accepting tokens up to 5 minutes before or after the expiry time.
- **Remediation**: Add a 5-minute (300 second) leeway: `claims.exp + 300 < now` or `claims.exp < now - 300`. Consider making the leeway configurable via env.
- **Acceptance criteria**: A token with `exp` up to 5 minutes in the past is accepted; a token with `exp` more than 5 minutes in the past is rejected.
- **Regression tests**: Test that a token with `exp = now - 299` passes verification; a token with `exp = now - 301` fails verification.

---

### OAUTH-002: State Comparison Not Constant-Time

- **Finding ID**: OAUTH-002
- **Severity**: Low
- **Confidence**: Medium
- **Production blocker**: No
- **Evidence**: `src/auth/services/oauth.service.ts:248`
- **Attack scenario**: An attacker performs a timing side-channel analysis on the state comparison to gradually learn the state value. This requires the attacker to be able to make many requests to the callback endpoint with different state values and measure response times with high precision.
- **Impact**: Practical exploitation is extremely unlikely given: (a) the state is a 32-byte random hex string (256 bits of entropy), (b) the comparison is JavaScript string equality which is not easily subject to timing attacks, (c) the per-IP rate limit of 20 per 15 minutes limits brute-force attempts.
- **Root cause**: Uses `state !== expectedState` (JavaScript string inequality) instead of `crypto.timingSafeEqual`.
- **Remediation**: Convert both strings to Buffers and use `crypto.timingSafeEqual(Buffer.from(state), Buffer.from(expectedState))`.
- **Acceptance criteria**: State comparison uses `crypto.timingSafeEqual`; unit test confirms timing consistency across different mismatch positions.
- **Regression tests**: Unit test that verifies the state comparison returns false for any single-character mismatch, with execution time variance within 10%.

---

### OAUTH-003: Web Path Does Not Check email_verified

- **Finding ID**: OAUTH-003
- **Severity**: Medium
- **Confidence**: High
- **Production blocker**: No
- **Evidence**: `src/auth/services/oauth.service.ts:263-267` (web), `src/auth/services/oauth.service.ts:514` (mobile — does check)
- **Attack scenario**: Google issues an id_token where `email_verified: false` for a non-verified Google account. On the web path, this token is accepted if the `sub` matches a pre-provisioned `oauth_accounts` row. On the mobile path, this would be rejected (`oauth.service.ts:514`).
- **Impact**: In the current architecture, pre-provisioned accounts are created by administrators who have already verified the user's identity, so the practical risk is low. However, if a Google account is compromised or if Google's email verification has a gap, an unverified email could be used to authenticate. The inconsistency between web and mobile paths is a defense-in-depth concern.
- **Root cause**: `handleCallbackInternal` does not check `profile.email_verified` before proceeding. The mobile path (`handleMobileIdToken`) does check it.
- **Remediation**: Add `if (!profile.email_verified) throw new Error('Google email is not verified.');` after profile verification in `handleCallbackInternal`, mirroring the mobile path. Alternatively, document the deliberate decision to skip this check on the web path and the rationale.
- **Acceptance criteria**: Both web and mobile OAuth paths reject tokens where `email_verified` is false. Unit tests cover both paths.
- **Regression tests**: Test `handleCallbackInternal` with `email_verified: false` and verify it throws.

---

### OAUTH-004: GOOGLE_REDIRECT_URI Not Conditionally Required

- **Finding ID**: OAUTH-004
- **Severity**: Low
- **Confidence**: High
- **Production blocker**: No
- **Evidence**: `src/auth/config/env.ts:36` (schema), `src/auth/config/env.ts:161` (boot guard)
- **Attack scenario**: An operator sets `GOOGLE_CLIENT_ID` (enabling Google OAuth) but forgets to set `GOOGLE_REDIRECT_URI`. The app boots successfully because `GOOGLE_REDIRECT_URI` is optional in the schema and the boot guard only checks for `GOOGLE_CLIENT_SECRET` when `GOOGLE_CLIENT_ID` is set. The first Google login attempt fails at runtime with a confusing error.
- **Impact**: Misconfiguration leads to a non-functional Google login with a runtime error rather than a boot-time failure.
- **Root cause**: `validateSecurityConfig` checks `GOOGLE_CLIENT_SECRET` when `GOOGLE_CLIENT_ID` is set (`env.ts:161`), but does not also check `GOOGLE_REDIRECT_URI`.
- **Remediation**: Add `if (env.GOOGLE_CLIENT_ID?.trim() && !env.GOOGLE_REDIRECT_URI?.trim()) missing.push('GOOGLE_REDIRECT_URI');` alongside the existing `GOOGLE_CLIENT_SECRET` check.
- **Acceptance criteria**: Boot fails in production when `GOOGLE_CLIENT_ID` is set without `GOOGLE_REDIRECT_URI`.
- **Regression tests**: Integration test that boots with `GOOGLE_CLIENT_ID` set and `GOOGLE_REDIRECT_URI` absent, verifying the expected error.

---

### OAUTH-005: JWKS Fetch Does Not Validate Key Types

- **Finding ID**: OAUTH-005
- **Severity**: Informational
- **Confidence**: Medium
- **Production blocker**: No
- **Evidence**: `src/auth/services/oauth.service.ts:33-36`, `src/auth/services/oauth.service.ts:463-466`
- **Attack scenario**: If Google's JWKS response included non-RSA keys (e.g. EC keys), the cache would store them, and `createPublicKey` at line 463 would fail when constructing a key from `{ kty, n, e }`. The algorithm check at line 444 (`header.alg !== 'RS256'`) prevents using the wrong key type, but the cache interface does not filter by `kty`.
- **Impact**: None in practice — Google only uses RSA keys for OIDC, and the RS256 algorithm check prevents confusion. But the cache interface could be tightened for defense-in-depth.
- **Root cause**: The `JwksCacheEntry` type accepts any key with `{ kid, n, e }` without filtering by `kty: 'RSA'`.
- **Remediation**: Filter JWKS keys to only those with `kty: 'RSA'` when populating the cache. Optionally also filter by `use: 'sig'`.
- **Acceptance criteria**: Non-RSA keys in the JWKS response are silently ignored; only RSA signing keys are cached.
- **Regression tests**: Test with a JWKS response containing mixed key types; verify only RSA keys are used.

---

### OAUTH-006: Per-IP Rate Limit Shared Across All Users

- **Finding ID**: OAUTH-006
- **Severity**: Low
- **Confidence**: High
- **Production blocker**: No
- **Evidence**: `src/app/api/auth/google/callback/route.ts:15-17`, `src/app/api/auth/google/callback/route.ts:77-85`
- **Attack scenario**: An attacker behind a NAT or VPN shares an IP with legitimate users. After 20 OAuth callback requests from that IP within 15 minutes, all users on that IP are rate-limited.
- **Impact**: Denial of service for legitimate users sharing the attacker's IP. However, 20 requests per 15 minutes is generous for legitimate OAuth flows (typically 1-2 per login), and the rate limit only applies to the callback endpoint, not the initiation endpoint.
- **Root cause**: Rate limiting is keyed by IP address only, not by IP + user combination.
- **Remediation**: Consider adding per-user rate limiting (e.g., per `state` cookie or per `sub` claim) alongside the per-IP limit. Or accept the current design with the understanding that OAuth flows are inherently per-user (each requires user interaction at Google's consent screen).
- **Acceptance criteria**: Document the rate limiting design decision; confirm that the per-IP limit of 20/15min is appropriate for the deployment environment.

---

### OAUTH-007: Mobile Path Skips Nonce Verification

- **Finding ID**: OAUTH-007
- **Severity**: Informational
- **Confidence**: High
- **Production blocker**: No
- **Evidence**: `src/auth/services/oauth.service.ts:513`
- **Attack scenario**: An attacker captures a mobile Google ID token and replays it. Without nonce binding, the same token could be used for multiple logins.
- **Impact**: The mobile path accepts the id_token directly (no authorization code flow), so there is no nonce to bind. Instead, the mobile path relies on: (a) the token being short-lived (Google id_tokens expire in 1 hour), (b) the `sub` matching a pre-provisioned account, (c) risk evaluation and MFA checks. This is the standard pattern for mobile OIDC (ID token as auth credential).
- **Root cause**: The mobile path passes `null` as the expected nonce because mobile clients do not use the authorization code flow with nonce.
- **Remediation**: Acceptable as-is for the mobile pattern. Document that mobile relies on token short lifetime and pre-provisioning rather than nonce binding.
- **Acceptance criteria**: Mobile path correctly rejects expired, malformed, or wrong-issuer/audience tokens.

---

### OAUTH-008: No `iat` Claim Validation

- **Finding ID**: OAUTH-008
- **Severity**: Low
- **Confidence**: Medium
- **Production blocker**: No
- **Evidence**: `src/auth/services/oauth.service.ts:475-498`
- **Attack scenario**: An attacker obtains a valid Google id_token (e.g., from a log or a compromised client) that has not yet expired. The token could be replayed for up to 1 hour (Google's default id_token lifetime).
- **Impact**: Limited by the token's `exp` claim (1 hour max). In the web path, the state cookie binding prevents replay without browser access. In the mobile path, the token is presented directly, so the `exp` check is the primary guard.
- **Root cause**: The `iat` (issued-at) claim is not validated. While not strictly required by OIDC Core, validating `iat` with a maximum age (e.g., 10 minutes) would reduce the window for token replay.
- **Remediation**: Add `if (typeof claims.iat === 'number' && claims.iat < now - MAX_IAT_AGE) throw ...` with a configurable maximum age. This is a defense-in-depth measure; `exp` is the primary expiry guard.
- **Acceptance criteria**: Tokens with `iat` older than the configured maximum age are rejected.
- **Regression tests**: Test with a valid token where `iat` is beyond the maximum age.

---

### OAUTH-009: State Cookie Contains All Secrets in Single JSON Blob

- **Finding ID**: OAUTH-009
- **Severity**: Informational
- **Confidence**: Medium
- **Production blocker**: No
- **Evidence**: `src/app/api/auth/google/route.ts:28`
- **Attack scenario**: An attacker who can read the httpOnly cookie (e.g., via XSS on the same domain) gains access to the state, PKCE code verifier, and nonce simultaneously.
- **Impact**: If an attacker has XSS, they can already steal session cookies, so this does not increase the attack surface. The cookie is httpOnly (no JS access), secure (HTTPS only), and sameSite lax.
- **Root cause**: All three secrets (state, codeVerifier, nonce) are serialized as a single JSON object in one cookie.
- **Remediation**: Acceptable as-is. The cookie properties (httpOnly, secure, sameSite) provide sufficient protection. Splitting into multiple cookies would not materially improve security.
- **Acceptance criteria**: Cookie is httpOnly, secure, sameSite lax; maxAge is 10 minutes.

---

### OAUTH-010: OAuth Callback Error Logs Internal Messages

- **Finding ID**: OAUTH-010
- **Severity**: Informational
- **Confidence**: High
- **Production blocker**: No
- **Evidence**: `src/app/api/auth/google/callback/route.ts:161`
- **Attack scenario**: Internal error messages are logged to the server console. If log aggregation is misconfigured or logs are accessible to unauthorized parties, internal details (e.g., "OAuth state mismatch (possible CSRF)", "id_token signature verification failed") could be exposed.
- **Impact**: Information disclosure to log aggregators or unauthorized log readers. The messages themselves do not contain secrets but reveal the specific failure mode.
- **Root cause**: `console.error('Google OAuth callback failed:', err)` logs the full error object.
- **Remediation**: Acceptable for server-side logging. Ensure log aggregation has appropriate access controls. For defense-in-depth, consider logging only error codes rather than full messages.
- **Acceptance criteria**: OAuth errors are logged server-side; client-facing redirects use generic error codes.

---

### OAUTH-011: GOOGLE_CLIENT_SECRET Not Required When GOOGLE_CLIENT_ID Is Set in Non-Production

- **Finding ID**: OAUTH-011
- **Severity**: Informational
- **Confidence**: High
- **Production blocker**: No
- **Evidence**: `src/auth/config/env.ts:186-188`
- **Attack scenario**: In a non-production environment, an operator sets `GOOGLE_CLIENT_ID` without `GOOGLE_CLIENT_SECRET`. The app boots with a warning, and Google login fails at runtime.
- **Impact**: Runtime failure only in non-production environments. The production boot guard correctly enforces the requirement (`env.ts:161`).
- **Root cause**: Dev-only path warns but does not fail for missing `GOOGLE_CLIENT_SECRET` (`env.ts:186-188`).
- **Remediation**: Acceptable design. Dev environments should be permissive for boot; production is enforced.
- **Acceptance criteria**: Production boot fails without `GOOGLE_CLIENT_SECRET` when `GOOGLE_CLIENT_ID` is set.

---

### OAUTH-012: prompt: 'select_account' Prevents Account Chooser Bypass

- **Finding ID**: OAUTH-012
- **Severity**: Informational (Positive Control)
- **Confidence**: High
- **Production blocker**: No
- **Evidence**: `src/auth/services/oauth.service.ts:164`
- **Assessment**: The `prompt: 'select_account'` parameter ensures the user must always select a Google account, preventing session fixation or account chooser bypass attacks where an attacker could force the user to authenticate with a specific Google account.

---

### OAUTH-013: alertingService Failures Are Swallowed

- **Finding ID**: OAUTH-013
- **Severity**: Low
- **Confidence**: High
- **Production blocker**: No
- **Evidence**: `src/auth/services/oauth.service.ts:223-225`
- **Attack scenario**: If the alerting service is unavailable, OAuth failure alerts are silently dropped (`.catch(console.error)`). This means OAuth abuse patterns may go undetected.
- **Impact**: Reduced visibility into OAuth attack patterns. The audit log write (`callback/route.ts:162-176`) is not swallowed and provides a backup record.
- **Root cause**: Alerting failures are caught and logged to console but do not propagate.
- **Remediation**: Acceptable for resilience — the alerting service should not block the user-facing error path. Ensure the audit log (which is not swallowed) provides sufficient forensic data.
- **Acceptance criteria**: OAuth failures are always recorded in the audit log; alerting failures do not affect the user response.

---

## 6. Summary

| ID | Finding | Severity | Production Blocker |
|---|---|---|---|
| OAUTH-001 | No clock skew leeway for id_token expiry | Medium | No |
| OAUTH-002 | State comparison not constant-time | Low | No |
| OAUTH-003 | Web path does not check email_verified | Medium | No |
| OAUTH-004 | GOOGLE_REDIRECT_URI not conditionally required | Low | No |
| OAUTH-005 | JWKS fetch does not validate key types | Informational | No |
| OAUTH-006 | Per-IP rate limit shared across all users | Low | No |
| OAUTH-007 | Mobile path skips nonce verification | Informational | No |
| OAUTH-008 | No iat claim validation | Low | No |
| OAUTH-009 | State cookie contains all secrets in single blob | Informational | No |
| OAUTH-010 | OAuth callback error logs internal messages | Informational | No |
| OAUTH-011 | GOOGLE_CLIENT_SECRET not required in non-production | Informational | No |
| OAUTH-012 | prompt: 'select_account' prevents bypass | Informational (Positive) | No |
| OAUTH-013 | alertingService failures are swallowed | Low | No |

---

## 7. Production Readiness Assessment

**Google OAuth login is production-ready.**

The implementation demonstrates strong security fundamentals:
- Authorization Code + PKCE with S256
- Cryptographic state and nonce generation with proper entropy
- JWKS-backed id_token signature verification with key rotation handling
- Pre-provisioned account linking (no auto-link by email — FIX-C3)
- Comprehensive rate limiting, audit logging, and alerting
- Fail-closed error handling (never accepts without verification)
- Proper cookie lifecycle management (one-time use, cleared on all outcomes)

The Medium-severity findings (OAUTH-001, OAUTH-003) are not production blockers but should be addressed in the next sprint for defense-in-depth. No Critical or High findings were identified.
