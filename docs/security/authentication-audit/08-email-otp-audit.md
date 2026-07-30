# 08 — Email OTP (2FA Code) Security Audit

**Scope**: `TwoFactorService`, `VerificationTokenRepository`, `verify-2fa` action, `resend-2fa` action, and the `PendingAuthenticationRepository`-backed login-transaction binding.

**Date**: 2026-07-27
**Auditor**: Automated security review

---

## 1. Code Generation — Entropy & Randomness

| Aspect | Finding |
|--------|---------|
| Source | `crypto.randomBytes(8)` → 16 hex chars (64-bit CSRPNG) |
| Derivation | SHA-256 of the hex string → `readUInt32BE(0) % 1_000_000` → 6-digit code |
| Effective entropy | ≈ 20 bits (1M possible values) |
| Verdict | **Acceptable** — 6-digit numeric OTPs are industry standard (NIST SP 800-63B). The SHA-256 derivation distributes uniformly across the 1M code space. |

**Evidence**: `two-factor.service.ts:56-57,147-152`

---

## 2. Code Format & Length

- **Format**: 6-digit numeric, zero-padded (`'000000'`–`'999999'`).
- **Consistent with**: Google Authenticator, Microsoft Authenticator, and banking OTPs.
- **Verdict**: **Good**.

---

## 3. Expiration Time

| Property | Value |
|----------|-------|
| TTL | 5 minutes (`CODE_TTL_MS = 5 * 60 * 1000`) |
| Storage | `expiresAt` field in `verification_tokens` |
| Check | `redeem()` filters `expiresAt: { $gt: now }` |
| Verdict | **Good** — 5 minutes is standard and secure. |

**Evidence**: `two-factor.service.ts:13`, `verification-token.repository.ts:38,53`

---

## 4. Single-Use Enforcement

| Property | Finding |
|----------|---------|
| Mechanism | Atomic `findOneAndUpdate` setting `used: true` |
| Race condition | Atomic — only one caller can redeem a given hash |
| Verdict | **Good** — concurrent verification is safely serialized at the DB level. |

**Evidence**: `verification-token.repository.ts:52-56`

---

## 5. Per-User Binding

| Property | Finding |
|----------|---------|
| Token ownership | `verification_tokens.userId` set at issuance |
| Verification check | `redeemed.userId?.equals(userId) === true` |
| Cross-user protection | Yes — a token issued for user A fails for user B |
| Verdict | **Good**. |

**Evidence**: `two-factor.service.ts:59,96`

---

## 6. Per-Purpose Binding

| Property | Finding |
|----------|---------|
| Token type field | `'two_factor'` set at issuance (`two-factor.service.ts:59`) |
| Redeem call in verify() | `this.tokenRepo.redeem(hashToken(raw))` — **no type filter passed** |
| Risk | Theoretically, a `password_reset` token with the same SHA-256 hash could be redeemed by the OTP verify path. In practice this is cryptographically infeasible (SHA-256 collision). |
| Verdict | **Low risk — Informational**. Passing `type: 'two_factor'` to `redeem()` would be defense-in-depth. |

**Finding ID**: MFA-OTP-001
**Severity**: Informational
**Confidence**: High
**Production blocker**: No
**Evidence**: `two-factor.service.ts:95`, `verification-token.repository.ts:49`

---

## 7. Per-Login-Transaction Binding

| Property | Finding |
|----------|---------|
| Mechanism | `cws_2fa_pending` cookie → opaque token → `pending_authentications.tokenHash` |
| Contains | `userId`, `primaryAuthenticationMethod`, `attemptsRemaining`, `deviceObjectId`, risk metadata |
| Expiry | 15 minutes for password login, 5 minutes for passkey login |
| Consumption | `consume()` atomically sets `consumedAt`, preventing replay |
| Verdict | **Good** — the OTP is tightly bound to a specific login transaction. |

**Evidence**: `verify-2fa.ts:49-61`, `pending-authentication.repository.ts:51-58`, `login.service.ts:168-187`

---

## 8. Storage Security (Hashed?)

| Property | Finding |
|----------|---------|
| Stored value | SHA-256 hash of the 6-digit code |
| Plaintext in DB | Never |
| Hash function | SHA-256 (unkeyed) |
| Verdict | **Good** — tokens are stored as SHA-256 hashes. |

**Evidence**: `verification-token.repository.ts:36-37`

---

## 9. Rate Limiting — Generation

| Layer | Limit | Window |
|-------|-------|--------|
| `sendCode()` 2FA failure check | 5 failures | 15 min |
| Resend: min interval | 1 resend | 30 sec |
| Resend: burst cap | 5 resends | 10 min |
| Storage | MongoDB-backed (survives serverless) | — |

**Verdict**: **Good** — layered rate limiting with both per-attempt throttling and burst caps.

**Evidence**: `two-factor.service.ts:37-43`, `verify-2fa.ts:28-30,173-188`

---

## 10. Rate Limiting — Verification

