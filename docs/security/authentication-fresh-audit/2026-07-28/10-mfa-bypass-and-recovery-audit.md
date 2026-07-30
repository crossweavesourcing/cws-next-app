# 10 — MFA Bypass Vectors and Recovery Mechanisms Audit

| Field | Value |
|---|---|
| Audit date | 2026-07-28 |
| Scope | MFA bypass analysis, sudo mode, recovery codes, session lifecycle during MFA |
| Standards | OWASP ASVS 2.8, NIST SP 800-63B §4.2, CWE-308 (Use of MFA Bypass) |

## 1. MFA Bypass Vector Analysis

### Vector 1: Direct Protected API Access After Password but Before 2FA

**Attack:** User completes password verification, receives `cws_2fa_pending` cookie, and attempts to access `/dashboard/*` before completing 2FA.

**Analysis:**
- The `cws_2fa_pending` cookie is **not** a session cookie. It does not grant access to protected routes.
- The `proxy.ts` guard checks for `cws_session` (HMAC-signed session cookie). Without it, unauthenticated users are redirected to `/dashboard/login`.
- Sessions are only created **after** MFA verification completes (`verify-2fa.ts:100-106`, `verify-totp.ts:145-151`).

**Result: DENIED.** No session exists until MFA is complete.

### Vector 2: Client-Side MFA-Complete Flag Modification

**Attack:** Attacker modifies client-side state to indicate MFA is complete.

**Analysis:**
- MFA completion is determined server-side by the presence of a valid `cws_session` cookie.
- The `cws_2fa_pending` cookie is HttpOnly (not accessible to JavaScript) and contains an opaque token, not a boolean flag.
- The pending authentication record in MongoDB has a `consumedAt` field that is set atomically on successful verification.

**Result: N/A.** There is no client-side MFA-complete flag. The server controls session issuance.

### Vector 3: Pre-2FA Session Reuse

**Attack:** Attacker reuses a session cookie from a previous login that completed MFA.

**Analysis:**
- Sessions have absolute expiry (`expiresAt`) and idle timeout (`lastActivityAt + IDLE_TIMEOUT_MS`).
- `accountSecurityVersion` check (`session.service.ts:214-221`) invalidates sessions if the security version changes.
- The concurrent session limit (5) prevents accumulation of stale sessions.

**Result: DENIED** within normal session lifetime. Session will eventually expire.

### Vector 4: OTP Code Reuse

**Attack:** Attacker captures a 2FA code and attempts to use it twice.

**Analysis:**
- `VerificationTokenRepository.redeem()` uses atomic `findOneAndUpdate` with `used: false` predicate.
- Only the first concurrent request succeeds; subsequent requests return `null`.
- For TOTP, `markTotpTimeStepAccepted()` uses `$lt` comparison — same time step cannot be accepted twice.

**Result: DENIED.** Atomic single-use redeem prevents code reuse.

### Vector 5: Cross-Account OTP Use

**Attack:** Attacker uses a code issued for User A to complete MFA for User B.

**Analysis:**
- Email 2FA: `redeem()` returns `userId`; `TwoFactorService.verify()` checks `redeemed.userId?.equals(userId)`.
- TOTP: `verifyTotpLogin()` loads the credential by `userId`, so the code is verified against the specific user's secret.
- Pending authentication: `cws_2fa_pending` token is bound to a specific `userId` in `pending_authentications`.

**Result: DENIED.** Codes are per-user bound at multiple layers.

### Vector 6: Password Reset Bypassing 2FA

**Attack:** Attacker triggers password reset for a user with MFA enabled, resets password, and gains access without completing MFA.

**Analysis:**
`PasswordService.resetPassword()` (`password.service.ts:162-233`):
1. Consumes the reset token (single-use, time-limited)
2. Changes the password
3. **Revokes ALL sessions** (`revokeAllUserSessionsExcept(userId, null, 'user')`)
4. Invalidates all `password_reset` tokens

After password reset:
- All existing sessions are revoked → attacker's stolen session is invalidated
- The user must log in again with the new password
- If MFA is required, the risk engine will require 2FA on the new login

**Result: NOT BYPASSED.** Password reset revokes all sessions and forces re-authentication. The risk engine determines if 2FA is needed for the subsequent login.

