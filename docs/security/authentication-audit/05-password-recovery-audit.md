# 05 — Password Recovery Security Audit

**Scope:** Reset token generation, storage, validation; reset request security; reset completion security; password change security  
**Date:** 2026-07-27  
**Auditor:** opencode/big-pickle  
**Files reviewed:**

| File | Purpose |
|------|---------|
| `src/auth/crypto/token.ts` | Token generation, hashing, signing |
| `src/auth/services/password.service.ts` | Password lifecycle (reset, change, history) |
| `src/auth/actions/password-reset.ts` | Reset request + completion Server Actions |
| `src/auth/actions/change-password.ts` | Password change Server Action |
| `src/auth/actions/login.ts` | Login flow (force-change path) |
| `src/auth/repositories/verification-token.repository.ts` | Token CRUD, single-use redemption |
| `src/auth/repositories/login-attempt.repository.ts` | Rate-limit counters |
| `src/auth/repositories/user.repository.ts` | User DB access |
| `src/auth/config/env.ts` | Env schema + production boot guards |

---

## Findings

### RST-001 — Reset Token Entropy Is 64 Bits (Below NIST 128-Bit Minimum)

| Field | Value |
|-------|-------|
| **Severity** | Medium |
| **Confidence** | High |
| **Production Blocker** | No |

**Evidence:** `src/auth/repositories/verification-token.repository.ts:24, 30`

```ts
async create(data, ttlMs, byteLength = 8, tokenOverride?) {
  const raw = tokenOverride ?? generateToken(byteLength); // 8 bytes = 64 bits
```

**Attack scenario:** An attacker who obtains the email containing the reset link (e.g. via email account compromise, shared inbox, or mail server breach) brute-forces the 16-character hex token. With 64 bits of entropy, there are 2^64 ≈ 1.8×10^19 possible tokens. However, the rate limit (RST-005) caps at 10 attempts per 15 minutes per token, making online brute-force infeasible. The risk is offline brute-force if the attacker knows the token format but not the value (e.g. they intercepted the email but the token portion is redacted in logs).

**Impact:** Offline brute-force of the token is theoretically feasible at 2^64 / 2 = 2^63 operations on average. With modern cloud resources (~10^9 SHA-256/sec), this takes ~292 years. The risk is low but non-zero, especially if quantum computing advances reduce SHA-256 security.

**Root cause:** The default `byteLength=8` was chosen for brevity in the URL (16 hex chars) rather than meeting NIST SP 800-63B's ≥128-bit entropy requirement for reset tokens.

**Remediation:** Increase the default `byteLength` for password reset tokens to 16 (128 bits, 32 hex chars). The token is already stored as a SHA-256 hash in the database, so the longer raw token does not increase storage:

```ts
// In password.service.ts requestReset():
await this.tokenRepo.create(
  { userId: user._id, type: 'password_reset', payload: { email } },
  RESET_TTL_MS,
  16  // 128-bit entropy
);
```

**Acceptance criteria:** Password reset tokens have ≥128 bits of entropy (≥16 random bytes). The token in the email/link is ≥32 hex characters.

**Regression tests:**
- Unit test: Verify `generateToken(16)` produces a 32-character hex string.
- Integration test: Request a reset; verify the token in the email is 32 hex characters.
- Statistical test: Generate 10,000 tokens; verify all are unique and have uniform byte distribution.

---

### RST-002 — Reset Token Sent in URL Query String

| Field | Value |
|-------|-------|
| **Severity** | Low |
| **Confidence** | High |
| **Production Blocker** | No |

**Evidence:** `src/auth/services/password.service.ts:265`

```ts
const link = `${env.APP_URL}/dashboard/reset-password?token=${raw}`;
```

**Attack scenario:** The token is embedded in the URL query string. This means it may be logged in:
- Browser history (accessible to anyone with device access)
- Server access logs (if the reverse proxy logs query strings)
- HTTP `Referer` headers (if the reset page loads external resources)
- Proxy logs between the email client and the web app

The 30-minute TTL and single-use nature mitigate the risk, but the token is the sole authentication credential for the reset flow.

**Impact:** An attacker with access to browser history, server logs, or proxy logs can use the token to reset the password within the 30-minute window.

**Root cause:** URL query string is the standard pattern for email-based reset links (Gmail, GitHub, etc. all use this approach). The tradeoff is usability (clickable link) vs. token exposure.

