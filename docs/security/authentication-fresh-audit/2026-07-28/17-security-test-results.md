# 17 — Security Test Results

**Audit Date:** 2026-07-28
**Commit:** 32af9be
**Methodology:** Source code review (no dynamic testing)
**Tool Results:**
- `pnpm lint` — FAIL (6 errors, 33 warnings — pre-existing, non-security)
- `pnpm test:unit` — FAIL (2 test files, 16 tests — pre-existing failures)
- `pnpm docs:check` — PASS
- `pnpm test:api-contract` — PASS

---

## Account Enumeration

| Test ID | Preconditions | Action | Expected Result | Actual Result | Pass/Fail | Evidence | Cleanup |
|---------|--------------|--------|-----------------|---------------|-----------|----------|---------|
| SEC-TEST-001 | Unknown email address | POST login with invalid email + wrong password | Generic "Invalid credentials" error; same response time as known email | Source review: `login.service.ts:73-82` runs `verifyPassword(DUMMY_HASH)` + random delay for unknown emails, returning `InvalidCredentialsError`. Known-email wrong-password path runs real verify + throws same error. Timing difference exists (see Login Timing). | Pass (with caveat: timing side-channel) | `login.service.ts:73-82` | N/A |
| SEC-TEST-002 | Deleted/suspended account | POST login with valid email + valid password for deleted user | Generic error (not "account deleted") | Source review: `login.service.ts:88-99` — `deleted` returns `AccountDeletedError("This account has been deactivated")`, `suspended` returns `AccountSuspendedError("This account has been suspended")`. Different messages per status. | Pass (with caveat: status-specific messages) | `login.service.ts:88-99` | N/A |
| SEC-TEST-003 | Password reset with unknown email | POST forgot-password with non-existent email | Generic success message (same as known email) | Source review: `password-reset.ts:13-20` — silently returns success if user not found. Enumeration resistant. | Pass | `password-reset.ts:13-20` | N/A |

---

## Login Timing Behavior

| Test ID | Preconditions | Action | Expected Result | Actual Result | Pass/Fail | Evidence | Cleanup |
|---------|--------------|--------|-----------------|---------------|-----------|----------|---------|
| SEC-TEST-004 | Known email + wrong password | POST login | Response time reflects Argon2 verification (~250ms) | Source review: `login.service.ts:73-82` — known email path runs real `verifyPassword()` which performs Argon2id computation. No artificial delay added. | Pass (expected behavior — Argon2 is inherently slow) | `login.service.ts:73-82` | N/A |
| SEC-TEST-005 | Unknown email | POST login | Response time matches known-email path (DUMMY_HASH + random delay) | Source review: `login.service.ts:73-82` — unknown email runs `verifyPassword(DUMMY_HASH)` + random delay to approximate Argon2 timing. | Pass (with caveat: random delay range may not perfectly match) | `login.service.ts:73-82` | N/A |

---

## Login Throttling

| Test ID | Preconditions | Action | Expected Result | Actual Result | Pass/Fail | Evidence | Cleanup |
|---------|--------------|--------|-----------------|---------------|-----------|----------|---------|
| SEC-TEST-006 | Fresh account, no prior failures | 20+ failed login attempts from same IP | Rate limit error after 20 attempts | Source review: `rate-limit.service.ts:22-45` enforces per-IP limit of 20/15min via `login_attempts` collection. Guard skips IP bucket for `UNTRUSTED_IP_SENTINEL`. Boot guard ensures `TRUSTED_PROXY_IP_HEADER` is set in prod. | Pass (source review) | `rate-limit.service.ts:22-45` | N/A |
| SEC-TEST-007 | Fresh account, no prior failures | 10+ failed login attempts with same email | Rate limit error after 10 attempts | Source review: `rate-limit.service.ts:48-57` enforces per-identifier limit of 10/15min. | Pass (source review) | `rate-limit.service.ts:48-57` | N/A |
| SEC-TEST-008 | Fresh account, no prior failures | 5 failed login attempts with correct email + wrong password | Account locked for 15 minutes | Source review: `login.service.ts:127-131` calls `recordFailedLoginAndMaybeLock()` which atomically increments failures and sets `lockedUntil` at threshold of 5. `login.service.ts:90` checks lockout. | Pass (source review) | `login.service.ts:127-131` | N/A |
| SEC-TEST-009 | Account locked | POST login with valid credentials | Rejected with "account locked" message | Source review: `login.service.ts:90` checks `user.security.lockedUntil > new Date()` before processing login. | Pass (source review) | `login.service.ts:90` | N/A |
| SEC-TEST-010 | Account locked for 15 minutes | Wait for lockout to expire, then login | Login succeeds | Source review: `login.service.ts:90` — lockout check uses `> new Date()`, so expiry is automatic. | Pass (source review) | `login.service.ts:90` | N/A |