**Note:** If the attacker only knows the password (not the 2FA code), they cannot complete login because the risk engine evaluates the login and may require 2FA. However, if the risk engine decides `allow` (low risk, no MFA configured), the attacker could log in with just the new password. This is the designed behavior — MFA requirement is risk-engine-driven.

### Vector 7: Google Login Bypassing 2FA

**Attack:** User has MFA configured but logs in via Google, hoping to bypass 2FA.

**Analysis:**
`OAuthService.handleCallbackInternal()` (`oauth.service.ts:288-326`):
1. Risk evaluation runs for Google logins (`primaryAuthenticationMethod: 'google'`)
2. If risk engine decides `require_2fa` or `require_strong_2fa`, a pending auth is created
3. Email 2FA code is sent

The risk engine considers the authentication method, device, IP, and other signals. Google login does **not** automatically bypass MFA — the risk engine is the gatekeeper.

**Result: NOT BYPASSED** when risk engine determines 2FA is needed. However, if the risk engine decides the risk is low (known device, same IP), it may not require 2FA even for users with MFA configured.

**Note:** The `twoFaPreference` setting (`always`, `new_device_only`, `off`) controls when MFA is required. Setting `always` ensures MFA is always required regardless of risk level.

### Vector 8: Trusted Device Token Abuse

**Attack:** Attacker captures the `cws_device_token` and uses it to appear as a trusted device.

**Analysis:**
- The device token is HMAC-signed (`verifyServerDeviceToken` in `device.ts`)
- It contains the `devices._id` (ObjectId) — not user-controllable
- Device trust status is checked in the risk engine (`signals.trustedDeviceStatus`)
- A trusted device may bypass MFA (depending on `twoFaPreference`), but the device token alone does not grant session access

**Result: PARTIALLY MITIGATED.** The HMAC prevents forgery, but if the token is stolen (e.g., via XSS), it could be used to bypass MFA on the risk engine level. The `cws_device_token` is HttpOnly, mitigating XSS theft.

### Vector 9: Disable MFA with Stolen Session

**Attack:** Attacker with a valid session cookie disables MFA for the victim.

**Analysis:**
`disableTotpAction` (`mfa.ts:48-63`):
```typescript
const session = await requireSudoMode();
```

`requireSudoMode()` (`dal.ts:111-131`) requires either:
1. `session.lastFullAuthAt` within 15 minutes, OR
2. A valid `cws_sudo` cookie (set by `verifySudoPasswordAction` after password re-entry)

**Result: PARTIALLY MITIGATED.** If the attacker's stolen session is fresh (within 15 minutes of real login), sudo mode is satisfied and MFA could be disabled. If the session is older, the attacker would need to re-enter the password.

**Finding MFA-BYPASS-001: Fresh sessions satisfy sudo mode without password re-entry.**
- **Severity:** Medium
- **Rationale:** A session that completed MFA within the last 15 minutes has `lastFullAuthAt` set to the login time. An attacker who steals this session (e.g., via network sniffing on HTTP, or XSS) can disable MFA without knowing the password within that 15-minute window.
- **Mitigation:** The `Secure` cookie flag (required in production) and `HttpOnly` prevent most session theft vectors. The 15-minute window is a reasonable balance.

### Vector 10: Replace TOTP with Stolen Session

**Attack:** Attacker with a valid session replaces the victim's TOTP with their own.

**Analysis:**
`verifyAndEnableTotpAction` (`mfa.ts:35-46`):
```typescript
const session = await requireActiveSession();
```

This requires an active session but **not** sudo mode. However:
- The TOTP enrollment requires the attacker to generate a new secret and verify a code from **their own** authenticator app
- The victim's existing TOTP would be replaced
- The attacker would need to complete the enrollment flow within the session lifetime

**Finding MFA-BYPASS-002: TOTP re-enrollment does not require sudo mode.**
- **Severity:** Medium
- **Rationale:** An attacker with a valid session could replace the victim's TOTP by enrolling their own authenticator. The `verifyAndEnableTotpAction` calls `requireActiveSession()` but not `requireSudoMode()`.
- **Mitigation:** The attacker first needs a valid session (requires password + potentially MFA). The `lastAcceptedTimeStep` is reset on re-enrollment, invalidating any previously valid codes.
- **Recommendation:** Consider requiring sudo mode for TOTP re-enrollment when TOTP is already enabled.

