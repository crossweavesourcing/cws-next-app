# Email/Password Authentication Audit

## Overview

This document details the security audit of email/password authentication in the CWS Next App, covering password hashing, password policy, login security, email normalization, and account lockout.

## Components Audited

| Component | File(s) |
|---|---|
| Password hashing | `src/auth/crypto/password.ts` |
| Password policy | `src/auth/validation/password-policy.ts` |
| Password strength | `src/auth/validation/password-strength.ts` |
| Login service | `src/auth/services/login.service.ts` |
| Password service | `src/auth/services/password.service.ts` |
| Rate limiting | `src/auth/services/rate-limit.service.ts` |
| Login schema | `src/auth/validation/login.schema.ts` |
| Timing constants | `src/auth/crypto/constants.ts` |
| Environment config | `src/auth/config/env.ts` |

---

## Password Hashing

### Implementation

```typescript
// src/auth/crypto/password.ts:8-17
export async function hashPassword(password: string): Promise<string> {
  const env = getEnv();
  return argon2.hash(password, {
    type: argon2.argon2id,
    memoryCost: 65536, // 64 MB
    timeCost: 3,
    parallelism: 1,
    secret: env.ARGON2_SECRET ? Buffer.from(env.ARGON2_SECRET) : undefined,
  });
}
```

### Analysis

| Aspect | Assessment | Evidence |
|---|---|---|
| Algorithm | Argon2id — correct choice (hybrid of Argon2i and Argon2d) | `password.ts:11` |
| Memory cost | 64 MB — acceptable, consider increasing to 128 MB | `password.ts:11` |
| Time cost | 3 iterations — acceptable | `password.ts:12` |
| Parallelism | 1 — acceptable for single-user internal app | `password.ts:13` |
| Pepper | `ARGON2_SECRET` optional in dev, required in production (≥16 chars) | `password.ts:15`, `env.ts:214-223` |
| Timing-safe verify | Yes — Argon2.verify is constant-time by design | `password.ts:26` |
| Error handling | Malformed hash → returns `false` (fail-safe) | `password.ts:29-32` |

### Findings

#### PWD-001: Pepper Not Enforced as Mandatory in Schema

| Field | Value |
|---|---|
| Finding ID | PWD-001 |
| Severity | Low |
| Location | `src/auth/config/env.ts:9` |
| Evidence | `ARGON2_SECRET: z.string().optional()` — optional in schema |
| Description | The `ARGON2_SECRET` pepper is declared as optional in the Zod schema, relying on the `validateSecurityConfig()` function to enforce it in production. While `validateSecurityConfig()` correctly throws in production when the pepper is missing/short, the schema-level optionality means dev environments can run without it, and a code path that bypasses `getEnv()` validation would not catch the missing pepper. |
| Attack Scenario | A developer accidentally imports `process.env` directly instead of using `getEnv()`, bypassing the production validation. Passwords would be hashed without pepper in that path. |
| Impact | If pepper is missing, password hashes are vulnerable to offline cracking if the database is compromised. |
| Existing Control | `validateSecurityConfig()` throws in production if pepper is missing or <16 chars |
| Remediation | Consider making `ARGON2_SECRET` required in the Zod schema (not optional) and handling dev separately. Alternatively, add a compile-time type guard that prevents accessing `ARGON2_SECRET` without calling `getEnv()`. |
| Recommendation Priority | Low — existing fail-closed guard is effective |

#### PWD-002: Argon2id Parameters Could Be Stronger

| Field | Value |
|---|---|
| Finding ID | PWD-002 |
| Severity | Informational |
| Location | `src/auth/crypto/password.ts:11-13` |
| Evidence | `memoryCost: 65536, timeCost: 3, parallelism: 1` |
| Description | The Argon2id parameters (64 MB, t=3, p=1) provide adequate protection for a small internal admin application with a limited user base. However, OWASP recommends Argon2id with at least 19 MB memory cost and 2 iterations as a minimum. The current parameters are above this minimum but below the recommended 128 MB for higher-security applications. |
| Attack Scenario | An attacker with a stolen database and access to GPU/ASIC hardware could attempt offline password cracking. Higher memory costs increase the cost of parallel attacks. |
| Impact | Moderate — current parameters are acceptable for an internal admin tool but would be insufficient for a high-value public-facing application. |
| Existing Control | Argon2id provides memory-hardness that resists GPU/ASIC attacks |
| Remediation | Consider increasing `memoryCost` to 131072 (128 MB) and `timeCost` to 4 for stronger protection. Benchmark on production hardware to ensure login latency remains acceptable. |
| Recommendation Priority | Informational — appropriate for current use case |

---

## Password Policy

### Implementation

