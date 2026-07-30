# Session Security Audit

**Date:** 2026-07-27
**Scope:** Session lifecycle, token security, cookie configuration, JWT (mobile), revocation, and timeout enforcement
**Auditor:** Automated security review

---

## 1. Session Token Entropy & Generation

### SESSION-001: Session ID is a MongoDB ObjectId (96-bit entropy)

| Field | Value |
|---|---|
| Severity | Informational |
| Confidence | High |
| Production blocker | No |
| Evidence | `src/auth/crypto/token.ts:21`, `src/auth/repositories/session.repository.ts:14` |

**Description:** Session IDs are MongoDB `ObjectId` values (12 bytes / 96 bits of entropy, timestamp + random + counter). The session cookie is then HMAC-SHA256-signed to produce the final cookie value (`sessionId.base64url(HMAC)`).

**Analysis:** 96 bits of randomness in the ObjectId is sufficient against brute-force. The HMAC signature prevents forgery even if the session ID generation were predictable. The signing secret is validated at boot to be ≥32 characters with a known-default blocklist (`src/auth/config/env.ts:123-137`).

**Verdict:** Acceptable. The signed cookie provides both confidentiality (opaque ID) and integrity (HMAC).

### SESSION-002: Refresh tokens use 48-byte (384-bit) random values

| Field | Value |
|---|---|
| Severity | Informational |
| Confidence | High |
| Production blocker | No |
| Evidence | `src/auth/crypto/token.ts:62-64` |

**Description:** Refresh tokens are generated via `crypto.randomBytes(48).toString('hex')` (384 bits of entropy). Only the SHA-256 hash is stored in the database; the raw token is returned to the client once.

**Analysis:** 384 bits provides cryptographic-strength unguessability. SHA-256 hashing prevents database-leak token theft. This is best practice.

**Verdict:** Excellent.

---

## 2. Cookie Security Flags

### SESSION-003: Session cookie flags are correctly configured

| Field | Value |
|---|---|
| Severity | Informational |
| Confidence | High |
| Production blocker | No |
| Evidence | `src/auth/lib/cookies.ts:47-56` |

**Cookie `cws_session`:**
- `HttpOnly: true` -- not accessible to JavaScript
- `Secure: true` in production (enforced by `SECURE_COOKIES` env + boot guard at `src/auth/config/env.ts:273-280`)
- `SameSite: Lax` -- intentional: allows top-level navigation to include the cookie; CSRF is handled by explicit origin checks
- `Path: /`

**Cookie `cws_refresh`:**
- `HttpOnly: true`
- `Secure: true` in production
- `SameSite: Strict` -- blocks cross-site form POST from sending this high-value token
- `Path: /api/auth/refresh` -- scoped to refresh endpoint only

**Analysis:** The dual SameSite strategy (Lax for session, Strict for refresh) is well-designed. The session cookie needs Lax for normal page navigation to work. The refresh cookie uses Strict because it is only ever sent via same-site XHR/fetch to the refresh endpoint. The `SECURE_COOKIES` boot guard prevents accidental HTTP cookie leakage in production.

**Verdict:** Excellent. Defense-in-depth with explicit env-based Secure flag control.

### SESSION-004: Device token cookie uses Lax, not Strict

| Field | Value |
|---|---|
| Severity | Informational |
| Confidence | Medium |
| Production blocker | No |
| Evidence | `src/auth/lib/device.ts:70-73`, `src/auth/lib/device.ts:113-116` |

**Description:** The `cws_device_token` cookie (HMAC-signed server device record ID) is set with `SameSite: Lax`.

**Analysis:** This is documented as intentional (`src/auth/lib/device.ts:102-104`). The device token is an HMAC-signed security boundary, not a high-value authentication credential. Lax allows it to ride top-level navigations, which is needed for the device identity to be present on page loads. The CSRF origin guard covers state-changing endpoints.

**Verdict:** Acceptable with documented rationale.

---

## 3. Session Rotation

### SESSION-005: New session created on each login (implicit rotation)

| Field | Value |
|---|---|
| Severity | Informational |
| Confidence | High |
| Production blocker | No |
| Evidence | `src/auth/services/session.service.ts:42-177` |