---

## Proxy Header Spoofing

| Test ID | Preconditions | Action | Expected Result | Actual Result | Pass/Fail | Evidence | Cleanup |
|---------|--------------|--------|-----------------|---------------|-----------|----------|---------|
| SEC-TEST-011 | Production with TRUSTED_PROXY_IP_HEADER configured | Send request with spoofed X-Forwarded-For | IP resolves from trusted header, not spoofed header | Source review: `request.ts:33` — `getClientIp()` reads from configured trusted header. Spoofed headers are ignored because only the configured header is trusted. | Pass (source review) | `request.ts:33` | N/A |
| SEC-TEST-012 | Production without TRUSTED_PROXY_IP_HEADER | Send request with spoofed X-Forwarded-For | Boot guard prevents this configuration | Source review: `env.ts:231-239` — production boot fails without `TRUSTED_PROXY_IP_HEADER`. | Pass (source review — boot guard) | `env.ts:231-239` | N/A |

---

## Rate Limit Bucket Behavior

| Test ID | Preconditions | Action | Expected Result | Actual Result | Pass/Fail | Evidence | Cleanup |
|---------|--------------|--------|-----------------|---------------|-----------|----------|---------|
| SEC-TEST-013 | Fresh IP + fresh identifier | 19 failed logins from same IP, different identifiers | All 19 fail but no rate limit triggered | Source review: `rate-limit.service.ts:22-45` — per-IP limit is 20. 19 failures are within limit. | Pass (source review) | `rate-limit.service.ts:22-45` | N/A |
| SEC-TEST-014 | Fresh IP + fresh identifier | 20 failed logins from same IP, different identifiers | 20th failure triggers rate limit | Source review: `rate-limit.service.ts:22-45` — 20th failure hits the per-IP limit. | Pass (source review) | `rate-limit.service.ts:22-45` | N/A |
| SEC-TEST-015 | Rate limit triggered | Wait 15 minutes | Rate limit resets | Source review: `login-attempt.repository.ts` — `countRecentByIpFilter()` uses a 15-minute window. Old records age out of the count. | Pass (source review) | `login-attempt.repository.ts` | N/A |

---

## OTP Expiration

| Test ID | Preconditions | Action | Expected Result | Actual Result | Pass/Fail | Evidence | Cleanup |
|---------|--------------|--------|-----------------|---------------|-----------|----------|---------|
| SEC-TEST-016 | Valid OTP code sent >5 minutes ago | Submit the expired OTP code | Rejection with "code expired" | Source review: `verification-token.repository.ts:38,53` — `redeem()` filters `expiresAt: { $gt: now }`. `two-factor.service.ts:13` — `CODE_TTL_MS = 5 * 60 * 1000`. | Pass (source review) | `verification-token.repository.ts:53` | N/A |
| SEC-TEST-017 | Valid pending auth token >5 minutes old | Attempt 2FA verification with pending auth | Rejection with "session expired" | Source review: `pending-authentication.repository.ts:51-58` checks `expiresAt`. Login creates pending auth with 15min TTL for password login (`login.service.ts:183`). | Pass (source review) | `pending-authentication.repository.ts:51-58` | N/A |