```typescript
// src/auth/validation/password-policy.ts:20-29
export const DEFAULT_PASSWORD_POLICY: PasswordPolicy = {
  minLength: PASSWORD_MIN_LENGTH,  // 15
  maxLength: PASSWORD_MAX_LENGTH,  // 128
  requireUppercase: false,
  requireLowercase: false,
  requireNumber: false,
  requireSpecialChar: false,
  expirationDays: 0,  // no expiration
  historyCount: 5,
};
```

### Analysis

| Aspect | Assessment | Evidence |
|---|---|---|
| Minimum length | 15 characters — excellent (exceeds NIST 800-63B minimum of 8) | `password-strength.ts:5` |
| Maximum length | 128 characters — adequate | `password-strength.ts:6` |
| Complexity requirements | None (all false) — NIST-aligned | `password-policy.ts:23-26` |
| Strength evaluation | zxcvbn-ts with user-context dictionary | `password-strength.ts:29-62` |
| Weak password confirmation | Score < 2 requires explicit confirmation | `password-strength.ts:59` |
| Repetitive character rejection | `/(.)\1+$/` regex | `password-policy.ts:55` |
| History enforcement | 5 previous passwords | `password-policy.ts:28` |
| Password expiration | None (expirationDays: 0) | `password-policy.ts:27` |

### Findings

#### PWD-003: No Character Class Complexity Requirements

| Field | Value |
|---|---|
| Finding ID | PWD-003 |
| Severity | Low |
| Location | `src/auth/validation/password-policy.ts:23-26` |
| Evidence | `requireUppercase: false, requireLowercase: false, requireNumber: false, requireSpecialChar: false` |
| Description | The default password policy has no character class complexity requirements. While this is aligned with NIST SP 800-63B guidance (which recommends against composition rules in favor of length + strength evaluation), it means a 15-character password of all lowercase letters (e.g., `aaaaaaaaaaaaaaaa`) would pass policy validation. The zxcvbn strength evaluator catches this (`requiresExplicitConfirmation` for score < 2), but the explicit confirmation step is a weak barrier. |
| Attack Scenario | User sets password `abcdefghijklmnop` (15 lowercase chars). zxcvbn scores this as weak, but the user can explicitly confirm and proceed. Dictionary attacks against such passwords are faster than against passwords with mixed character classes. |
| Impact | Low — the 15-character minimum significantly limits attack surface regardless of composition; zxcvbn catches truly weak passwords; explicit confirmation adds friction |
| Existing Control | zxcvbn strength evaluation with user-context dictionary; `requiresExplicitConfirmation` for score < 2; minimum length of 15 |
| Remediation | This is a design decision aligned with NIST guidance. No change recommended. If the organization prefers defense-in-depth, consider enabling `requireUppercase` and `requireNumber` as additional friction without the UX cost of requiring special characters. |
| Recommendation Priority | Low — NIST-aligned design |

#### PWD-004: No Password Expiration

| Field | Value |
|---|---|
| Finding ID | PWD-004 |
| Severity | Informational |
| Location | `src/auth/validation/password-policy.ts:27` |
| Evidence | `expirationDays: 0` |
| Description | Passwords do not expire. This is consistent with NIST SP 800-63B guidance, which recommends against periodic password changes (they lead to weaker passwords and user frustration). However, some compliance frameworks (PCI DSS) require 90-day password expiration. |
| Attack Scenario | A compromised password remains valid indefinitely until the user changes it or an admin resets it. |
| Impact | Informational — acceptable for NIST-aligned policy; may conflict with specific compliance requirements |
| Existing Control | Password change can be forced by admin (`forcePasswordChange`); session revocation on password change |
| Remediation | If compliance requires expiration, set `expirationDays` in the `password_policies` collection. Otherwise, no change needed. |
| Recommendation Priority | Informational |

#### PWD-005: zxcvbn Strength Evaluator Contextual Inputs

| Field | Value |
|---|---|
| Finding ID | PWD-005 |
| Severity | Informational |
| Location | `src/auth/validation/password-strength.ts:29-62`, `src/auth/services/password.service.ts:79-81` |
| Evidence | Contextual inputs include displayName, firstName, lastName, email, "CWS", "Cross Weave Sourcing" |
| Description | The zxcvbn evaluator uses user-specific contextual inputs (name, email, company name) to detect passwords that contain personally identifiable information. This is a strong defense against targeted dictionary attacks. |
| Attack Scenario | User sets password `JohnDoe123456789` — zxcvbn detects the name in the password and scores it as weak. |
| Impact | Positive — this is a strong control that should be maintained |
| Existing Control | Context-aware zxcvbn evaluation with user-specific dictionary |
| Remediation | None — this is a well-implemented control |

---

## Login Security

### Implementation Analysis