**Description:** Every successful login (password, passkey, 2FA verify, TOTP verify) calls `createSession()` which creates a new session document with a new ObjectId and new refresh token. No session ID is reused across logins.

**Analysis:** This is correct session rotation. Each login produces a fresh session, and the old session (if any) is not directly linked. The concurrent session cap (max 5, `src/auth/services/session.service.ts:78`) automatically revokes overflow sessions.

**Verdict:** Excellent.

### SESSION-006: No explicit session rotation after 2FA completion

| Field | Value |
|---|---|
| Severity | Low |
| Confidence | Medium |
| Production blocker | No |
| Evidence | `src/auth/actions/verify-2fa.ts:99-119`, `src/auth/actions/verify-totp.ts:127-145` |

**Description:** After 2FA verification, a completely new session is created via `createSession()`. The pending 2FA cookie (`cws_2fa_pending`) is cleared.

**Analysis:** Because the 2FA verify actions create a brand new session (not reusing any pre-2FA session), there is no session fixation risk. The pending cookie is a separate opaque token that is consumed and cleared. This is functionally equivalent to session rotation.

**Verdict:** Acceptable. The implementation achieves the security goal through a different (and equally secure) mechanism.

---

## 4. Timeout Enforcement

### SESSION-007: Idle timeout enforced at 30 minutes

| Field | Value |
|---|---|
| Severity | Informational |
| Confidence | High |
| Production blocker | No |
| Evidence | `src/auth/config/env.ts:15`, `src/auth/services/session.service.ts:225-226` |

**Description:** `IDLE_TIMEOUT_MS` defaults to 30 minutes. Checked on every `validateSession()` call and at refresh time.

**Analysis:** The idle timeout is checked in two places:
1. `validateSession()` (line 225-226): rejects sessions where `lastActivityAt + IDLE_TIMEOUT_MS <= now`
2. `rotateRefreshToken()` (line 304-305): same check at refresh time

Last-activity updates are coalesced to once per 60 seconds (`ACTIVITY_WRITE_INTERVAL_MS`) and run in the background via `after()`.

**Verdict:** Excellent. Dual enforcement at validation and refresh time.

### SESSION-008: Absolute timeout enforced via `lastFullAuthAt`

| Field | Value |
|---|---|
| Severity | Informational |
| Confidence | High |
| Production blocker | No |
| Evidence | `src/auth/services/session.service.ts:309-312` |

**Description:** `REFRESH_TOKEN_TTL_MS` defaults to 7 days. The absolute timeout is anchored at `lastFullAuthAt` (set at login time) and checked at refresh time: `lastFullAuthAt + REFRESH_TOKEN_TTL_MS <= now`.

**Analysis:** Even if a client keeps refreshing within the idle window, the session is forcibly revoked after 7 days from the last real authentication. This prevents indefinite session lifetime through continuous refresh.

**Verdict:** Excellent.

---

## 5. Remember-Me Lifetime

### SESSION-009: Remember-me controls cookie maxAge only

| Field | Value |
|---|---|
| Severity | Informational |
| Confidence | High |
| Production blocker | No |
| Evidence | `src/auth/lib/cookies.ts:100-103` |

**Description:** When `rememberMe` is set, the session cookie gets `maxAge = ACCESS_SESSION_TTL_MS / 1000` (15 min) and refresh cookie gets `maxAge = REFRESH_TOKEN_TTL_MS / 1000` (7 days). Without remember-me, no maxAge is set (browser session cookies).

**Analysis:** The server-side session TTL and revocation are independent of the cookie maxAge. The DB `expiresAt` is always set to `now + ACCESS_SESSION_TTL_MS`. The `maxAge` on the cookie only controls whether the browser persists the cookie after closing. The server-side timeout still applies.

**Verdict:** Acceptable. The server-side enforcement is the security boundary; cookie maxAge is a UX convenience.

---

## 6. Logout Invalidation

### SESSION-010: Logout revokes session and refresh family

| Field | Value |
|---|---|
| Severity | Informational |
| Confidence | High |
| Production blocker | No |
| Evidence | `src/auth/services/logout.service.ts:13-37`, `src/app/api/auth/logout/route.ts:38-41` |