| Layer | Limit | Source |
|-------|-------|--------|
| `PendingAuthentication.attemptsRemaining` | 5 per login transaction | `pending-authentication.repository.ts:41-48` |
| `TwoFactorService` failure lockout | 5 failures → invalidate code | `two-factor.service.ts:131-137` |
| Combined | Up to 5 attempts per pending auth, AND code invalidated at 5 failures per user | — |

**Verdict**: **Good** — dual-layer enforcement.

---

## 11. Maximum Failed Attempts

- **Pending auth**: 5 attempts per login transaction (`login.service.ts:183`)
- **2FA code level**: 5 failures in 15 min → code invalidated (`two-factor.service.ts:16-17,135`)
- **Account lockout**: NOT triggered by 2FA failures (only password failures lock the account). This is correct — 2FA lockout should not lock the account itself.

**Verdict**: **Good**.

---

## 12. Previous-Code Invalidation

| Property | Finding |
|----------|---------|
| On new code issuance | `tokenRepo.invalidateAll(userId, 'two_factor')` |
| On lockout | Also `invalidateAll` after 5 failures |
| Effect | Only one active code per user at a time |
| Verdict | **Good**. |

**Evidence**: `two-factor.service.ts:51,136`

---

## 13. Concurrent-Use Prevention

- Atomic `findOneAndUpdate` in `redeem()` ensures only one concurrent caller succeeds.
- After redemption, the token is marked `used: true` and subsequent lookups return null.

**Verdict**: **Good**.

---

## 14. Cross-Account-Use Prevention

- `redeem()` returns the document's `userId`, and `verify()` checks `.equals(userId)`.
- Even if a token hash were somehow shared, the userId mismatch blocks it.

**Verdict**: **Good**.

---

## 15. Email Flooding Protection

| Protection | Mechanism |
|------------|-----------|
| Resend throttle | 1 per 30s + 5 per 10 min |
| Code invalidation | New code invalidates prior — attacker can't queue multiple valid codes |
| Audit logging | Every send is logged with IP + UA |

**Verdict**: **Good** — email flooding is effectively mitigated.

---

## 16. OTP Logging Analysis

| Event | Logged? | IP/UA? | Audit action |
|-------|---------|--------|--------------|
| Code sent | Yes | IP=null, UA=null | `auth.mfa.code.sent` |
| Code verified | Yes | IP + UA | `auth.mfa.verified` |
| Recovery code used | Yes | IP + UA | `auth.mfa.recovery.used` |
| Code failed | Yes | IP + UA | `auth.mfa.failed` |
| Attempt recorded | Yes | IP + UA | `login_attempts` collection |

**Finding**: Code-sent audit logs `ipAddress: null` (`two-factor.service.ts:77`). This is because `sendCode()` is called from the login service before the session exists.

**Finding ID**: MFA-OTP-002
**Severity**: Informational
**Confidence**: High
**Production blocker**: No
**Evidence**: `two-factor.service.ts:77`
**Remediation**: Consider passing IP from the caller through `sendCode(userId, {ipAddress, userAgent})` for complete audit trail.

---

## 17. OTP Before First Factor

- The `cws_2fa_pending` cookie is ONLY set after successful first-factor authentication (password/passkey/Google) in `LoginService.loginWithPassword()`, `LoginService.loginWithPasskey()`, and `OAuthService.handleCallback()`.
- The `verify2faAction` reads and validates this cookie before processing the OTP.
- Without a valid pending auth cookie, 2FA verification returns an error.

**Verdict**: **Good** — OTP cannot be used before first factor.

---

## 18. OTP Reuse Between Flows (Login / Email Verification / Password Reset)

| Flow | Token type | Can OTP be reused across flows? |
|------|-----------|-------------------------------|
| Login 2FA | `'two_factor'` | — |
| Password reset | `'password_reset'` | Different type, different hash, different purpose |
| Email verification | (if applicable) | Different type field |

- Tokens are isolated by `userId` + `tokenHash` + `used` flag.
- Even though `redeem()` in `TwoFactorService.verify()` doesn't filter by type, the SHA-256 hash collision resistance makes cross-type reuse cryptographically infeasible.

**Verdict**: **Good** — practical isolation is achieved.

---

## Summary

| Category | Status |
|----------|--------|
| Code generation | PASS |
| Expiration | PASS |
| Single-use | PASS |
| Per-user binding | PASS |
| Per-purpose binding | PASS (Informational: type filter not passed to redeem) |
| Transaction binding | PASS |
| Storage security | PASS |
| Rate limiting | PASS |
| Failed attempt limits | PASS |
| Previous-code invalidation | PASS |
| Concurrent-use prevention | PASS |
| Cross-account-use prevention | PASS |
| Email flooding protection | PASS |
| Logging | PASS (minor: IP not passed in sendCode audit) |
| Pre-first-factor use | PASS |
| Cross-flow reuse | PASS |

**Overall**: The email OTP implementation is **well-designed** with defense-in-depth across all critical areas. Two informational findings (MFA-OTP-001, MFA-OTP-002) are recommended for hardening but are not production blockers.