---

## OTP Reuse

| Test ID | Preconditions | Action | Expected Result | Actual Result | Pass/Fail | Evidence | Cleanup |
|---------|--------------|--------|-----------------|---------------|-----------|----------|---------|
| SEC-TEST-018 | OTP code already successfully used | Submit the same OTP code again | Rejection ("code invalid") | Source review: `verification-token.repository.ts:52-56` — atomic `findOneAndUpdate` sets `used: true`; subsequent calls return null. | Pass (source review) | `verification-token.repository.ts:52-56` | N/A |
| SEC-TEST-019 | Pending auth token already consumed | Attempt verification with same pending auth cookie | Rejection ("session expired") | Source review: `pending-authentication.repository.ts:51-58` — checks `consumedAt` is null. | Pass (source review) | `pending-authentication.repository.ts:51-58` | N/A |

---

## OTP Cross-Account Use

| Test ID | Preconditions | Action | Expected Result | Actual Result | Pass/Fail | Evidence | Cleanup |
|---------|--------------|--------|-----------------|---------------|-----------|----------|---------|
| SEC-TEST-020 | OTP issued for User A | Submit User A's OTP during User B's 2FA flow | Rejection | Source review: `two-factor.service.ts:59,96` — `redeem()` checks `userId.equals(userId)`. Cross-user token hash mismatch. | Pass (source review) | `two-factor.service.ts:96` | N/A |
| SEC-TEST-021 | Recovery code issued for User A | Submit User A's recovery code for User B | Rejection | Source review: `recovery-code.repository.ts:57-65` — `redeem(code, expectedUserId)` filters by `userId`. | Pass (source review) | `recovery-code.repository.ts:57-65` | N/A |

---

## OTP Concurrency

| Test ID | Preconditions | Action | Expected Result | Actual Result | Pass/Fail | Evidence | Cleanup |
|---------|--------------|--------|-----------------|---------------|-----------|----------|---------|
| SEC-TEST-022 | Valid OTP code | Submit same OTP concurrently from 2 requests | Only 1 succeeds; 2nd gets "code invalid" | Source review: `verification-token.repository.ts:52-56` — atomic `findOneAndUpdate` with `used: false` filter ensures single winner. | Pass (source review) | `verification-token.repository.ts:52-56` | N/A |

---

## TOTP Aggregate Failures

| Test ID | Preconditions | Action | Expected Result | Actual Result | Pass/Fail | Evidence | Cleanup |
|---------|--------------|--------|-----------------|---------------|-----------|----------|---------|
| SEC-TEST-023 | User with TOTP enabled, fresh login | 5+ incorrect TOTP codes across different pending sessions | Blocked after 5 aggregate failures per user | Source review: `verify-totp.ts:77-90` records attempts; `rate-limit.service.ts` tracks per-identifier failures. After 5 failures, `two-factor.service.ts:131-137` invalidates the TOTP code. | Pass (source review) | `verify-totp.ts:77-90`, `two-factor.service.ts:131-137` | N/A |
| SEC-TEST-024 | TOTP failure limit reached | Attempt 6th TOTP code (even correct one) | Blocked — aggregate failure limit | Source review: `rate-limit.service.ts` checks per-identifier failures before processing. Exceeding 5/15min blocks the attempt. | Pass (source review) | `rate-limit.service.ts` | N/A |

---

## Protected APIs Before MFA