**Description:** The logout route:
1. Verifies the session cookie signature
2. Revokes the refresh token family via `revokeRefreshFamily(sessionId, 'logout')`
3. Revokes the session via `logoutService.logout(sessionId, 'user')`
4. Clears both auth cookies

**Analysis:** Logout is comprehensive: it revokes both the session record and all refresh tokens for the session, then clears the browser cookies. The audit log records the event.

**Verdict:** Excellent.

### SESSION-011: Logout-all revokes all user sessions

| Field | Value |
|---|---|
| Severity | Informational |
| Confidence | High |
| Production blocker | No |
| Evidence | `src/auth/actions/session.ts:117-159` |

**Description:** The `revokeAllOtherSessionsAction` revokes all sessions for the user except the current one, including their refresh families. The admin `revokeAllSessions` revokes ALL sessions globally.

**Analysis:** Both operations correctly cascade to refresh tokens and are audit-logged.

**Verdict:** Excellent.

---

## 7. Password-Change & Password-Reset Session Invalidation

### SESSION-012: Password change invalidates other sessions via accountSecurityVersion

| Field | Value |
|---|---|
| Severity | Informational |
| Confidence | High |
| Production blocker | No |
| Evidence | `src/auth/services/session.service.ts:212-221`, `src/auth/services/session.service.ts:122-123` |

**Description:** On session creation, `accountSecurityVersion` is snapshotted from the user document. On every `validateSession()` call, the current version is compared to the snapshot. If they differ (e.g., password was changed), the session is revoked.

**Analysis:** This is a defense-in-depth mechanism (FIX-14). Even if explicit session revocation was missed during a password change, the version mismatch causes immediate rejection on next use. The version is also checked in `authenticateBearerRequest()` for mobile tokens (`src/auth/lib/mobile.ts:56-60`).

**Verdict:** Excellent. Dual invalidation: explicit revocation + version-based defense-in-depth.

### SESSION-013: Password reset triggers session invalidation

| Field | Value |
|---|---|
| Severity | Informational |
| Confidence | High |
| Production blocker | No |
| Evidence | `src/auth/services/session.service.ts:212-221` |

**Description:** Password reset calls `PasswordService.resetPassword()` which bumps `accountSecurityVersion`. All existing sessions with stale versions are rejected on next validation.

**Analysis:** Combined with the `accountSecurityVersion` check in `validateSession()`, this provides immediate invalidation of all sessions after a password reset.

**Verdict:** Excellent.

---

## 8. Disabled-User Session Invalidation

### SESSION-014: Active user status checked on every session validation

| Field | Value |
|---|---|
| Severity | Informational |
| Confidence | High |
| Production blocker | No |
| Evidence | `src/auth/services/session.service.ts:204-208` |

**Description:** On every `validateSession()` call, the user's `status` is checked. If `user.status !== 'active'`, the session is revoked immediately.

**Analysis:** This means an admin suspending/deleting a user takes effect immediately -- the user's current session is revoked on their next request. No delayed propagation.

**Verdict:** Excellent.

---

## 9. Server-Side Revocation Mechanism

### SESSION-015: Database-backed session revocation with refresh token cascade

| Field | Value |
|---|---|
| Severity | Informational |
| Confidence | High |
| Production blocker | No |
| Evidence | `src/auth/repositories/session.repository.ts:47-64`, `src/auth/repositories/refresh-token.repository.ts:108-117` |

**Description:** Sessions are revoked by setting `revoked: true` in MongoDB. Refresh tokens are revoked by session ID in a batched write. The `validateSession()` method checks `session.revoked` before accepting a session.

**Analysis:** Revocation is immediate and database-backed. There is no in-memory state that could be lost across serverless instances. The refresh token rotation with reuse detection (`src/auth/services/session.service.ts:280-294`) adds additional protection against token theft.

**Verdict:** Excellent.

---

## 10. Concurrent Session Behavior

### SESSION-016: Concurrent session cap enforced at 5

| Field | Value |
|---|---|
| Severity | Informational |
| Confidence | High |
| Production blocker | No |
| Evidence | `src/auth/services/session.service.ts:78`, `src/auth/services/session.service.ts:502-517` |

