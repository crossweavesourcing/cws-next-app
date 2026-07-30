# 10 — MFA Recovery, Bypass, and Trusted Device Security Audit

**Scope**: `disableTotpAction`, `recovery-codes` actions, `device` actions, `PasswordService.resetPassword()`, `OAuthService` Google flow, `SessionService`, and all mandatory bypass code paths.

**Date**: 2026-07-27
**Auditor**: Automated security review

---

## Part A: MFA Lifecycle Security

### A-1. 2FA Disable Requires Recent Authentication

| Aspect | Finding |
|--------|---------|
| Action | `disableTotpAction` |
| Auth check | `requireActiveSession()` — requires a valid session |
| Reauthentication | **NOT required** — no password or TOTP re-entry |
| Risk | If an attacker holds a valid session (e.g., via session cookie theft from a trusted device), they can silently disable TOTP. |
| Verdict | **Medium severity** — disabling 2FA should require password re-entry or current TOTP verification. |

**Finding ID**: MFA-BYPASS-001
**Severity**: Medium
**Confidence**: High
**Production blocker**: No (but recommended)
**Evidence**: `mfa.ts:46-53`
**Attack scenario**: Attacker steals a session cookie from a trusted device (via XSS on a shared computer, physical access, or browser sync). Attacker calls `disableTotpAction`. The session is valid, so TOTP is disabled. Attacker then performs actions without 2FA.
**Impact**: Complete 2FA removal without re-proving identity. Future logins skip MFA.
**Root cause**: `disableTotpAction` only requires `requireActiveSession()`, which is a session validity check, not a reauthentication check.
**Remediation**: Require password re-entry (verify against `user.password.hash`) before disabling TOTP. Alternatively, require a valid TOTP code from the current authenticator.
**Acceptance criteria**: `disableTotpAction` rejects the request if the user cannot prove current password or TOTP possession.
**Regression tests**: Verify disable fails without password; verify disable succeeds with correct password.

---

### A-2. TOTP Replacement Without Confirming Existing Factor

| Aspect | Finding |
|--------|---------|
| Enrollment flow | `generateTotpSecretAction` → `verifyAndEnableTotpAction` |
| Auth check | `requireActiveSession()` for both steps |
| Existing TOTP check | **NOT required** — a user can generate a new secret without verifying the old one |
| Secret replacement | `saveTotpSecret()` uses `updateOne({userId}, {$set: {secret}}, {upsert: true})` — silently replaces |
| Risk | An attacker with a valid session can replace the victim's TOTP secret with their own, then disable TOTP using the new secret. |
| Verdict | **Medium severity** — replacing an existing TOTP should require verification of the current factor. |

**Finding ID**: MFA-BYPASS-002
**Severity**: Medium
**Confidence**: High
**Production blocker**: No (but recommended)
**Evidence**: `mfa.service.ts:78-95`, `mfa.ts:19-29,33-42`
**Attack scenario**: Attacker holds a valid session. Calls `generateTotpSecretAction` to get a new secret, sets it up in their own authenticator app, then calls `verifyAndEnableTotpAction` with a code from their app. The victim's TOTP is now replaced with the attacker's TOTP.
**Impact**: Attacker gains control of the second factor; victim's legitimate authenticator no longer works.
**Root cause**: No check for existing TOTP status or requirement to verify the current TOTP before replacement.
**Remediation**: When a user already has `totpEnabled: true`, require them to verify a code from their CURRENT authenticator before generating and confirming a new secret.
**Acceptance criteria**: If `user.security.totpEnabled === true`, `generateTotpSecretAction` or `verifyAndEnableTotpAction` requires current TOTP verification.
**Regression tests**: Verify new enrollment works when no TOTP exists; verify replacement requires current TOTP verification.

---

### A-3. CSRF Cannot Disable 2FA

| Aspect | Finding |
|--------|---------|
| `disableTotpAction` | Wrapped with `withCsrfGuard` ✅ |
| `generateTotpSecretAction` | Wrapped with `withCsrfGuard` ✅ |
| `verifyAndEnableTotpAction` | Wrapped with `withCsrfGuard` ✅ |
| `generateRecoveryCodesAction` | Wrapped with `withCsrfGuard` ✅ |
| Verdict | **Good** — all state-changing MFA actions have CSRF protection. |