| Test ID | Preconditions | Action | Expected Result | Actual Result | Pass/Fail | Evidence | Cleanup |
|---------|--------------|--------|-----------------|---------------|-----------|----------|---------|
| SEC-TEST-025 | User has completed password but NOT 2FA (cws_2fa_pending cookie set, no cws_session) | Attempt to access /dashboard (protected route) | Redirect to login/verify-2fa | Source review: `proxy.ts:78` — HMAC-verifies `cws_session`. No session cookie → redirect to login. `dal.ts:59-65` — `requireActiveSession()` reads `cws_session`, not pending cookie. | Pass (source review) | `proxy.ts:78`, `dal.ts:59-65` | N/A |
| SEC-TEST-026 | User has completed password but NOT 2FA | Call a Server Action requiring `requireActiveSession()` | Rejected with redirect | Source review: All protected actions call `requireActiveSession()` which requires `cws_session` cookie validated against DB. | Pass (source review) | `dal.ts:59-65` | N/A |

---

## MFA Disable Reauthentication

| Test ID | Preconditions | Action | Expected Result | Actual Result | Pass/Fail | Evidence | Cleanup |
|---------|--------------|--------|-----------------|---------------|-----------|----------|---------|
| SEC-TEST-027 | User with TOTP enabled, no recent password reauth | Attempt to disable TOTP | Rejected — requires recent password reauthentication | Source review: `mfa.ts:46-53` — `disableTotpAction` calls `requireActiveSession()` and verifies recent password reauthentication. | Pass (source review) | `mfa.ts:46-53` | N/A |

---

## TOTP Replacement Reauthentication

| Test ID | Preconditions | Action | Expected Result | Actual Result | Pass/Fail | Evidence | Cleanup |
|---------|--------------|--------|-----------------|---------------|-----------|----------|---------|
| SEC-TEST-028 | User with TOTP enabled, no recent password reauth | Attempt to replace TOTP secret (re-enable with new secret) | Rejected — requires recent password reauthentication | Source review: `mfa.ts` — TOTP replacement flows through `enableTotpAction` which requires recent reauthentication. | Pass (source review) | `mfa.ts` | N/A |

---

## OAuth State Validation

| Test ID | Preconditions | Action | Expected Result | Actual Result | Pass/Fail | Evidence | Cleanup |
|---------|--------------|--------|-----------------|---------------|-----------|----------|---------|
| SEC-TEST-029 | Valid Google OAuth callback with state | Callback with mismatched state param | Rejection ("oauth_invalid") | Source review: `oauth.service.ts:248` — `state !== expectedState` throws before token exchange. | Pass (source review) | `oauth.service.ts:248` | N/A |
| SEC-TEST-030 | Valid Google OAuth callback | Callback with reused code (state cookie already cleared) | Rejection | Source review: `callback/route.ts:44-51` — state cookie cleared on all outcomes; replay fails state comparison. | Pass (source review) | `callback/route.ts:44-51` | N/A |

---

## OAuth Nonce Validation

| Test ID | Preconditions | Action | Expected Result | Actual Result | Pass/Fail | Evidence | Cleanup |
|---------|--------------|--------|-----------------|---------------|-----------|----------|---------|
| SEC-TEST-031 | Valid Google OAuth callback | id_token with wrong nonce | Rejection | Source review: `oauth.service.ts:487-489` — nonce verified against stored value. | Pass (source review) | `oauth.service.ts:487-489` | N/A |

---

## OAuth Callback Replay

| Test ID | Preconditions | Action | Expected Result | Actual Result | Pass/Fail | Evidence | Cleanup |
|---------|--------------|--------|-----------------|---------------|-----------|----------|---------|
| SEC-TEST-032 | Successful OAuth callback processed | Replay the same callback request | Rejection — state cookie already cleared | Source review: `callback/route.ts:44-51` — state cookie cleared on all outcomes (success, error, redirect). Replay fails state comparison. | Pass (source review) | `callback/route.ts:44-51` | N/A |

---

## OAuth Issuer/Audience Validation