**Description:** `enforceConcurrentSessionLimit(userId, 5)` is called before creating each new session. Active sessions beyond the cap are revoked in a batched write (FIX-10), preventing race conditions between near-simultaneous logins.

**Analysis:** The batched revocation (`revokeManyByIds` + `revokeBySessions`) prevents the TOCTOU race where two concurrent logins could both pass the check and exceed the cap.

**Verdict:** Excellent.

---

## 11. Sensitive Data in Browser Storage

### SESSION-017: No sensitive data in localStorage/sessionStorage

| Field | Value |
|---|---|
| Severity | Informational |
| Confidence | High |
| Production blocker | No |
| Evidence | Codebase-wide grep for `localStorage`/`sessionStorage` returned no results |

**Description:** No usage of `localStorage` or `sessionStorage` was found in the codebase. Authentication state is managed via HttpOnly cookies and server-side sessions.

**Verdict:** Excellent.

---

## 12. Session Identifiers in URLs or Logs

### SESSION-018: Session IDs not logged in normal operation

| Field | Value |
|---|---|
| Severity | Informational |
| Confidence | Medium |
| Production blocker | No |
| Evidence | `src/auth/services/logout.service.ts:23`, `src/auth/services/session.service.ts:321-341` |

**Description:** Audit logs include session IDs as `resource.id` (for admin/breach events) and user IDs as `userId`. These are internal audit records, not exposed to clients. Session cookie values are not logged.

**Verdict:** Acceptable. Session IDs in server-side audit logs are necessary for forensic analysis.

---

## 13. Refresh Token Rotation & Reuse Detection

### SESSION-019: Atomic refresh token rotation prevents concurrent replay

| Field | Value |
|---|---|
| Severity | Informational |
| Confidence | High |
| Production blocker | No |
| Evidence | `src/auth/repositories/refresh-token.repository.ts:66-85`, `src/auth/services/session.service.ts:397-420` |

**Description:** `atomicReplace()` uses a conditional `findOneAndUpdate` (`replacedBy: null`) to ensure only one concurrent rotation wins. The loser is routed down the reuse-revoke path, and the entire session family is revoked.

**Analysis:** This is a textbook implementation of the refresh token rotation pattern with atomic replacement. The H-4 fix prevents the lost-update race condition.

**Verdict:** Excellent.

### SESSION-020: Device binding on refresh tokens

| Field | Value |
|---|---|
| Severity | Informational |
| Confidence | High |
| Production blocker | No |
| Evidence | `src/auth/services/session.service.ts:359-378` |

**Description:** Once a session is bound to a server-issued device record, refresh requests must present the matching signed device token. Mismatches are treated as theft and trigger session revocation + alerting.

**Analysis:** This prevents stolen refresh tokens from being used on a different device. Legacy sessions with `deviceId: null` are allowed during rollout (backward compatibility).

**Verdict:** Excellent.

---

## 14. JWT (Mobile) Security

### SESSION-021: EdDSA algorithm with explicit allowlist

| Field | Value |
|---|---|
| Severity | Informational |
| Confidence | High |
| Production blocker | No |
| Evidence | `src/auth/services/mobile-token.service.ts:6`, `src/auth/services/mobile-token.service.ts:61` |

**Description:** Mobile access tokens use EdDSA (Ed25519) JWTs. The algorithm is hardcoded to `'EdDSA'` and explicitly allowlisted in verification: `algorithms: [ALGORITHM]`. The `header.alg` is checked before verification to reject algorithm confusion attacks.

**Analysis:** EdDSA is a modern, secure algorithm. The explicit allowlist prevents algorithm confusion. The `kid` (key ID) is validated against the configured public key set.

**Verdict:** Excellent.

### SESSION-022: Key strength and rotation support

| Field | Value |
|---|---|
| Severity | Informational |
| Confidence | High |
| Production blocker | No |
| Evidence | `src/auth/config/env.ts:22-24`, `src/auth/services/mobile-token.service.ts:80-91` |

**Description:** The mobile JWT configuration supports:
- `MOBILE_JWT_PRIVATE_KEY_B64`: DER-encoded Ed25519 private key
- `MOBILE_JWT_PUBLIC_KEYS_JSON`: JSON map of `kid -> publicKeyB64` for multi-key support
- `MOBILE_JWT_KEY_ID`: active signing key ID