---

### A-4. IDOR on MFA Settings

| Aspect | Finding |
|--------|---------|
| User ID source | Always from `requireActiveSession()` → session.userId |
| No user-supplied userId | MFA actions do NOT accept a userId parameter |
| Verdict | **Good** — no IDOR risk on MFA operations. |

---

### A-5. Password Reset Does Not Bypass 2FA

| Aspect | Finding |
|--------|---------|
| `PasswordService.resetPassword()` | Changes password, revokes all sessions, invalidates `password_reset` tokens |
| TOTP settings modified? | **No** — `totpEnabled`, `mfaEnabled` are not touched |
| Recovery codes modified? | **No** |
| Session revocation | Yes — all sessions except current are revoked |
| Post-reset login | 2FA is still enabled; user must complete MFA on next login |
| Verdict | **Good** — password reset does not weaken 2FA. |

**Evidence**: `password.service.ts:162-233`

---

### A-6. Recovery Code Generation — Entropy

| Aspect | Finding |
|--------|---------|
| Code count | 10 codes (`RECOVERY_CODE_COUNT = 10`) |
| Entropy per code | 16 bytes = 128 bits (`RECOVERY_CODE_BYTE_LENGTH = 16`) |
| Generation | `crypto.randomBytes(16).toString('hex')` — 32 hex chars per code |
| Total entropy | 128 bits per code — exceeds OWASP minimum |
| Verdict | **Good** — 128-bit entropy per recovery code is excellent. |

**Evidence**: `recovery-code.repository.ts:7-10,36`

---

### A-7. Recovery Code Storage — Hashed?

| Aspect | Finding |
|--------|---------|
| Stored value | SHA-256 hash (`codeHash: hashToken(raw)`) |
| Plaintext in DB | Never |
| Verdict | **Good**. |

**Evidence**: `recovery-code.repository.ts:41`

---

### A-8. Recovery Code Single-Use

| Aspect | Finding |
|--------|---------|
| Redemption | Atomic `updateOne({userId, codeHash, used: false}, {$set: {used: true}})` |
| Race condition | Atomic — only one concurrent redemption succeeds |
| Verdict | **Good**. |

**Evidence**: `recovery-code.repository.ts:57-65`

---

### A-9. Recovery Code Rate Limiting

| Aspect | Finding |
|--------|---------|
| Dedicated rate limit | **None** — recovery codes are verified through `TwoFactorService.verify()` |
| `TwoFactorService.verify()` rate limit | 5 failures in 15 min → code invalidated, pending auth lockout |
| Combined protection | Up to 5 recovery code attempts per pending auth, then locked |
| Verdict | **Adequate** — the 5-attempt pending auth limit applies to recovery codes too. |

---

### A-10. Recovery Code Regeneration Invalidation

| Aspect | Finding |
|--------|---------|
| On regenerate | `coll.deleteMany({ userId })` — deletes ALL prior codes |
| Then inserts | Fresh 10 codes |
| Old codes | Immediately invalid |
| Verdict | **Good** — regeneration is atomic and complete. |

**Evidence**: `recovery-code.repository.ts:29,48`

---

## Part B: Trusted Device Security

### B-1. Trusted Device Token Security

| Aspect | Finding |
|--------|---------|
| Token format | `<devices._id>.<HMAC-SHA256>` (optional `.nonce`) |
| Signing key | `SESSION_SECRET` |
| Verification | `timingSafeEqual` for comparison |
| Forgery prevention | Client cannot choose or forge a valid device record ID |
| Verdict | **Good** — HMAC-signed, timing-safe, cryptographically bound. |

**Evidence**: `device.ts:125-154`

---

### B-2. Trusted Device Revocation

| Aspect | Finding |
|--------|---------|
| Untrust | `setTrusted(deviceId, userId, false, 'user')` — clears `trusted` flag |
| Block | `setBlocked()` — sets `blocked: true`, revokes active sessions + refresh families |
| Audit | Both actions are audit-logged |
| Verdict | **Good** — blocking is effective and immediate (FIX-13). |