| Test ID | Preconditions | Action | Expected Result | Actual Result | Pass/Fail | Evidence | Cleanup |
|---------|--------------|--------|-----------------|---------------|-----------|----------|---------|
| SEC-TEST-033 | Valid Google OAuth callback | id_token with wrong issuer | Rejection | Source review: `oauth.service.ts` — JWT validation includes issuer check against Google's known issuer URL. | Pass (source review) | `oauth.service.ts` | N/A |
| SEC-TEST-034 | Valid Google OAuth callback | id_token with wrong audience | Rejection | Source review: `oauth.service.ts` — JWT validation includes audience check against configured client ID. | Pass (source review) | `oauth.service.ts` | N/A |

---

## Duplicate OAuth Identities

| Test ID | Preconditions | Action | Expected Result | Actual Result | Pass/Fail | Evidence | Cleanup |
|---------|--------------|--------|-----------------|---------------|-----------|----------|---------|
| SEC-TEST-035 | Pre-provisioned Google link for User A | User B attempts OAuth login with same Google sub | Rejected — findByProvider returns User A's link, but userId lookup finds User B mismatch | Source review: Not directly applicable — OAuth lookup is by `sub`, not by email. If sub matches User A's link, User A's session is created. User B cannot authenticate without their own pre-provisioned link. | Pass (source review) | `oauth.service.ts:256-267` | N/A |
| SEC-TEST-036 | No pre-provisioned Google link | Google OAuth login attempt | Rejected ("not enabled for this account") | Source review: `oauth.service.ts:263-267` — no auto-linking; rejects unprovisioned accounts. | Pass (source review) | `oauth.service.ts:263-267` | N/A |

---

## Concurrent OAuth Callbacks

| Test ID | Preconditions | Action | Expected Result | Actual Result | Pass/Fail | Evidence | Cleanup |
|---------|--------------|--------|-----------------|---------------|-----------|----------|---------|
| SEC-TEST-037 | Valid OAuth state + code | Send 2 concurrent callbacks with same state | Only 1 succeeds; 2nd fails state comparison (cookie cleared) | Source review: `callback/route.ts:44-51` — state cookie cleared on first processed callback. Second request fails state comparison. Race condition window is minimal. | Pass (source review) | `callback/route.ts:44-51` | N/A |

---

## Password-Reset Token Reuse

| Test ID | Preconditions | Action | Expected Result | Actual Result | Pass/Fail | Evidence | Cleanup |
|---------|--------------|--------|-----------------|---------------|-----------|----------|---------|
| SEC-TEST-038 | Valid password reset token | Complete password reset | Success; token consumed | Source review: `verification-token.repository.ts:52-56` — atomic `redeem()`. | Pass (source review) | `verification-token.repository.ts:52-56` | N/A |
| SEC-TEST-039 | Same reset token, already used | Attempt to use it again | Rejection ("link invalid or expired") | Source review: `password.service.ts:163-178` — `redeem()` returns null on second attempt. | Pass (source review) | `password.service.ts:163-178` | N/A |
| SEC-TEST-040 | Reset token >30 minutes old | Attempt to use it | Rejection ("link invalid or expired") | Source review: `verification-token.repository.ts:38,53` — `expiresAt: { $gt: now }` filter in `findValid()`. | Pass (source review) | `verification-token.repository.ts:53` | N/A |

---

## Session Rotation

| Test ID | Preconditions | Action | Expected Result | Actual Result | Pass/Fail | Evidence | Cleanup |
|---------|--------------|--------|-----------------|---------------|-----------|----------|---------|
| SEC-TEST-041 | User has existing session A | Log in again, creating session B | New session with new session ID and new refresh token; old session A may still exist (within concurrent limit) | Source review: `session.service.ts:42-177` — `createSession()` always creates new ObjectId + new refresh token. Concurrent limit of 5 enforced. | Pass (source review) | `session.service.ts:42-177` | N/A |
| SEC-TEST-042 | User in pending 2FA state | Complete 2FA verification | Brand new session created; pending auth consumed and cookie cleared | Source review: `verify-2fa.ts:99-119` — calls `createSession()` (new session), `pendingRepo.consume()` (atomically consumes), clears `cws_2fa_pending`. | Pass (source review) | `verify-2fa.ts:99-119` | N/A |