**Remediation:** This is an accepted risk for email-based reset flows. Mitigations already in place:
- Single-use token (redeemed atomically)
- 30-minute TTL
- All existing sessions revoked on reset
- Confirmation email sent to the user

Consider adding a `robots: noindex` meta tag on the reset page to prevent search engine indexing of the token in URL.

**Acceptance criteria:** The reset page includes `robots: noindex` and the token is single-use with a 30-minute TTL.

**Regression tests:**
- Verify the reset page includes `<meta name="robots" content="noindex">`.
- Verify that after a successful reset, the same token cannot be reused.

---

### RST-003 — Reset Token Not Hashed Before Database Lookup in `findValid`

| Field | Value |
|-------|-------|
| **Severity** | Informational |
| **Confidence** | High |
| **Production Blocker** | No |

**Evidence:** `src/auth/actions/password-reset.ts:114`, `src/auth/services/password.service.ts:163`

```ts
// password-reset.ts:114 — throttling by raw token prefix
const submitId = `pwreset:submit:${token.slice(0, 16)}`;

// password.service.ts:163 — hashing before DB lookup
const tokenHash = hashToken(token);
const pending = await this.tokenRepo.findValid(tokenHash, 'password_reset');
```

**Attack scenario:** The `submitId` in the rate-limit counter uses a prefix of the raw token (`token.slice(0, 16)`), not its hash. If an attacker gains read access to the `login_attempts` collection, they can see the raw token prefix for reset submissions. With 64-bit entropy (RST-001), knowing the first 16 hex chars (64 bits) of a 16-char token reveals the entire token.

**Impact:** After RST-001 is fixed (128-bit tokens), the prefix reveals only 64 of 128 bits, which is acceptable. With the current 64-bit tokens, the prefix fully exposes the token.

**Root cause:** The rate-limit identifier is derived from the raw token for simplicity (no need to look up the token hash first). This is a reasonable tradeoff for the rate-limit use case.

**Remediation:** After fixing RST-001 (128-bit tokens), this becomes a non-issue. As an additional hardening step, the `submitId` could use a truncated hash of the token instead of a raw prefix:

```ts
const submitId = `pwreset:submit:${hashToken(token).slice(0, 16)}`;
```

**Acceptance criteria:** The rate-limit identifier does not expose the raw token or a recoverable portion of it.

**Regression tests:**
- Unit test: Verify `submitId` does not contain the raw token.
- Integration test: Verify rate limiting works with the hashed identifier.

---

### RST-004 — Reset Token Redemption Race Condition (TOCTOU)

| Field | Value |
|-------|-------|
| **Severity** | Informational |
| **Confidence** | Medium |
| **Production Blocker** | No |

**Evidence:** `src/auth/services/password.service.ts:163-178`

```ts
// Step1: Read without consuming
const pending = await this.tokenRepo.findValid(tokenHash, 'password_reset');
if (!pending || pending.userId === null) {
  throw new Error('This password reset link is invalid or has expired.');
}

// Step2: Validate password policy (takes ~100-500ms for zxcvbn + history check)
const strength = await this.evaluateNewPassword(userId, newPassword, acceptWeakPassword);

// Step3: Atomically consume the token
const redeemed = await this.tokenRepo.redeem(tokenHash, 'password_reset');
if (!redeemed || redeemed.userId === null || !redeemed.userId.equals(userId)) {
  throw new Error('This password reset link is invalid or has expired.');
}
```

**Attack scenario:** Two concurrent requests with the same token:
1. Request A reads the token (step1), starts password validation (step2).
2. Request B reads the same token (step1), starts password validation (step2).
3. Request A completes validation, redeems the token (step3) — succeeds.
4. Request B completes validation, tries to redeem (step3) — fails (token already used).

The atomic `redeem` (findOneAndUpdate with `used: false` filter) ensures only one request wins. This is correct.

**Impact:** None. The TOCTOU gap exists but is safely handled by the atomic redemption. The code is correct.

**Root cause:** N/A — this is a positive finding demonstrating correct concurrent-safety design.

**Remediation:** No change needed. The current design is correct.

**Acceptance criteria:** The `redeem` operation is atomic and only one concurrent request can succeed.

**Regression tests:**
- Concurrency test: Fire 10 concurrent reset requests with the same token; verify exactly one succeeds and the rest fail with "link is invalid or has expired."

---

### RST-005 — Reset Rate Limiting Is Split Across Two Layers (Action + Service)