**Evidence**: `device.ts:272-348`, `device.action.ts:30-63,71-114`

---

### B-3. Trusted Device Expiry

| Aspect | Finding |
|--------|---------|
| `trustedUntil` field | Always set to `null` on trust grant (`device.repository.ts:285`) |
| Maximum trust duration | **None** — devices remain trusted indefinitely |
| Risk | A lost/stolen device that was once trusted remains trusted until manually untrusted |
| Verdict | **Low severity** — consider adding a maximum trust duration (e.g., 90 days) with re-verification. |

**Finding ID**: MFA-BYPASS-003
**Severity**: Low
**Confidence**: High
**Production blocker**: No
**Evidence**: `device.repository.ts:285`
**Attack scenario**: User trusts a device at a conference. The device is later lost or the laptop is sold. The device remains trusted indefinitely.
**Impact**: Attacker with physical access to the device can skip MFA on future logins.
**Root cause**: `trustedUntil` is always `null`; no expiry logic exists.
**Remediation**: Set `trustedUntil` to a reasonable expiry (e.g., 90 days from grant). Check expiry in the 2FA step-up decision.
**Acceptance criteria**: Trusted devices automatically untrust after the configured duration.

---

## Part C: Mandatory Bypass Checks

### C-1. Can User Access Protected APIs After Only First Factor?

| Aspect | Finding |
|--------|---------|
| MFA-required path | Login returns `mfa_required`; only a `cws_2fa_pending` cookie is set (not a session) |
| Pending cookie grants access? | **No** — `requireActiveSession()` reads the `cws_session` cookie, NOT the pending cookie |
| Protected API calls | All require `requireActiveSession()` or `requireRole()` |
| Verdict | **PASS** — no access to protected APIs without completing 2FA. |

---

### C-2. Can User Modify Client-Side MFA-Complete Value?

| Aspect | Finding |
|--------|---------|
| MFA completion | Server-side: `PendingAuthenticationRepository.consume()` atomically consumes the pending auth |
| Session issuance | Only happens AFTER server-side verification succeeds |
| Client manipulation | The client never decides whether MFA is complete — the server does |
| Verdict | **PASS** — no client-side bypass possible. |

---

### C-3. Can Pre-2FA Session Be Reused?

| Aspect | Finding |
|--------|---------|
| Pre-2FA session | Does not exist — no session is created during the pending 2FA state |
| `cws_2fa_pending` cookie | Not a session cookie; does not pass `validateSession()` checks |
| Verdict | **PASS** — no pre-2FA session to reuse. |

---

### C-4. Can OTP Be Reused?

| Aspect | Finding |
|--------|---------|
| Redemption | Atomic `findOneAndUpdate` setting `used: true` |
| Second attempt | Returns null (token already used) |
| Verdict | **PASS** — OTP is strictly single-use. |

---

### C-5. Can OTP from Another User Be Used?

| Aspect | Finding |
|--------|---------|
| Token ownership | `redeemed.userId?.equals(userId)` check in `TwoFactorService.verify()` |
| Cross-user redemption | Would return a different userId → check fails |
| Recovery codes | `redeem(rawCode, expectedUserId)` — scoped to the specific user |
| Verdict | **PASS** — cross-user OTP use is blocked. |

---

### C-6. Can Google Login Bypass Required 2FA?

| Aspect | Finding |
|--------|---------|
| OAuth callback | `OAuthService.handleCallbackInternal()` runs the same risk evaluation |
| `require_2fa` action | Creates pending auth + sends email 2FA code (same as password flow) |
| TOTP for Google | `verify-totp.ts:56` explicitly rejects `passkey`/`google` as primary methods for TOTP login |
| Email 2FA for Google | **Enforced** — Google login with `require_2fa` risk decision requires email 2FA |
| Verdict | **PASS** — Google login cannot bypass 2FA when risk policy requires it. |

**Evidence**: `oauth.service.ts:302-326`, `verify-totp.ts:56-58`

---

### C-7. Can Password Reset Bypass 2FA?