| Aspect | Assessment | Evidence |
|---|---|---|
| Timing mitigation | `DUMMY_HASH` + `randomDelayMs(0-50)` on unknown-email path | `login.service.ts:78-79`, `crypto/constants.ts:5-6` |
| Account enumeration | Generic error messages; dummy hash on unknown users | `login.service.ts:82` |
| Brute-force protection | IP rate limit (20/15min), identifier progressive delay, account lockout (5/15min) | `rate-limit.service.ts` |
| Input validation | Zod schema validation at entry point | `login.service.ts:61` |
| Audit logging | All failures logged with IP, userAgent, reason | `login.service.ts:357-400` |
| Risk evaluation | Adaptive 2FA/block policy on every successful first-factor auth | `login.service.ts:152-200` |

### Findings

#### PWD-006: Timing Mitigation Has Non-Deterministic Variance

| Field | Value |
|---|---|
| Finding ID | PWD-006 |
| Severity | Informational |
| Location | `src/auth/services/login.service.ts:26-28, 78-79` |
| Evidence | `randomDelayMs(max = 50)` → `Math.floor(Math.random() * (max + 1))` |
| Description | The timing mitigation adds a random delay of 0-50ms on the unknown-email path. While the dummy Argon2 hash computation provides the dominant timing equalization (same Argon2id parameters as the real hash), the random delay adds additional noise. However, `Math.random()` is not cryptographically secure. For timing mitigation purposes this is acceptable because the delay is additive (not the sole protection), and the goal is to approximate timing profiles, not generate cryptographic randomness. |
| Attack Scenario | An attacker with extremely precise timing measurements (sub-millisecond) could potentially distinguish paths based on the Argon2 computation variance rather than the random delay. |
| Impact | Informational — the dummy hash is the primary timing equalization; the delay is supplementary noise |
| Existing Control | `DUMMY_HASH` with identical Argon2id parameters provides the dominant timing equalization |
| Remediation | No change needed. The dummy hash alone provides sufficient timing equalization. |
| Recommendation Priority | Informational |

#### PWD-007: No CAPTCHA on Login

| Field | Value |
|---|---|
| Finding ID | PWD-007 |
| Severity | Low |
| Location | `src/app/api/auth/login/route.ts` |
| Evidence | No CAPTCHA or human-challenge mechanism in the login flow |
| Description | The login endpoint relies on IP-based rate limiting and progressive delay for abuse prevention, but does not include a CAPTCHA or similar human-challenge mechanism. A sophisticated attacker could distribute login attempts across multiple IP addresses (botnet) to bypass per-IP rate limits. |
| Attack Scenario | Attacker uses a botnet with 100+ IPs to attempt 10 passwords per IP (below the 20/15min per-IP limit), resulting in 1000 password attempts against a single account in 15 minutes. The per-identifier progressive delay would still apply, but the per-IP limit would not trigger. |
| Impact | Low — the per-identifier progressive delay (exponential backoff after 5 failures) and account lockout (5 failures → 15min) still protect individual accounts regardless of IP distribution |
| Existing Control | Per-identifier rate limiting with progressive delay; account lockout at 5 failures |
| Remediation | Consider adding a CAPTCHA after N failed attempts (e.g., 3-5) as a defense-in-depth measure. This is especially relevant if the application is exposed to the public internet without a WAF. |
| Recommendation Priority | Low — existing controls provide adequate protection for an internal admin tool |

#### PWD-008: Progressive Delay Maximum Cap

| Field | Value |
|---|---|
| Finding ID | PWD-008 |
| Severity | Informational |
| Location | `src/auth/services/rate-limit.service.ts:55-68` |
| Evidence | `requiredDelayMs = Math.pow(2, idFailures - 5) * 1000` |
| Description | The progressive delay formula `2^(n-5) * 1000` grows exponentially without an explicit cap. After 15 failures, the required delay is `2^10 * 1000 = 1,024,000ms` (~17 minutes). After 20 failures, it's ~5.7 hours. While the per-IP limit (20/15min) would typically kick in before extreme delays, the exponential growth without a cap could theoretically result in very long delays for a persistent attacker on the identifier dimension. |
| Attack Scenario | An attacker targeting a specific email with a single IP would face increasingly long delays, but the account would not be locked until the 5th failure. The delay grows but the lockout mechanism is the primary protection. |
| Impact | Informational — the delay is additive protection, not the primary lockout mechanism |
| Existing Control | Account lockout at 5 failures provides the hard protection; progressive delay is supplementary |
| Remediation | Consider adding a maximum delay cap (e.g., 5 minutes) for UX predictability. |
| Recommendation Priority | Informational |

---

## Email Normalization

### Implementation

```typescript
// src/auth/validation/login.schema.ts (inferred from schema usage)
// Email is trimmed and lowercased by the Zod schema before DB lookup
```