| Field | Value |
|-------|-------|
| **Severity** | Low |
| **Confidence** | Medium |
| **Production Blocker** | No |

**Evidence:** `src/auth/actions/password-reset.ts:14-20, 65-80`, `src/auth/services/password.service.ts:242-254`

```ts
// Action layer (password-reset.ts):
const PWRESET_REQUEST_MAX_PER_EMAIL = 5;
const PWRESET_REQUEST_WINDOW_MS = 15 * 60 * 1000;
const PWRESET_REQUEST_MAX_PER_IP = 20;

// Service layer (password.service.ts):
const RESET_MAX_PER_WINDOW = 5;
const RESET_WINDOW_MS = 15 * 60 * 1000;
```

**Attack scenario:** The action layer checks a rate limit and returns early (generic success) if throttled. If the action layer's throttle passes, the service layer performs its own throttle check. This creates two independent counters for the same operation. An attacker could potentially bypass one layer if the other has a bug (e.g. different time windows, different identifiers).

**Impact:** Low. Both layers use the same 5-request/15-minute window and the same email-based identifier. The duplication is defense-in-depth, not a vulnerability. However, the service layer uses `countRecentResetRequests` (identifierType: `PASSWORD_RESET_REQUEST`) while the action layer uses `countRecentByFilter` with a custom identifier format (`pwreset:request:{email}`). These are DIFFERENT identifier formats, so the two layers do NOT share counters.

**Root cause:** The action layer was added later (FIX-07) as a pre-flight throttle, while the service layer had its own throttle. The two layers use different identifier formats.

**Remediation:** Unify the identifier format between the action and service layers so they share the same counter. Alternatively, remove the service-layer throttle if the action-layer throttle is sufficient (the action layer is the outer defense).

**Acceptance criteria:** The action and service layers share the same rate-limit counter for password reset requests, or one layer is removed.

**Regression tests:**
- Integration test: Make 5 reset requests; verify the 6th is throttled by the action layer (returns generic success without calling the service).
- Verify the service-layer throttle is also reached if the action-layer throttle is bypassed (e.g. by calling the service directly).

---

### RST-006 — Reset Completion Rate Limit Uses Raw Token Prefix as Identifier

| Field | Value |
|-------|-------|
| **Severity** | Low |
| **Confidence** | High |
| **Production Blocker** | No |

**Evidence:** `src/auth/actions/password-reset.ts:114`

```ts
const submitId = `pwreset:submit:${token.slice(0, 16)}`;
```

**Attack scenario:** The rate-limit identifier for reset completion is derived from the first 16 characters of the raw token. If an attacker can observe this identifier (e.g. via `login_attempts` collection read access), they recover the first 16 hex chars of the token. With the current 16-char (64-bit) tokens, this fully exposes the token. After RST-001 is fixed (32-char tokens), only half the token is exposed.

**Impact:** Medium with current 64-bit tokens (token fully recoverable from rate-limit logs). Low after RST-001 fix.

**Root cause:** Using the raw token prefix is simpler than hashing it for the rate-limit key, but it leaks token material.

**Remediation:** Hash the token before using it as a rate-limit identifier:

```ts
const submitId = `pwreset:submit:${hashToken(token).slice(0, 16)}`;
```

**Acceptance criteria:** The `submitId` does not contain any portion of the raw token.

**Regression tests:**
- Unit test: Verify `submitId` does not match any prefix of the raw token.
- Integration test: Verify rate limiting still works with the hashed identifier.

---

### RST-007 — Reset Link Does Not Validate Host Header (Host Header Poisoning Mitigated)

| Field | Value |
|-------|-------|
| **Severity** | Informational |
| **Confidence** | High |
| **Production Blocker** | No |

**Evidence:** `src/auth/services/password.service.ts:264-265`

```ts
const env = getEnv();
const link = `${env.APP_URL}/dashboard/reset-password?token=${raw}`;
```

**Attack scenario:** In classic host header poisoning, an attacker sends a password reset request with a forged `Host` header. If the reset link is constructed from the `Host` header, the link points to the attacker's domain, and the victim clicks it, leaking the token to the attacker.

**Impact:** None. The link is constructed from `APP_URL` (a server-side environment variable), not from the request's `Host` header. Host header poisoning is not possible.

**Root cause:** N/A — this is a positive finding.

**Remediation:** No change needed. The current design correctly uses `APP_URL` for link construction.

**Acceptance criteria:** The reset link always uses `APP_URL` and never reads from request headers.

