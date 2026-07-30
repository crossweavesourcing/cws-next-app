# 08 — Email-Based 2FA OTP Implementation Audit

| Field | Value |
|---|---|
| Audit date | 2026-07-28 |
| Scope | Email OTP code generation, storage, verification, rate limiting, delivery |
| Standards | OWASP ASVS 2.8 (One-Time Verifier), NIST SP 800-63B §5.1.1 |

## 1. Architecture Overview

The email-based 2FA system issues short-lived, single-use numeric codes to the user's verified email address. It is the **default** second factor when TOTP is not configured, and serves as a fallback when TOTP is unavailable.

### 1.1 Key Components

| Component | File | Purpose |
|---|---|---|
| `TwoFactorService` | `src/auth/services/two-factor.service.ts` | Code generation, verification, delivery |
| `VerificationTokenRepository` | `src/auth/repositories/verification-token.repository.ts` | Token storage and atomic redeem |
| `LoginAttemptRepository` | `src/auth/repositories/login-attempt.repository.ts` | Failure counting |
| `RecoveryCodeRepository` | `src/auth/repositories/recovery-code.repository.ts` | Backup recovery codes |
| `sendMail()` | `src/auth/services/mailer.ts` | Email delivery |

## 2. Code Generation

### 2.1 Entropy Source

`two-factor.service.ts:56-57`:
```typescript
const raw = generateToken(8); // 16 hex chars (entropy source)
const code = formatCode(raw);
```

`generateToken(8)` produces 8 random bytes (16 hex characters) using `crypto.randomBytes` — a CSPRNG source.

### 2.2 Code Derivation

`two-factor.service.ts:147-152` (`formatCode`):
```typescript
function formatCode(raw: string): string {
  const digest = crypto.createHash('sha256').update(raw).digest();
  const numeric = digest.readUInt32BE(0) % 1_000_000;
  return numeric.toString().padStart(CODE_LENGTH, '0');
}
```

The 16-char hex token is SHA-256 hashed, then the first 4 bytes are read as a big-endian unsigned 32-bit integer and taken modulo 1,000,000 to produce a 6-digit code.

**Finding OTP-001: Code derivation is deterministic from the entropy source.**
- **Severity:** Informational
- **Rationale:** This is correct — the SHA-256 step uniformly distributes entropy across the 6-digit space. The modulo bias is negligible (2^32 mod 1,000,000 ≈ 2^32, the rejection rate is <0.025%).

### 2.3 Code Length and Format

- **Length:** 6 numeric digits (padded with leading zeros)
- **Entropy:** log₂(1,000,000) ≈ 19.9 bits
- **Brute force:** At 5 attempts per 15-minute window, an attacker needs ~200,000 windows (~577 days) to exhaust all codes

**Finding OTP-002: 6-digit code provides adequate entropy for email OTP.**
- **Severity:** N/A (pass)
- **Rationale:** OWASP ASVS 2.8.2 recommends at least 6 digits for SMS/email OTP. The 5-attempt rate limit makes brute force infeasible.

## 3. Code Storage

### 3.1 Hashing

The code stored in the database is a SHA-256 hash of the **user-facing 6-digit code** (not the raw entropy source):

```typescript
await this.tokenRepo.create(
  { userId, type: 'two_factor', payload: {} },
  CODE_TTL_MS,
  8,
  code // <-- hash THIS (the emailed 6-digit code), not `raw`
);
```

The `VerificationTokenRepository.create()` hashes the `tokenOverride` (the 6-digit code) before storage:
```typescript
const raw = tokenOverride ?? generateToken(byteLength);
tokenHash: hashToken(raw),  // hashToken = SHA-256
```

**Finding OTP-003: Code is stored as SHA-256 hash.**
- **Severity:** N/A (pass)
- **Note:** The FIX-01 comment at `two-factor.service.ts:54-55` confirms the correct code (the one the user submits) is hashed, not the raw entropy. This ensures `verify()` → `redeem(hashToken(code))` matches.

### 3.2 Per-User Binding

Every verification token has a `userId` field. The `redeem()` method returns the `userId`, and `TwoFactorService.verify()` checks:
```typescript
let ok = redeemed !== null && redeemed.userId?.equals(userId) === true;
```

**Finding OTP-004: Codes are bound to the specific user.**
- **Severity:** N/A (pass)

### 3.3 Per-Purpose Binding

Tokens are typed as `'two_factor'`. The `invalidateAll(userId, 'two_factor')` call before issuing a new code ensures only one active 2FA code exists per user at a time.

### 3.4 TTL

`CODE_TTL_MS = 5 * 60 * 1000` — 5 minutes. The `expiresAt` field on the document and the MongoDB TTL index (`verification-tokens.indexes.ts`) handle both logical expiry and automatic cleanup.

**Finding OTP-005: 5-minute code expiry is appropriate.**
- **Severity:** N/A (pass)
- **Rationale:** NIST SP 800-63B recommends short-lived verifiers. 5 minutes balances usability with security.

## 4. Code Verification

### 4.1 Atomic Single-Use Redeem