### Analysis

| Aspect | Assessment | Evidence |
|---|---|---|
| Trim | Yes — whitespace removed | `loginSchema.safeParse()` |
| Lowercase | Yes — normalized before DB lookup | `loginSchema.safeParse()` |
| Consistency | Same normalization applied in password reset (`requestReset`) | `password.service.ts:236` |

### Findings

#### PWD-009: No Findings

Email normalization is correctly implemented and consistent across all entry points.

---

## Account Lockout

### Implementation

```typescript
// src/auth/services/login.service.ts:40-41
private readonly LOCKOUT_THRESHOLD = 5;
private readonly LOCKOUT_DURATION_MS = 15 * 60 * 1000; // 15 minutes
```

```typescript
// src/auth/repositories/user.repository.ts (atomic operation)
// recordFailedLoginAndMaybeLock() — single conditional MongoDB update
```

### Analysis

| Aspect | Assessment | Evidence |
|---|---|---|
| Threshold | 5 failures — appropriate | `login.service.ts:40` |
| Duration | 15 minutes — appropriate | `login.service.ts:41` |
| Atomicity | Atomic conditional write (no lost-update window) | `login.service.ts:127-131` |
| Reset on success | `resetFailedAttempts()` called on successful verification | `login.service.ts:144` |
| Lock check | Checked before credential verification | `login.service.ts:102-106` |

### Findings

#### PWD-010: Lockout Does Not Prevent Attempts on Locked Account

| Field | Value |
|---|---|
| Finding ID | PWD-010 |
| Severity | Informational |
| Location | `src/auth/services/login.service.ts:102-106, 117-141` |
| Evidence | Lockout check is at line 102; password verification at line 115. Failed attempts on a locked account are still recorded. |
| Description | When an account is locked, the login service correctly rejects the attempt at line 105 (`AccountLockedError`), but the failed attempt is still recorded via `recordFailure()` at line 104. This means additional failed attempts continue to accrue even during lockout. However, this does not extend the lockout duration because `recordFailedLoginAndMaybeLock()` only triggers when the account is NOT already locked (the MongoDB filter includes `lockedUntil: null` or expired). |
| Attack Scenario | An attacker continues submitting passwords during lockout. The attempts are recorded for audit but do not extend the lockout. |
| Impact | Informational — lockout duration is fixed at 15 minutes regardless of additional attempts |
| Existing Control | Atomic lockout with fixed duration; additional attempts during lockout do not extend it |
| Remediation | No change needed — current behavior is correct and desirable |
| Recommendation Priority | Informational |

#### PWD-011: No Lockout Notification to User

| Field | Value |
|---|---|
| Finding ID | PWD-011 |
| Severity | Low |
| Location | `src/auth/services/login.service.ts:133-136` |
| Evidence | Lockout triggers `AccountLockedError` but no email notification is sent to the user |
| Description | When an account is locked due to 5 failed password attempts, no email notification is sent to the account owner. The user may not know their account is locked until they attempt to log in again. This could delay detection of a brute-force attack. |
| Attack Scenario | An attacker attempts 5 passwords against a victim's account, locking it out. The victim doesn't notice until they try to log in hours later. By then, the lockout has expired and the attacker may have resumed attempts. |
| Impact | Low — lockout is temporary (15min) and the audit trail captures all attempts; but user awareness would improve incident response |
| Existing Control | `AlertingService.recordFailure()` logs failures to the security sink; lockout triggers an audit log entry |
| Remediation | Consider sending an email notification when an account is locked (similar to the existing `alertReuseDetected` pattern). This would alert the user to potential brute-force activity. |
| Recommendation Priority | Low |

---

## Summary

| Finding ID | Severity | Summary | Recommendation |
|---|---|---|---|
| PWD-001 | Low | Pepper optional in schema (fail-closed in prod) | Consider making required in schema |
| PWD-002 | Info | Argon2id params acceptable, could be stronger | Consider 128 MB memory cost |
| PWD-003 | Low | No complexity requirements (NIST-aligned) | No change (NIST-aligned) |
| PWD-004 | Info | No password expiration (NIST-aligned) | No change (NIST-aligned) |
| PWD-005 | Info | zxcvbn contextual inputs well-implemented | None |
| PWD-006 | Info | Timing mitigation uses non-crypto random | None (adequate) |
| PWD-007 | Low | No CAPTCHA on login | Consider after N failures |
| PWD-008 | Info | Progressive delay has no explicit cap | Consider max cap |
| PWD-009 | — | Email normalization correctly implemented | None |
| PWD-010 | Info | Lockout does not extend on additional failures | None (correct behavior) |
| PWD-011 | Low | No lockout email notification | Consider sending alert email |