**Regression tests:**
- Unit test: Send a request with a forged `Host` header; verify the reset link still uses `APP_URL`.

---

### RST-008 — All Sessions Revoked on Password Reset (Including Current)

| Field | Value |
|-------|-------|
| **Severity** | Informational |
| **Confidence** | High |
| **Production Blocker** | No |

**Evidence:** `src/auth/services/password.service.ts:205`

```ts
await new SessionRepository().revokeAllUserSessionsExcept(userId, null, 'user');
```

**Attack scenario:** After a password reset, the user has no active sessions (the reset was done via email link, not an authenticated session). Calling `revokeAllUserSessionsExcept(userId, null, 'user')` revokes ALL sessions because there is no "current" session to preserve.

**Impact:** None. This is correct behavior. A password reset should invalidate all sessions to prevent session fixation attacks.

**Root cause:** N/A — this is a positive finding.

**Remediation:** No change needed.

**Acceptance criteria:** All sessions are revoked after a password reset.

**Regression tests:**
- Integration test: Create 3 sessions for a user; perform a password reset; verify all 3 sessions are revoked.

---

### RST-009 — Pending Reset Tokens Invalidated on Password Change

| Field | Value |
|-------|-------|
| **Severity** | Informational |
| **Confidence** | High |
| **Production Blocker** | No |

**Evidence:** `src/auth/services/password.service.ts:150`

```ts
await this.tokenRepo.invalidateAll(userId, 'password_reset');
```

**Attack scenario:** A user requests a password reset, then changes their password through the normal settings flow (while the reset email is still pending). The pending reset token should be invalidated to prevent it from being used after the password has already been changed.

**Impact:** None. The code correctly invalidates all pending reset tokens when the password is changed.

**Root cause:** N/A — this is a positive finding.

**Remediation:** No change needed.

**Acceptance criteria:** Pending reset tokens are invalidated when the password is changed.

**Regression tests:**
- Integration test: Request a reset; change password via settings; verify the reset token is no longer valid.

---

### RST-010 — Password Change Requires Current Password (Reauthentication)

| Field | Value |
|-------|-------|
| **Severity** | Informational |
| **Confidence** | High |
| **Production Blocker** | No |

**Evidence:** `src/auth/services/password.service.ts:110-121`

```ts
const ok = await verifyPassword(user.password.hash, currentPassword);
if (!ok) {
  await this.auditRepo.log({ ... action: 'auth.password.change.failure' ... });
  throw new Error('Current password is incorrect.');
}
```

**Attack scenario:** An attacker who gains access to an authenticated session (e.g. via XSS, session hijacking) attempts to change the password to maintain persistent access. The password change requires the current password, which the attacker does not know.

**Impact:** The current-password requirement prevents an attacker with a stolen session from changing the password (unless the attacker also knows the current password). This is a defense-in-depth measure.

**Root cause:** N/A — this is a positive finding.

**Remediation:** No change needed. The current-password requirement is correctly enforced.

**Acceptance criteria:** The password change action rejects requests without a valid current password.

**Regression tests:**
- Integration test: Attempt password change with wrong current password; verify rejection.
- Integration test: Attempt password change with correct current password; verify success.

---

### RST-011 — Password Change Revokes All Other Sessions

| Field | Value |
|-------|-------|
| **Severity** | Informational |
| **Confidence** | High |
| **Production Blocker** | No |

**Evidence:** `src/auth/services/password.service.ts:144-149`

```ts
await new SessionRepository().revokeAllUserSessionsExcept(
  userId,
  currentSessionId ? new ObjectId(currentSessionId) : null,
  'user'
);
```

