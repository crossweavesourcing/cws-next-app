# 09 — TOTP Authenticator App (2FA) Security Audit

**Scope**: `MfaService` (TOTP methods), `MfaRepository`, `verify-totp` action, and the `otplib` integration.

**Date**: 2026-07-27
**Auditor**: Automated security review

---

## 1. TOTP Secret Generation — Entropy & Uniqueness

| Aspect | Finding |
|--------|---------|
| Library | `otplib` (`TOTP.generateSecret()`) |
| Default secret length | 20 bytes (160 bits) per otplib defaults |
| RNG source | Delegated to `NobleCryptoPlugin` / Node.js `crypto` |
| Uniqueness | Per-user; no collision check needed at 160-bit entropy |
| Verdict | **Good** — 160 bits far exceeds RFC 6238 minimum requirements. |

**Evidence**: `mfa.service.ts:79`

---

## 2. Secret Storage — Encryption at Rest

| Aspect | Finding |
|--------|---------|
| Storage location | `totp_credentials.secret` field |
| Format | **Plaintext** Base32-encoded secret |
| Encryption at rest | **NOT encrypted** — raw secret stored directly in MongoDB |
| Access control | MongoDB collection access is application-only |
| Verdict | **Medium severity** — if the database is compromised (backup leak, injection, insider), all TOTP secrets are exposed in cleartext. |

**Finding ID**: MFA-TOTP-001
**Severity**: Medium
**Confidence**: High
**Production blocker**: No (but recommended before handling high-value data)
**Evidence**: `mfa.repository.ts:6-26`
**Attack scenario**: An attacker with read access to the `totp_credentials` collection (DB leak, backup exposure, MongoDB injection via a separate vulnerability) can extract all users' TOTP secrets and generate valid codes.
**Impact**: Complete 2FA bypass for all TOTP-enrolled users. Attacker can generate valid TOTP tokens indefinitely.
**Root cause**: The secret is stored as-is without encryption at the application layer.
**Remediation**: Encrypt the TOTP secret at the application layer before storage (e.g., AES-256-GCM with a per-environment encryption key derived from a KMS). Decrypt only at verification time. Alternatively, use MongoDB Client-Side Field Level Encryption (CSFLE).
**Acceptance criteria**: TOTP secrets in `totp_credentials.secret` are unreadable without the encryption key; `verifyTotpLogin` decrypts before verification.
**Regression tests**: Verify `verifyTotpLogin` works with encrypted secrets; verify a DB dump does not reveal plaintext secrets.

---

## 3. QR Code Response Caching Headers

| Aspect | Finding |
|--------|---------|
| QR code delivery | The `otpauth://` URL is returned as a JSON field in the Server Action response |
| Client-side rendering | The client generates the QR code image from the URL |
| Caching headers | N/A — the URL is returned in a Server Action response, not an HTTP endpoint |
| Risk | The `otpauth://` URL contains the secret in plaintext. If the response is cached by a CDN, proxy, or browser extension, the secret could be exposed. |
| Verdict | **Low risk** — Server Actions use POST, which is not cached by default. Browser back-forward cache may hold it temporarily. |

**Finding ID**: MFA-TOTP-002
**Severity**: Low
**Confidence**: Medium
**Production blocker**: No
**Evidence**: `mfa.service.ts:80`
**Remediation**: Consider returning the `otpauth://` URL through a short-lived, one-time-use endpoint instead of the Server Action response, or advise the client to clear the response from memory after QR generation.

---

## 4. Enrollment Requiring Recent Authentication

| Aspect | Finding |
|--------|---------|
| `generateTotpSecretAction` | Calls `requireActiveSession()` — requires a valid, non-expired session |
| Session freshness | Sessions have a 15-min access TTL + 30-min idle timeout |
| `verifyAndEnableTotpAction` | Also calls `requireActiveSession()` |
| Verdict | **Good** — TOTP enrollment requires an authenticated session. |

**Evidence**: `mfa.ts:20,34`

---

## 5. TOTP Not Enabled Before Confirmation