### Vector 11: Mobile API Routes Bypass

**Attack:** Attacker uses mobile API routes to bypass web MFA controls.

**Analysis:**
`MobileAuthService` (`mobile-auth.service.ts`) delegates to the same `LoginService` and `MfaService` used by the web flow. The `MobileAuthService.passwordLogin()`:
1. Calls `LoginService.loginWithPassword()` — same risk engine, same MFA check
2. If MFA required, creates a `MobileChallenge` — same code verification logic
3. `completeTotp()` calls `MfaService.verifyTotpLogin()` — same verification
4. `completeEmail()` calls `TwoFactorService.verify()` — same verification

**Result: DENIED.** Mobile API routes use shared business logic. The same MFA controls apply.

## 2. Sudo Mode Analysis

### 2.1 What Sudo Mode Checks

`requireSudoMode()` (`dal.ts:111-131`):

```typescript
export async function requireSudoMode(maxAgeMinutes = 15): Promise<SessionDocument> {
  const session = await requireActiveSession();
  const maxAgeMs = maxAgeMinutes * 60 * 1000;
  
  // 1. Check if the original session is fresh enough
  if (Date.now() - session.lastFullAuthAt.getTime() < maxAgeMs) {
    return session;
  }

  // 2. Check for a valid sudo cookie
  const cookieStore = await cookies();
  const sudoCookie = cookieStore.get('cws_sudo');
  if (sudoCookie?.value) {
    const verifiedId = verifySessionSignature(sudoCookie.value, getEnv().SESSION_SECRET);
    if (verifiedId === session._id.toString()) {
      return session;
    }
  }

  throw new SudoRequiredError();
}
```

Two paths satisfy sudo mode:
1. **Fresh session:** `lastFullAuthAt` within the last 15 minutes
2. **Valid sudo cookie:** HMAC-signed with session secret, bound to session ID, 15-minute max age

### 2.2 Can a Stolen Session Satisfy Sudo Mode?

**Yes, if the session is fresh.** A stolen session that was issued within the last 15 minutes has `lastFullAuthAt` set to the login time. The attacker can call sudo-requiring actions without re-entering the password.

**Finding MFA-BYPASS-003: Sudo mode relies on session freshness, not re-authentication.**
- **Severity:** Medium
- **Rationale:** This is a design trade-off. Requiring password re-entry for every sensitive action would be unusable. The 15-minute window limits the exposure. The `Secure` and `HttpOnly` cookie flags mitigate most session theft vectors.

### 2.3 Sudo Cookie Properties

Set by `verifySudoPasswordAction` (`sudo.ts:37-46`):
```typescript
cookieStore.set(SUDO_COOKIE, token, {
  httpOnly: true,
  secure: getEnv().NODE_ENV === 'production',
  sameSite: 'lax',
  path: '/',
  maxAge: 15 * 60, // 15 minutes
});
```

- **HttpOnly:** Not accessible to JavaScript
- **Secure:** HTTPS-only in production
- **SameSite:** Lax (allows top-level navigation)
- **Signed:** HMAC with session secret
- **Bound to session ID:** Verified against `session._id.toString()`

**Finding MFA-BYPASS-004: Sudo cookie is correctly secured.**
- **Severity:** N/A (pass)

## 3. Recovery Mechanisms

### 3.1 Recovery Codes

#### Generation

`RecoveryCodeRepository.generate()` (`recovery-code.repository.ts:25-49`):
- Deletes all prior codes
- Generates 10 new codes
- Each code: 16 random bytes (128 bits) via `generateToken(16)`
- Storage: SHA-256 hash only (raw codes shown once)

#### Entropy

128 bits per code × 10 codes = 1,280 bits total entropy. At 5 attempts per 15-minute window, brute force is infeasible.

**Finding MFA-RECOVER-001: Recovery codes provide 128-bit entropy per code.**
- **Severity:** N/A (pass)

#### Single-Use

`RecoveryCodeRepository.redeem()` (`recovery-code.repository.ts:57-64`):
```typescript
const res = await coll.updateOne(
  { userId: expectedUserId, codeHash, used: false },
  { $set: { used: true, usedAt: new Date() } }
);
return res.matchedCount === 1;
```