| Aspect | Finding |
|--------|---------|
| `resetPassword()` | Changes password + revokes sessions |
| TOTP modified? | No |
| Post-reset | 2FA still enabled; all sessions revoked |
| New login after reset | Must complete MFA again |
| Password reset itself | Gated by email token (not 2FA) — this is standard and correct |
| Verdict | **PASS** — password reset does not bypass 2FA. |

---

### C-8. Can 2FA Be Disabled Without Reauthentication?

| Aspect | Finding |
|--------|---------|
| `disableTotpAction` | Requires `requireActiveSession()` only |
| Password re-entry? | **No** |
| TOTP re-verification? | **No** |
| Verdict | **FAIL — Medium severity** (see MFA-BYPASS-001 above) |

---

### C-9. Can TOTP Be Replaced Without Confirming Existing Factor?

| Aspect | Finding |
|--------|---------|
| `generateTotpSecretAction` | Requires `requireActiveSession()` only |
| Existing TOTP verified? | **No** |
| `verifyAndEnableTotpAction` | Verifies new code against new secret, not old secret |
| Verdict | **FAIL — Medium severity** (see MFA-BYPASS-002 above) |

---

### C-10. Can Trusted-Device Token Be Reused After Revocation?

| Aspect | Finding |
|--------|---------|
| Device blocked | `blocked: true` on the device record |
| Token still valid HMAC? | Yes — the HMAC signature remains valid |
| Session creation | `SessionService.createSession()` checks `serverDevice?.blocked` → throws |
| Session refresh | `SessionService.rotateRefreshToken()` checks device binding → revokes on mismatch |
| Existing active sessions | Revokeed immediately on block (FIX-13: `revokeSessionsByDeviceId`) |
| Verdict | **PASS** — blocked device cannot create new sessions, and existing sessions are revoked on block. The HMAC-valid-but-blocked token is correctly rejected at session creation time. |

**Evidence**: `session.service.ts:60-75,359-378`, `device.repository.ts:333-348`

---

## Summary of Findings

| Finding ID | Severity | Description | Production Blocker |
|------------|----------|-------------|-------------------|
| MFA-BYPASS-001 | **Medium** | 2FA can be disabled without reauthentication (session-only gate) | No |
| MFA-BYPASS-002 | **Medium** | TOTP can be replaced without confirming the existing factor | No |
| MFA-BYPASS-003 | **Low** | Trusted devices never expire (no maximum trust duration) | No |

---

## Overall Bypass Assessment

### Can MFA be bypassed?

**Partially — yes, in two specific scenarios:**

1. **2FA disable without reauthentication (MFA-BYPASS-001)**: An attacker with a valid session (e.g., stolen cookie from a trusted device) can disable TOTP without providing a password or TOTP code. This effectively bypasses all future 2FA requirements.

2. **TOTP replacement without confirming existing factor (MFA-BYPASS-002)**: An attacker with a valid session can replace the victim's TOTP secret with their own, gaining control of the second factor.

Both require an already-authenticated session, so the attacker must have completed at least one full authentication (including MFA if required) to exploit these. This significantly limits the practical attack surface.

### Is the implementation production-ready?

**Yes, with caveats.** The implementation demonstrates strong defense-in-depth across the vast majority of the MFA lifecycle:

**Strengths:**
- Pending authentication system tightly binds 2FA to login transactions
- Recovery codes use 128-bit entropy, stored as SHA-256 hashes, single-use with atomic redemption
- Trusted device tokens are HMAC-signed with timing-safe verification
- Google OAuth login correctly enforces MFA when risk policy requires it
- Password reset does not weaken 2FA
- Blocked devices have sessions revoked immediately (FIX-13)
- CSRF protection on all state-changing MFA actions
- Comprehensive audit logging

**Required before high-security deployment:**
1. Implement reauthentication for 2FA disable (MFA-BYPASS-001) — **recommended**
2. Implement current-factor verification for TOTP replacement (MFA-BYPASS-002) — **recommended**
3. Add application-layer encryption for stored TOTP secrets (MFA-TOTP-001 from report 09)
4. Add per-user TOTP verification rate limiting (MFA-TOTP-003 from report 09)