| Aspect | Finding |
|--------|---------|
| Step 1 | `generateTotpSecret()` returns secret + URL; does NOT set `totpEnabled` |
| Step 2 | `verifyAndEnableTotp()` verifies a code against the secret, THEN sets `totpEnabled: true` and `mfaEnabled: true` |
| Failure | If verification fails, `totpEnabled` remains `false` |
| Verdict | **Good** — TOTP is only enabled after successful first-code verification. |

**Evidence**: `mfa.service.ts:78-95`

---

## 6. Unconfirmed Secret Expiration

| Aspect | Finding |
|--------|---------|
| Mechanism | After `generateTotpSecret()`, the secret is NOT persisted to the DB |
| Storage | The secret is returned to the client in the action response only |
| `verifyAndEnableTotp` | Receives the secret as a parameter and passes it to `saveTotpSecret` |
| Unconfirmed secrets | If the user never calls `verifyAndEnableTotp`, no DB record exists |
| Verdict | **Good** — unconfirmed secrets are never stored, so there's nothing to expire. |

**Evidence**: `mfa.service.ts:78-81` — `generateTotpSecret` returns `{secret, otpauthUrl}` without writing to DB.

---

## 7. RFC 6238 Compliance

| RFC 6238 Requirement | Implementation | Status |
|----------------------|---------------|--------|
| HMAC-based OTP | otplib uses `NobleCryptoPlugin` (noble-hashes) | ✅ |
| 6-digit default | otplib default | ✅ |
| 30-second period | `TOTP_PERIOD_SECONDS = 30` | ✅ |
| SHA-1 default (or configurable) | otplib default (SHA-1 for compatibility) | ✅ |
| Time-step counter | `Math.floor(Date.now() / 1000 / period)` | ✅ |
| Verdict | **Good** — otplib is a well-maintained RFC 6238 implementation. |

---

## 8. Time Window Acceptance

| Aspect | Finding |
|--------|---------|
| otplib default window | ±1 time step (30 seconds before/after current) |
| Custom window | Not configured — uses otplib default |
| `afterTimeStep` | Set to `credential.lastAcceptedTimeStep` for replay prevention |
| Effective window | A code is valid for ~90 seconds (3 time steps: T-1, T, T+1) |
| Verdict | **Good** — standard window provides reasonable clock skew tolerance. |

**Evidence**: `mfa.service.ts:103-107`

---

## 9. Rate Limiting on Verification

| Layer | Mechanism | Limit |
|-------|-----------|-------|
| `PendingAuthentication.attemptsRemaining` | Per login transaction | 5 attempts |
| `LoginAttemptRepository.recordAttempt()` | Audit trail + throttling data | Recorded per attempt |
| `MfaService.verifyTotpLogin()` | **NO built-in rate limiting** | — |
| IP-based rate limiting | `RateLimitService.checkRateLimit()` | Applied at login, NOT at TOTP verification step |

**Finding**: The TOTP verification at `MfaService.verifyTotpLogin()` has no independent rate limit. The only protection is the `PendingAuthentication.attemptsRemaining` counter (5 per login transaction). An attacker who obtains multiple valid pending auth tokens (e.g., via a session fixation attack) could attempt more TOTP codes in aggregate, though each individual pending auth limits to 5 attempts.

**Finding ID**: MFA-TOTP-003
**Severity**: Low
**Confidence**: High
**Production blocker**: No
**Evidence**: `mfa.service.ts:100-113`, `verify-totp.ts:108-114`
**Remediation**: Add a per-user TOTP verification rate limit (e.g., 5 failures per 15-minute window) similar to `TwoFactorService`'s `MAX_2FA_FAILURES`. This would block brute-force even across multiple pending auth sessions.
**Acceptance criteria**: After N failed TOTP attempts within a time window, further attempts are rejected regardless of how many valid pending auth tokens exist.

---

## 10. Failed Attempt Limits

| Limit | Value | Scope |
|-------|-------|-------|
| Pending auth attempts | 5 | Per login transaction |
| Account lockout | NOT triggered by TOTP failures | — |
| TOTP-specific lockout | **None** | — |