**Attack scenario:** An attacker with a stolen session changes the password. All other sessions (including the legitimate user's) are revoked. The legitimate user is logged out and must re-authenticate.

**Impact:** The password change correctly revokes all other sessions. This prevents session fixation and ensures the attacker cannot maintain access through old sessions.

**Root cause:** N/A — this is a positive finding.

**Remediation:** No change needed.

**Acceptance criteria:** All sessions except the current one are revoked on password change.

**Regression tests:**
- Integration test: Create 3 sessions; change password from session 1; verify sessions 2 and 3 are revoked, session 1 remains active.

---

### RST-012 — Password Change Confirmation Email Sent After Reset

| Field | Value |
|-------|-------|
| **Severity** | Informational |
| **Confidence** | High |
| **Production Blocker** | No |

**Evidence:** `src/auth/services/password.service.ts:208-218`

```ts
const confirmEmail = await this.userRepo.findPrimaryEmail(userId);
if (confirmEmail) {
  await sendMail({
    to: confirmEmail,
    subject: 'CWS Admin — Password Changed',
    text: 'Your account password was successfully reset.\n\n' +
          'If this was not you, contact an administrator immediately.',
  }).catch((err) => console.error('reset confirmation email failed:', err));
}
```

**Attack scenario:** After a password reset, the user receives a confirmation email. If the reset was not initiated by the user (e.g. account compromise), the email alerts them to take action.

**Impact:** The confirmation email is a positive security control. It notifies the legitimate user of unauthorized password changes.

**Root cause:** N/A — this is a positive finding.

**Remediation:** No change needed. The confirmation email is correctly sent after a successful reset.

**Acceptance criteria:** A confirmation email is sent to the user after a successful password reset.

**Regression tests:**
- Integration test: Perform a password reset; verify a confirmation email is sent.
- Verify the email contains "If this was not you, contact an administrator immediately."

---

### RST-013 — Force-Change Path Issues Signed Pending Cookie with UserId

| Field | Value |
|-------|-------|
| **Severity** | Low |
| **Confidence** | Medium |
| **Production Blocker** | No |

**Evidence:** `src/auth/actions/login.ts:73-83`

```ts
if (result.status === 'force_change') {
  const pending = signSessionId(result.userId.toString(), env.SESSION_SECRET);
  cookieStore.set('cws_pw_pending', pending, {
    ...sessionCookieOpts(env, { path: '/' }),
    maxAge: 10 * 60, // 10 minutes
  });
  return { redirect: '/dashboard/change-password' };
}
```

**Attack scenario:** The `cws_pw_pending` cookie is HMAC-signed with `SESSION_SECRET` and carries the userId. An attacker who can forge this cookie (requires weak `SESSION_SECRET` — guarded by PWD-011) could impersonate any user and force a password change, potentially locking them out.

**Impact:** Low. The cookie is:
- HMAC-signed (requires `SESSION_SECRET` to forge)
- Short-lived (10 minutes)
- `SameSite=Strict` (not sent cross-origin)
- `Secure` (HTTPS-only in production)
- Cleared after successful use

**Root cause:** The pending cookie is a signed bearer token. Its security depends on `SESSION_SECRET` strength.

**Remediation:** The existing controls are sufficient. Consider adding a `HttpOnly` flag if not already set by `sessionCookieOpts` to prevent JavaScript access.

**Acceptance criteria:** The `cws_pw_pending` cookie is `HttpOnly`, `Secure`, `SameSite=Strict`, and has a 10-minute max-age.

**Regression tests:**
- Unit test: Verify the cookie options include `httpOnly: true`, `secure: true`, `sameSite: 'strict'`.
- Integration test: Verify the cookie is cleared after a successful password change.

---

## Summary

| ID | Finding | Severity | Production Blocker |
|----|---------|----------|-------------------|
| RST-001 | Reset token entropy is 64 bits (below NIST 128-bit minimum) | Medium | No |
| RST-002 | Reset token sent in URL query string | Low | No |
| RST-003 | Reset token prefix exposed in rate-limit identifier | Informational | No |
| RST-004 | Reset token redemption race condition (TOCTOU) — correctly handled | Informational | No |
| RST-005 | Reset rate limiting split across two layers with different identifiers | Low | No |
| RST-006 | Reset completion rate limit uses raw token prefix | Low | No |
| RST-007 | Reset link uses APP_URL (host header poisoning mitigated) | Informational | No |
| RST-008 | All sessions revoked on password reset | Informational | No |
| RST-009 | Pending reset tokens invalidated on password change | Informational | No |
| RST-010 | Password change requires current password | Informational | No |
| RST-011 | Password change revokes all other sessions | Informational | No |
| RST-012 | Password change confirmation email sent after reset | Informational | No |
| RST-013 | Force-change path issues signed pending cookie | Low | No |

**Overall assessment:** The password recovery and change mechanisms are well-designed with strong defense-in-depth. The most significant finding is RST-001 (reset token entropy), which should be addressed to meet NIST guidelines. The rate-limiting architecture (RST-005/006) has some complexity that could be simplified. The positive findings (RST-004, RST-007, RST-008, RST-009, RST-010, RST-011, RST-012) demonstrate a mature security posture with correct atomic operations, host-header poisoning mitigation, and session lifecycle management.