`VerificationTokenRepository.redeem()` (`verification-token.repository.ts:49-59`):
```typescript
const result = await coll.findOneAndUpdate(
  { tokenHash, used: false, expiresAt: { $gt: now }, ...(type ? { type } : {}) },
  { $set: { used: true, usedAt: now } },
  { returnDocument: 'after' }
);
```

This is an **atomic** operation: the `findOneAndUpdate` with `used: false` in the filter ensures only one concurrent request can redeem a given code. A second attempt returns `null`.

**Finding OTP-006: Atomic single-use redeem prevents code reuse.**
- **Severity:** N/A (pass)

### 4.2 Previous Code Invalidation

Before issuing a new code, `TwoFactorService.sendCode()` calls:
```typescript
await this.tokenRepo.invalidateAll(userId, 'two_factor');
```

This marks all existing unused 2FA tokens as used, ensuring only the most recent code is valid.

**Finding OTP-007: Previous codes are invalidated on new code issuance.**
- **Severity:** N/A (pass)

## 5. Rate Limiting

### 5.1 Failure Rate Limiting

`TwoFactorService.verify()` records every attempt and checks failures:
```typescript
const recentFailures = await this.attemptRepo.countRecent2FAFailures(
  userId, TWO_FA_FAILURE_WINDOW_MS
);
if (recentFailures >= MAX_2FA_FAILURES) {  // 5 failures
  await this.tokenRepo.invalidateAll(userId, 'two_factor');
}
```

- **Window:** 15 minutes
- **Threshold:** 5 failures
- **Action on limit:** Invalidates current code (must request a new one)

Additionally, the `verify-2fa.ts` action has a **per-pending-auth** attempt limit of 5 (decremented via `pendingRepo.decrementAttempts`). When exhausted, the pending auth cookie is cleared.

**Finding OTP-008: Dual rate limiting — per-user failure window + per-pending-auth attempts.**
- **Severity:** N/A (pass)

### 5.2 Resend Rate Limiting

`verify-2fa.ts` implements two-layer resend throttling:
```typescript
const RESEND_MIN_INTERVAL_MS = 30 * 1000;   // 30 seconds between resends
const RESEND_MAX_PER_WINDOW = 5;             // max 5 resends
const RESEND_WINDOW_MS = 10 * 60 * 1000;     // per 10 minutes
```

Both checks are MongoDB-backed (per-identifier in `login_attempts`), not in-memory, so they survive serverless cold starts.

**Finding OTP-009: Resend throttling prevents email flooding.**
- **Severity:** N/A (pass)

### 5.3 Account Lockout on TOTP Failures

For TOTP-specific verification (`verify-totp.ts:76-83`):
```typescript
const recentFailures = await attemptRepo.countRecentTotpFailures(userId, 15 * 60 * 1000);
if (recentFailures >= 5) {
  await userRepo.lockAccount(userId, new Date(Date.now() + 15 * 60 * 1000));
  ...
}
```

5 TOTP failures within 15 minutes locks the account for 15 minutes. This is stricter than email OTP (which invalidates the code but does not lock the account).

**Finding OTP-010: TOTP failures trigger account lockout; email OTP failures do not.**
- **Severity:** Informational
- **Rationale:** This is a design decision. Email OTP failures invalidate the code but don't lock the account, since the rate is already throttled by code re-issuance. TOTP failures directly lock the account to protect against TOTP code guessing.

## 6. Recovery Code Fallback

### 6.1 Integration

`TwoFactorService.verify()` (`two-factor.service.ts:100-106`):
```typescript
if (!ok) {
  const redeemedRecovery = await this.recoveryRepo.redeem(raw, userId);
  if (redeemedRecovery) {
    ok = true;
    method = 'recovery';
  }
}
```

If the email 2FA code fails, the submitted value is also tested as a recovery code.

### 6.2 Recovery Code Properties

- **Count:** 10 codes per generation (`RECOVERY_CODE_COUNT = 10`)
- **Length:** 16 bytes (128 bits) per code (`RECOVERY_CODE_BYTE_LENGTH = 16`)
- **Storage:** SHA-256 hash only (raw codes shown once to user)
- **Single-use:** Atomic `redeem()` with `used: false` predicate
- **Regeneration:** Deletes all prior codes, generates fresh set

### 6.3 Recovery Code Rate Sharing

Recovery code attempts share the same 2FA failure window. The `record2FAAttempt()` call after a failed verification (including failed recovery code) counts toward the 5-failure limit.

**Finding OTP-011: Recovery codes share the 2FA failure rate limit.**
- **Severity:** N/A (pass)

## 7. Email Delivery

### 7.1 Transport

`src/auth/services/mailer.ts` uses Nodemailer with Gmail SMTP:
```typescript
if (env.EMAIL_USER && env.EMAIL_PASSWORD) {
  transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: { user: env.EMAIL_USER, pass: env.EMAIL_PASSWORD },
  });
}
```

### 7.2 Dev-Mode Fallback

When `EMAIL_USER`/`EMAIL_PASSWORD` are not configured:
```typescript
if (!mailer || !env.EMAIL_FROM) {
  console.info(
    `[mail:dev] to=${message.to} subject=${message.subject}\n${message.text}`
  );
  return;
}
```