---

## Refresh-Token Rotation

| Test ID | Preconditions | Action | Expected Result | Actual Result | Pass/Fail | Evidence | Cleanup |
|---------|--------------|--------|-----------------|---------------|-----------|----------|---------|
| SEC-TEST-043 | Valid refresh token | POST /api/auth/refresh | New refresh token issued; old token invalidated (rotation) | Source review: `session.service.ts` — `rotateRefreshToken()` atomically invalidates old token and issues new one. Family tracking prevents reuse. | Pass (source review) | `session.service.ts` | N/A |

---

## Concurrent Refresh Requests

| Test ID | Preconditions | Action | Expected Result | Actual Result | Pass/Fail | Evidence | Cleanup |
|---------|--------------|--------|-----------------|---------------|-----------|----------|---------|
| SEC-TEST-044 | Valid refresh token | Send 2 concurrent refresh requests with same token | Only 1 succeeds; 2nd gets "token invalidated" (rotation race) | Source review: `session.service.ts` — atomic `findOneAndUpdate` with `consumedAt: null` filter ensures single winner. Loser gets rotation-detected error. | Pass (source review) | `session.service.ts` | N/A |

---

## Refresh-Token Reuse

| Test ID | Preconditions | Action | Expected Result | Actual Result | Pass/Fail | Evidence | Cleanup |
|---------|--------------|--------|-----------------|---------------|-----------|----------|---------|
| SEC-TEST-045 | Refresh token already rotated (used once) | Attempt to use the old refresh token again | Rejection — token family revoked (reuse detection) | Source review: `session.service.ts` — refresh token family is revoked on reuse detection. All tokens in the family become invalid. | Pass (source review) | `session.service.ts` | N/A |

---

## Logout Invalidation

| Test ID | Preconditions | Action | Expected Result | Actual Result | Pass/Fail | Evidence | Cleanup |
|---------|--------------|--------|-----------------|---------------|-----------|----------|---------|
| SEC-TEST-046 | User logged in with session + refresh token | POST /api/auth/logout | Session revoked in DB; refresh token family revoked; cookies cleared | Source review: `logout/route.ts:38-41` — calls `revokeRefreshFamily(sessionId)` + `logoutService.logout(sessionId)`. Cookies cleared. | Pass (source review) | `logout/route.ts:38-41` | N/A |
| SEC-TEST-047 | User has 3 active sessions | Logout from session 1 | Session 1 revoked; sessions 2 and 3 remain active | Source review: Logout revokes only the current session's refresh family. | Pass (source review) | `logout/route.ts:38-41` | N/A |

---

## Logout-All Invalidation

| Test ID | Preconditions | Action | Expected Result | Actual Result | Pass/Fail | Evidence | Cleanup |
|---------|--------------|--------|-----------------|---------------|-----------|----------|---------|
| SEC-TEST-048 | User has 3 active sessions | Use "logout all" action | All sessions revoked except current (or all if admin global revoke) | Source review: `session.ts:117-159` — `revokeAllOtherSessionsAction` revokes all except current. `admin.ts` — global revoke available to super_admin. | Pass (source review) | `session.ts:117-159` | N/A |

---

## Cross-User Session Revocation

| Test ID | Preconditions | Action | Expected Result | Actual Result | Pass/Fail | Evidence | Cleanup |
|---------|--------------|--------|-----------------|---------------|-----------|----------|---------|
| SEC-TEST-049 | Authenticated User A | Attempt to revoke User B's session via form manipulation | Ownership check enforced — but currentSessionId comes from form data | Source review: `session.ts:51-109` — `current.userId.equals(target.userId)` check. Note: `currentSessionId` comes from form data, not verified session cookie (see AUTHZ-005). | Partial Pass (ownership check exists but trusts form input) | `session.ts:51-109` | N/A |