**Analysis:** The multi-key public key map supports key rotation: old public keys can remain in the map for verification while a new key is used for signing. The `getMobileJwks()` function exposes all public keys for client discovery.

**Verdict:** Excellent. Key rotation is supported by design.

### SESSION-023: Issuer, audience, and expiration validated

| Field | Value |
|---|---|
| Severity | Informational |
| Confidence | High |
| Production blocker | No |
| Evidence | `src/auth/services/mobile-token.service.ts:64-68` |

**Description:** `jwtVerify()` is called with explicit `issuer`, `audience`, and uses the default expiration check. The `typ` claim is also validated to be `'access'`.

**Verdict:** Excellent.

### SESSION-024: Mobile token revocation via session check

| Field | Value |
|---|---|
| Severity | Informational |
| Confidence | High |
| Production blocker | No |
| Evidence | `src/auth/lib/mobile.ts:51-61` |

**Description:** `authenticateBearerRequest()` verifies the JWT, then checks the session document: `session.revoked`, `session.userId.equals(userId)`, `session.platform !== 'mobile'`, `session.expiresAt`, user `status`, and `accountSecurityVersion`.

**Analysis:** Even though JWTs are self-contained, every request validates against the server-side session record. Revoked sessions, expired sessions, disabled users, and security-version mismatches are all caught.

**Verdict:** Excellent. Server-side validation on every request.

### SESSION-025: Sensitive claims not exposed in JWT

| Field | Value |
|---|---|
| Severity | Informational |
| Confidence | High |
| Production blocker | No |
| Evidence | `src/auth/services/mobile-token.service.ts:35-46` |

**Description:** The JWT payload contains only: `sub` (userId), `sid` (sessionId), `typ` ('access'), `iss`, `aud`, `iat`, `exp`, `jti`. No roles, permissions, emails, or other sensitive data.

**Verdict:** Excellent. Minimal claims reduce token exposure risk.

---

## Findings Summary

| ID | Severity | Title | Production Blocker |
|---|---|---|---|
| SESSION-001 | Informational | Session ID entropy (ObjectId, 96-bit) | No |
| SESSION-002 | Informational | Refresh token entropy (384-bit) | No |
| SESSION-003 | Informational | Cookie flags correctly configured | No |
| SESSION-004 | Informational | Device token uses Lax (documented) | No |
| SESSION-005 | Informational | New session on each login | No |
| SESSION-006 | Low | No explicit rotation after 2FA (new session created instead) | No |
| SESSION-007 | Informational | 30-minute idle timeout enforced | No |
| SESSION-008 | Informational | 7-day absolute timeout enforced | No |
| SESSION-009 | Informational | Remember-me controls cookie maxAge only | No |
| SESSION-010 | Informational | Logout revokes session + refresh family | No |
| SESSION-011 | Informational | Logout-all revokes all user sessions | No |
| SESSION-012 | Informational | Password change invalidates via security version | No |
| SESSION-013 | Informational | Password reset bumps security version | No |
| SESSION-014 | Informational | Disabled user checked on every validation | No |
| SESSION-015 | Informational | Database-backed revocation with cascade | No |
| SESSION-016 | Informational | Concurrent session cap at 5 (batched) | No |
| SESSION-017 | Informational | No localStorage/sessionStorage usage | No |
| SESSION-018 | Informational | Session IDs in audit logs only (server-side) | No |
| SESSION-019 | Informational | Atomic refresh rotation prevents replay | No |
| SESSION-020 | Informational | Device binding on refresh tokens | No |
| SESSION-021 | Informational | EdDSA with explicit algorithm allowlist | No |
| SESSION-022 | Informational | Key rotation supported via multi-key map | No |
| SESSION-023 | Informational | Issuer/audience/exp validated on JWT | No |
| SESSION-024 | Informational | Server-side session check on every mobile request | No |
| SESSION-025 | Informational | Minimal JWT claims | No |

**No Critical or High severity findings.**

The session security implementation is **well-designed and follows current best practices**. The codebase demonstrates defense-in-depth with multiple overlapping protections: signed cookies, database-backed session records, refresh token rotation with atomic replacement, device binding, account security versioning, and concurrent session limits.