**Finding**: Unlike the email OTP path (`TwoFactorService`) which invalidates the code after 5 failures (`MAX_2FA_FAILURES`), the TOTP path has no equivalent lockout. The TOTP secret remains active regardless of how many failed verification attempts occur.

**Finding ID**: MFA-TOTP-004
**Severity**: Low
**Confidence**: High
**Production blocker**: No
**Evidence**: `mfa.service.ts:100-113`
**Remediation**: Implement a per-user TOTP failure counter that temporarily blocks TOTP verification after N failures (e.g., 5 per 15-minute window), mirroring the email OTP behavior. Optionally, log a security alert on lockout.
**Acceptance criteria**: After 5 consecutive TOTP failures within 15 minutes, the user is temporarily blocked from TOTP verification.

---

## 11. Account Binding

| Aspect | Finding |
|--------|---------|
| Storage key | `totp_credentials.userId` (unique index implied by `updateOne({ userId })`) |
| Verification lookup | `getTotpCredential(userId)` — keyed by userId |
| Cross-user protection | Yes — userId comes from the authenticated session |
| Verdict | **Good**. |

**Evidence**: `mfa.repository.ts:6-12,34-37`

---

## 12. Replay Protection

| Aspect | Finding |
|--------|---------|
| Mechanism | `afterTimeStep` parameter in `totp.verify()` |
| Persistence | `lastAcceptedTimeStep` stored in `totp_credentials` |
| Atomicity | `markTotpTimeStepAccepted()` uses conditional `$lt` update — only succeeds if the new time step is strictly greater |
| Effect | Once a time step is accepted, the same code cannot be replayed |
| Edge case | Codes from future time steps (within the acceptance window) can be used, but only the highest time step is recorded |
| Verdict | **Good** — robust replay prevention with atomic DB operations. |

**Evidence**: `mfa.repository.ts:39-58`, `mfa.service.ts:100-113`

---

## 13. Timing-Safe Comparison

| Aspect | Finding |
|--------|---------|
| TOTP verification | Delegated to `otplib`'s `verify()` method |
| otplib internals | Uses constant-time comparison for HMAC and TOTP code comparison |
| Verdict | **Good** — otplib uses timing-safe operations internally. |

---

## 14. Server Clock Synchronization

| Aspect | Finding |
|--------|---------|
| NTP configuration | Not managed by the application |
| Clock drift tolerance | ±1 time step (30 seconds) via otplib default |
| Monitoring | No clock drift detection or alerting |
| Cloud environments | Vercel/AWS/GCP maintain accurate NTP by default |
| Verdict | **Informational** — standard practice. Cloud platforms provide reliable time. |

**Finding ID**: MFA-TOTP-005
**Severity**: Informational
**Confidence**: High
**Production blocker**: No
**Evidence**: `mfa.service.ts:26,103-107`
**Remediation**: Consider logging the server time difference when TOTP verification succeeds (the `result.timeStep` vs `Date.now()`) for operational visibility, but this is not a security concern.

---

## Summary

| Category | Status |
|----------|--------|
| Secret generation | PASS |
| Secret storage | **FINDING** — plaintext at rest (MFA-TOTP-001) |
| QR code caching | Low risk (MFA-TOTP-002) |
| Enrollment auth | PASS |
| Pre-confirmation safety | PASS |
| Unconfirmed expiry | N/A (not stored) |
| RFC 6238 | PASS |
| Time window | PASS |
| Rate limiting | **FINDING** — no per-user TOTP rate limit (MFA-TOTP-003) |
| Failed attempt limits | **FINDING** — no TOTP-specific lockout (MFA-TOTP-004) |
| Account binding | PASS |
| Replay protection | PASS |
| Timing-safe comparison | PASS |
| Clock synchronization | PASS (Informational) |

**Overall**: The TOTP implementation is **functionally correct and follows RFC 6238**. The primary concern is the lack of application-layer encryption for stored TOTP secrets (MFA-TOTP-001) and the absence of a dedicated TOTP verification rate limit (MFA-TOTP-003, MFA-TOTP-004). The pending auth `attemptsRemaining` provides adequate protection for individual login transactions, but a defense-in-depth per-user rate limit would strengthen the posture.