**Finding OTP-012 [KEY CONCERN]: Dev-mode mailer logs full email content including 2FA codes and reset links to stdout.**
- **Severity:** Medium (dev-only)
- **Rationale:** The dev fallback at `mailer.ts:52-54` logs the entire `message.text` to `console.info`, which includes 2FA codes and password reset links. This is gated by the absence of `EMAIL_USER`/`EMAIL_PASSWORD` environment variables, so it should never execute in production with email configured.
- **Risk:** If production accidentally runs without email env vars, all 2FA codes and reset links would be logged to stdout/container logs.
- **Mitigation:** The `validateSecurityConfig()` in `env.ts` requires `EMAIL_PASSWORD` when `EMAIL_USER` is set, but does NOT require `EMAIL_USER` itself in production. A misconfigured production environment without email would silently log sensitive codes.
- **Recommendation:** Add a production guard that prevents the console fallback when `NODE_ENV === 'production'`. Fail-closed: if email is not configured in production, throw rather than log.

### 7.3 Email Content

The 2FA email contains:
```
Your verification code is: <6-digit code>

This code expires in 5 minutes. If you did not attempt to sign in, secure your account.
```

The password reset email contains:
```
A password reset was requested.

Reset your password (valid 30 minutes):
<APP_URL>/dashboard/reset-password?token=<raw-token>

If you did not request this, you can ignore this email.
```

### 7.4 Delivery Failure Handling

Email send failures are logged but **never thrown** — they cannot block login or password reset. This is a deliberate design: the code is already issued, and email delivery failure should not prevent authentication. However, this means a user who doesn't receive the email cannot complete 2FA.

**Finding OTP-013: Email delivery failure does not block authentication.**
- **Severity:** Low
- **Rationale:** Deliberate design, but a user with a broken email delivery path has no way to complete 2FA except recovery codes. Ensure the UI provides clear guidance.

## 8. Limitations of Email OTP as a Second Factor

### 8.1 Known Limitations

| Limitation | Impact | Mitigation |
|---|---|---|
| Email account compromise | Attacker intercepts OTP codes | Recovery codes; TOTP as alternative |
| Email transport interception | MITM on SMTP | TLS on SMTP (not verified) |
| Phishing susceptibility | User can be tricked into sharing code | Security training; TOTP as phishing-resistant alternative |
| SIM swap (N/A) | Not applicable — email only, no SMS | N/A |
| Shared email access | Multiple users with email access | Per-user code binding |

### 8.2 Comparison with TOTP

| Property | Email OTP | TOTP |
|---|---|---|
| Phishing resistance | Low | Medium |
| Offline capable | No (requires email delivery) | Yes |
| Secret storage | Server only | User's authenticator app |
| Replay prevention | Single-use code | Time-step + afterTimeStep |
| Recovery | Recovery codes | Recovery codes |

**Finding OTP-014: Email OTP is acceptable as a second factor for an internal admin tool, but TOTP should be encouraged as the primary MFA method.**
- **Severity:** Informational
- **Rationale:** For an internal application with a small, known user base, email OTP is acceptable. The risk engine already supports `require_strong_2fa` which can mandate TOTP for high-risk scenarios.

## 9. Summary of Findings

| ID | Finding | Severity | Status |
|---|---|---|---|
| OTP-001 | Code derivation uses SHA-256 for uniform distribution | N/A | Pass |
| OTP-002 | 6-digit code provides adequate entropy for email OTP | N/A | Pass |
| OTP-003 | Code stored as SHA-256 hash (FIX-01 verified) | N/A | Pass |
| OTP-004 | Codes are bound to specific user | N/A | Pass |
| OTP-005 | 5-minute code expiry is appropriate | N/A | Pass |
| OTP-006 | Atomic single-use redeem prevents reuse | N/A | Pass |
| OTP-007 | Previous codes invalidated on new issuance | N/A | Pass |
| OTP-008 | Dual rate limiting (failure window + pending auth) | N/A | Pass |
| OTP-009 | Resend throttling prevents email flooding | N/A | Pass |
| OTP-010 | TOTP failures trigger lockout; email OTP does not | Informational | By design |
| OTP-011 | Recovery codes share 2FA failure rate limit | N/A | Pass |
| OTP-012 | Dev-mode mailer logs 2FA codes to stdout | Medium | See recommendation |
| OTP-013 | Email delivery failure does not block auth | Low | By design |
| OTP-014 | Email OTP acceptable for internal tool; TOTP preferred | Informational | Advisory |

## 10. Recommendations

1. **[OTP-012]** Add a production guard in `mailer.ts` that throws (not logs) when `NODE_ENV === 'production'` and no email transport is configured. This prevents silent logging of 2FA codes in misconfigured production environments.
2. **Encourage TOTP enrollment** by surfacing TOTP setup prompts in the security dashboard when only email 2FA is configured.
3. **Consider adding IP logging** to 2FA verification audit events for forensic analysis.
4. **Monitor for email delivery failures** at the alerting layer — a spike in email failures may indicate SMTP issues or account compromise.