Atomic redeem with `used: false` predicate. Only one concurrent request succeeds.

**Finding MFA-RECOVER-002: Recovery codes are atomic single-use.**
- **Severity:** N/A (pass)

#### Regeneration Invalidates All Prior Codes

`RecoveryCodeRepository.generate()` deletes all existing codes before generating new ones. This means:
- Regenerating codes invalidates any unused codes
- The user must save the new codes immediately

**Finding MFA-RECOVER-003: Regeneration invalidates all prior codes.**
- **Severity:** N/A (pass)

#### Rate Sharing

Recovery code attempts are recorded via `TwoFactorService.verify()` → `record2FAAttempt()`. Failed recovery code attempts count toward the 5-failure-per-15-minute limit shared with email OTP.

**Finding MFA-RECOVER-004: Recovery code failures share the 2FA failure rate limit.**
- **Severity:** N/A (pass)

### 3.2 Password Reset as Recovery

If both TOTP and recovery codes are unavailable, the user can request a password reset. After reset:
- All sessions are revoked
- All password reset tokens are invalidated
- The user logs in fresh (risk engine determines MFA requirement)

**Finding MFA-RECOVER-005: Password reset provides a last-resort recovery path.**
- **Severity:** N/A (pass)
- **Note:** The password reset requires email access, which is the same channel as email 2FA. If email is compromised, both 2FA and reset are compromised.

## 4. Session Lifecycle During MFA

### 4.1 Pending Authentication Flow

1. First factor (password/Google/passkey) succeeds
2. Risk engine requires 2FA → `PendingAuthentication` record created
3. `cws_2fa_pending` cookie set (HttpOnly, Strict, 5-minute max age)
4. User redirected to `/dashboard/verify-2fa`
5. User submits code → `pendingRepo.consume()` atomically marks consumed
6. Session created → `cws_session` + `cws_refresh` cookies set
7. `cws_2fa_pending` cookie cleared

### 4.2 Session Not Rotated After 2FA

**Finding MFA-BYPASS-005: Session ID persists from first-factor verification through second-factor completion.**
- **Severity:** Low
- **Rationale:** In the current flow, there is no session created during the first-factor step. The `cws_2fa_pending` cookie is an opaque token, not a session. A new session is only created after MFA completion. The session ID is fresh at creation time.
- **Note:** This is NOT a session fixation vector because no session exists during the MFA step. The pending auth token is a different cookie with different properties.

## 5. Summary of Findings

| ID | Finding | Severity | Status |
|---|---|---|---|
| MFA-BYPASS-001 | Fresh sessions satisfy sudo mode (15min window) | Medium | Design trade-off |
| MFA-BYPASS-002 | TOTP re-enrollment does not require sudo mode | Medium | Recommend fix |
| MFA-BYPASS-003 | Sudo mode relies on session freshness, not re-auth | Medium | Design trade-off |
| MFA-BYPASS-004 | Sudo cookie correctly secured | N/A | Pass |
| MFA-BYPASS-005 | No session fixation during MFA step | N/A | Pass |
| MFA-RECOVER-001 | Recovery codes: 128-bit entropy per code | N/A | Pass |
| MFA-RECOVER-002 | Recovery codes are atomic single-use | N/A | Pass |
| MFA-RECOVER-003 | Regeneration invalidates all prior codes | N/A | Pass |
| MFA-RECOVER-004 | Recovery code failures share 2FA rate limit | N/A | Pass |
| MFA-RECOVER-005 | Password reset as last-resort recovery | N/A | Pass |

## 6. Recommendations

1. **[MFA-BYPASS-002]** Require `requireSudoMode()` for `verifyAndEnableTotpAction` when TOTP is already enabled (re-enrollment). This prevents an attacker with a valid session from replacing the victim's TOTP.
2. **[MFA-BYPASS-001/003]** Consider reducing the sudo mode window from 15 minutes to 5 minutes for high-security operations (MFA disable, TOTP re-enrollment).
3. **Monitor MFA bypass attempts** in the audit log — a spike in `auth.mfa.totp.failed` followed by `auth.mfa.recovery.used` may indicate account compromise.
4. **Consider adding step-up authentication** for MFA management operations when the session is older than 5 minutes, even if sudo mode is satisfied.