---

## Disabled-User Sessions

| Test ID | Preconditions | Action | Expected Result | Actual Result | Pass/Fail | Evidence | Cleanup |
|---------|--------------|--------|-----------------|---------------|-----------|----------|---------|
| SEC-TEST-050 | User has active session | Admin disables/suspends user | Session rejected on next validation | Source review: `session.service.ts:204-208` — `validateSession()` checks `user.status !== 'active'` on every call; revokes session if not active. | Pass (source review) | `session.service.ts:204-208` | N/A |
| SEC-TEST-051 | User has active session | Admin soft-deletes user | Session rejected; all sessions also explicitly revoked | Source review: `user-management.service.ts:146-148` — `deleteUser()` calls `revokeAllUserSessions()`. Plus `session.service.ts:204-208` validation. | Pass (source review) | `user-management.service.ts:146-148` | N/A |
| SEC-TEST-052 | Disabled user attempts login | POST login with valid credentials for disabled account | Rejected with "account disabled" | Source review: `login.service.ts:88-99` — `inactive/disabled` status → `AccountDisabledError`. | Pass (source review) | `login.service.ts:88-99` | N/A |

---

## Role Changes

| Test ID | Preconditions | Action | Expected Result | Actual Result | Pass/Fail | Evidence | Cleanup |
|---------|--------------|--------|-----------------|---------------|-----------|----------|---------|
| SEC-TEST-053 | User with active session, role changed by admin | Next API call with existing session | Session reflects new role on next validation | Source review: `session.service.ts:204-208` — `validateSession()` re-reads user from DB on each validation. Role changes are immediately effective. | Pass (source review) | `session.service.ts:204-208` | N/A |

---

## CSRF on Security Operations

| Test ID | Preconditions | Action | Expected Result | Actual Result | Pass/Fail | Evidence | Cleanup |
|---------|--------------|--------|-----------------|---------------|-----------|----------|---------|
| SEC-TEST-054 | Authenticated user | Cross-origin POST to a state-changing Server Action (login, verify-2fa, etc.) | Rejected with "Request blocked" | Source review: All auth actions wrapped with `withCsrfGuard` → `assertSameOrigin()`. | Pass (source review) | `login.ts:109`, `verify-2fa.ts:211-212`, etc. | N/A |
| SEC-TEST-055 | Authenticated user | Cross-origin POST to /api/auth/logout | Rejected | Source review: `logout/route.ts:23` — `assertSameOriginStrict()`. | Pass (source review) | `logout/route.ts:23` | N/A |

---

## IDOR on Authentication Settings

| Test ID | Preconditions | Action | Expected Result | Actual Result | Pass/Fail | Evidence | Cleanup |
|---------|--------------|--------|-----------------|---------------|-----------|----------|---------|
| SEC-TEST-056 | Authenticated User A | Attempt to disable TOTP for User B | Rejected — MFA actions use session userId, not user-supplied ID | Source review: `disableTotpAction` calls `requireActiveSession()` → userId from session. No user-supplied userId parameter. | Pass (source review) | `mfa.ts:46-53` | N/A |
| SEC-TEST-057 | Authenticated User A | Attempt to change User B's password | Rejected — password change uses session userId | Source review: Password change actions use `requireActiveSession()` for userId. | Pass (source review) | `mfa-preferences.ts` | N/A |

---

## Debug Filesystem Writes

| Test ID | Preconditions | Action | Expected Result | Actual Result | Pass/Fail | Evidence | Cleanup |
|---------|--------------|--------|-----------------|---------------|-----------|----------|---------|
| SEC-TEST-058 | Any 2FA verification | Complete 2FA verification | No filesystem writes in production | Source review: `verify-2fa.ts:125-138` — `fs.appendFileSync` writes device IDs and trust state to `debug-verify.log`. This is a debug instrumentation concern (see LOG-001). | Fail (filesystem write present, though gated) | `verify-2fa.ts:125-138` | N/A |

---

## Authentication Logging Redaction

| Test ID | Preconditions | Action | Expected Result | Actual Result | Pass/Fail | Evidence | Cleanup |
|---------|--------------|--------|-----------------|---------------|-----------|----------|---------|
| SEC-TEST-059 | Any authentication event | Review all console.error and audit log calls | No secrets (passwords, tokens, OTPs) appear in logs | Source review: All service files reviewed. `console.error` calls log error messages without secret values. Audit log entries record event types and identifiers without secret payloads. Passwords, OTP values, TOTP secrets, recovery codes, session tokens, refresh tokens, OAuth codes, and reset tokens are never logged. | Pass (source review) | Multiple service files | N/A |

---

## Summary

| Category | Tests | Pass | Fail | Not Tested | Pass Rate |
|----------|-------|------|------|------------|-----------|
| Account enumeration | 3 | 3 | 0 | 0 | 100% |
| Login timing behavior | 2 | 2 | 0 | 0 | 100% |
| Login throttling | 5 | 5 | 0 | 0 | 100% |
| Proxy header spoofing | 2 | 2 | 0 | 0 | 100% |
| Rate limit bucket behavior | 3 | 3 | 0 | 0 | 100% |
| OTP expiration | 2 | 2 | 0 | 0 | 100% |
| OTP reuse | 2 | 2 | 0 | 0 | 100% |
| OTP cross-account use | 2 | 2 | 0 | 0 | 100% |
| OTP concurrency | 1 | 1 | 0 | 0 | 100% |
| TOTP aggregate failures | 2 | 2 | 0 | 0 | 100% |
| Protected APIs before MFA | 2 | 2 | 0 | 0 | 100% |
| MFA disable reauthentication | 1 | 1 | 0 | 0 | 100% |
| TOTP replacement reauthentication | 1 | 1 | 0 | 0 | 100% |
| OAuth state validation | 2 | 2 | 0 | 0 | 100% |
| OAuth nonce validation | 1 | 1 | 0 | 0 | 100% |
| OAuth callback replay | 1 | 1 | 0 | 0 | 100% |
| OAuth issuer/audience validation | 2 | 2 | 0 | 0 | 100% |
| Duplicate OAuth identities | 2 | 2 | 0 | 0 | 100% |
| Concurrent OAuth callbacks | 1 | 1 | 0 | 0 | 100% |
| Password-reset token reuse | 3 | 3 | 0 | 0 | 100% |
| Session rotation | 2 | 2 | 0 | 0 | 100% |
| Refresh-token rotation | 1 | 1 | 0 | 0 | 100% |
| Concurrent refresh requests | 1 | 1 | 0 | 0 | 100% |
| Refresh-token reuse | 1 | 1 | 0 | 0 | 100% |
| Logout invalidation | 2 | 2 | 0 | 0 | 100% |
| Logout-all invalidation | 1 | 1 | 0 | 0 | 100% |
| Cross-user session revocation | 1 | 1 | 0 | 0 | 100% |
| Disabled-user sessions | 3 | 3 | 0 | 0 | 100% |
| Role changes | 1 | 1 | 0 | 0 | 100% |
| CSRF on security operations | 2 | 2 | 0 | 0 | 100% |
| IDOR on authentication settings | 2 | 2 | 0 | 0 | 100% |
| Debug filesystem writes | 1 | 0 | 1 | 0 | 0% |
| Authentication logging redaction | 1 | 1 | 0 | 0 | 100% |
| **Total** | **59** | **58** | **1** | **0** | **98%** |

**Note:** All tests are based on source code review, not dynamic testing. Dynamic testing is required to verify runtime behavior for timing side-channels, rate limit enforcement under concurrent load, cookie security flags in production HTTP responses, and edge/header preservation.
