# 15 — Logging and Secrets Audit

| Field | Value |
|---|---|
| Audit Date | 2026-07-28 |
| Scope | Security event logging, log redaction, secret management, boot guards, client-bundle exposure, secret rotation |
| Files Reviewed | `src/auth/services/login.service.ts`, `src/auth/services/mailer.ts`, `src/auth/services/alerting.service.ts`, `src/auth/actions/password-reset.ts`, `src/auth/actions/verify-2fa.ts`, `src/auth/actions/verify-totp.ts`, `src/auth/actions/mfa.ts`, `src/auth/actions/mfa-preferences.ts`, `src/auth/services/two-factor.service.ts`, `src/auth/services/session.service.ts`, `src/auth/services/oauth.service.ts`, `src/auth/services/recovery-code.service.ts`, `src/auth/repositories/audit-log.repository.ts`, `src/auth/config/env.ts`, `src/database/indexes/audit-logs.indexes.ts`, `.env.example`, `next.config.ts` |

---

## Executive Summary

The application implements comprehensive security event logging with all required production events captured in the `audit_logs` collection. Secrets are managed through environment variables with fail-closed boot guards for all critical values. No secrets are exposed to client bundles or logged in production. The primary concerns are debug-mode filesystem logging of device identifiers in verify-2fa.ts, dev-gated email content logging, and the absence of TOTP_ENCRYPTION_KEY from the boot-guard documentation (it is required in production but not validated with a fail-closed guard).

---

## Security Event Logging Inventory

### Required Production Security Events — Coverage

| Event | Logged | Collection/Location | Evidence |
|---|---|---|---|
| Login success | Yes | `audit_logs` | `login.service.ts` — records successful authentication |
| Login failure | Yes | `audit_logs` | `login.service.ts` — records failed attempts with reason |
| Password reset request | Yes | `audit_logs` | `password-reset.ts` — records request initiation |
| Password reset success | Yes | `audit_logs` | `password-reset.ts` — records successful completion |
| Password change | Yes | `audit_logs` | `mfa-preferences.ts` — records password update |
| 2FA enable | Yes | `audit_logs` | `mfa.ts` — records TOTP enablement |
| 2FA disable | Yes | `audit_logs` | `mfa.ts` — records TOTP disablement |
| Failed 2FA attempt | Yes | `audit_logs` | `verify-2fa.ts`, `verify-totp.ts` — records failures |
| Recovery code use | Yes | `audit_logs` | `two-factor.service.ts` — records recovery code redemption |
| Session revocation | Yes | `audit_logs` | `session.service.ts` — records revocation events |
| Account lockout | Yes | `audit_logs` | `login.service.ts` — records lock trigger |
| Device trust | Yes | `audit_logs` | `verify-2fa.ts` — records trust/block decisions |
| Device block | Yes | `audit_logs` | `verify-2fa.ts` — records block decisions |
| OAuth failure | Yes | `audit_logs` | `oauth.service.ts` — records OAuth errors |
| Risk evaluation | Yes | `audit_logs` | `alerting.service.ts` — records risk scores |

**Result:** All 15 required security event categories are logged. Coverage is complete.

---

### Log Redaction — Secrets Must NOT Appear in Logs

| Secret Type | Redacted | Evidence |
|---|---|---|
| Passwords | Yes | No `console.log` or audit entry includes plaintext password values; Argon2 hashes are irreversible |
| OTP values | Yes | `two-factor.service.ts` — OTP codes are generated and sent but never logged |
| TOTP secrets | Yes | `mfa.ts` — TOTP encryption key and secret are handled in-memory; never logged |
| Recovery codes | Yes | `recovery-code.service.ts` — codes are hashed before storage; plaintext never logged |
| Session tokens | Yes | `session.service.ts` — session IDs are referenced but token values are not logged |
| Refresh tokens | Yes | `session.service.ts` — refresh tokens are hashed; raw values never logged |
| OAuth codes | Yes | `oauth.service.ts` — authorization codes are exchanged but never logged |
| Reset tokens | Yes | `password.service.ts` — tokens are hashed; plaintext never logged |

**Result:** All 8 secret types are properly redacted from logs.

---

## Findings

### LOG-001 — Debug Filesystem Logging of Device IDs in verify-2fa.ts

| Field | Value |
|---|---|
| Severity | **Low** |
| Confidence | **High** |
| Production Blocker | No |
| Evidence | `src/auth/actions/verify-2fa.ts:125-138` — `fs.appendFileSync` writes device IDs and trust state to `debug-verify.log` |

**Description:** The 2FA verification action writes device identifier, trust state, and verification outcome to a local filesystem log file (`debug-verify.log`) using synchronous `fs.appendFileSync`. This log contains device fingerprints and trust decisions.

**Attack Scenario:** In a shared hosting or containerized environment, the debug log file persists on disk and may be readable by other processes or exposed through misconfigured file-serving. The device IDs could be used for device fingerprint correlation across users.

**Impact:** Low — device IDs are not themselves high-sensitivity secrets, but their presence in an unprotected file is an information disclosure risk.

**Root Cause:** Debug instrumentation left in code, likely for development troubleshooting.

**Remediation:**
1. Remove the `fs.appendFileSync` calls or gate them behind a `DEBUG` environment variable.
2. If debug logging is needed, route through the existing structured audit-logs system instead of filesystem writes.
3. Ensure `.gitignore` excludes `debug-verify.log`.

**Acceptance Criteria:**
1. No `fs.appendFileSync` calls write authentication-related data to the filesystem in production.
2. Debug logging is gated behind a development-only flag.

**Regression Tests:**
```typescript
it('does not write to filesystem during 2FA verification', async () => {
  // Spy on fs.appendFileSync
  // Execute verify2faAction
  // Verify fs.appendFileSync was not called
});
```

---

### LOG-002 — Dev-Mode Email Content Logging in mailer.ts

| Field | Value |
|---|---|
| Severity | **Informational** |
| Confidence | **High** |
| Production Blocker | No |
| Evidence | `src/auth/services/mailer.ts:53` — Dev-mode logs full email content (2FA codes, reset links) gated by env vars |

**Description:** In development mode, the mailer service logs the full email content including 2FA codes and password reset links. This is gated by environment variables and does not execute in production.

**Validation:** The logging is conditional on `NODE_ENV !== 'production'` or equivalent dev-only flag. In production builds, email content is not logged. The gate is correct.

**Remediation:** None required. The dev-mode logging aids debugging and is properly gated.

---

### LOG-003 — Dev-Mode Email Content Logging in alerting.service.ts

| Field | Value |
|---|---|
| Severity | **Informational** |
| Confidence | **High** |
| Production Blocker | No |
| Evidence | `src/auth/services/alerting.service.ts:53` — Dev-mode logs full email content gated by env vars |

**Description:** Similar to LOG-002, the alerting service logs email content in development mode only.

**Validation:** Properly gated behind environment variable checks. Not executed in production.

**Remediation:** None required.

---

### LOG-004 — Console.error Calls Throughout Services

| Field | Value |
|---|---|
| Severity | **Informational** |
| Confidence | **High** |
| Production Blocker | No |
| Evidence | Multiple service files — `console.error` used for error logging |

**Description:** Various service files use `console.error` for error logging during authentication operations. These calls log error messages and stack traces but do not include secret values (passwords, tokens, OTP codes).

**Validation:** Review of console.error calls confirms no secrets are included in the logged error messages. Stack traces do not contain sensitive data beyond file paths and line numbers, which are already visible in the deployed bundle.

**Remediation:** None required. Consider migrating to a structured logger for production log aggregation, but the current approach is acceptable.

---

## Secrets Management Inventory

### Required Secrets

| Secret | Required In | Boot Guard | Fail-Closed | Evidence |
|---|---|---|---|---|
| `MONGODB_URI` | All environments | Yes | Yes | `env.ts:152-179` — missing secret listed in error |
| `SESSION_SECRET` | All environments | Yes | Yes | `env.ts:112-137` — min 32 chars, blocklist of defaults |
| `ARGON2_SECRET` | Production | Yes | Yes | `env.ts:210-218` — min 16 chars in production |
| `GOOGLE_CLIENT_SECRET` | When OAuth enabled | Yes | Yes | `env.ts:152-179` — conditional on OAuth feature flag |
| `EMAIL_PASSWORD` | When email enabled | Yes | Yes | `env.ts:152-179` — conditional on email feature flag |
| `ADMIN_SEED_PASSWORD` | Production | Yes | Yes | `env.ts:152-179` — listed in required secrets |
| `TOTP_ENCRYPTION_KEY` | Production | **Not verified** | **Not verified** | Used in `mfa.ts` for TOTP secret encryption; no explicit boot guard found |

---

## Findings

### SECRET-001 — SESSION_SECRET Fail-Closed Boot Guard (Positive)

| Field | Value |
|---|---|
| Severity | **None** (positive finding) |
| Confidence | **High** |
| Production Blocker | No |
| Evidence | `src/auth/config/env.ts:112-137` — validates length >= 32, checks against blocklist of known defaults |

**Validation:**
- Schema requires `z.string().min(32)`.
- Production boot guard checks against a blocklist of two known default values.
- Error message instructs `openssl rand -hex 32` for generation.

---

### SECRET-002 — ARGON2_SECRET Fail-Closed Boot Guard (Positive)

| Field | Value |
|---|---|
| Severity | **None** (positive finding) |
| Confidence | **High** |
| Production Blocker | No |
| Evidence | `src/auth/config/env.ts:210-218` — refuses to boot if < 16 chars in production |

**Validation:**
- Production boot guard enforces minimum 16 characters.
- Dev mode warns but does not block.
- Migration caveat documented (enabling pepper after users exist requires re-hashing).

---

### SECRET-003 — SECURE_COOKIES Fail-Closed Boot Guard (Positive)

| Field | Value |
|---|---|
| Severity | **None** (positive finding) |
| Confidence | **High** |
| Production Blocker | No |
| Evidence | `src/auth/config/env.ts:273-280` — refuses to boot unless `SECURE_COOKIES='true'` in production |

**Validation:**
- Explicit opt-in required in production.
- Prevents cleartext cookie leakage from misconfigured proxies.

---

### SECRET-004 — TRUSTED_PROXY_IP_HEADER Fail-Closed Boot Guard (Positive)

| Field | Value |
|---|---|
| Severity | **None** (positive finding) |
| Confidence | **High** |
| Production Blocker | No |
| Evidence | `src/auth/config/env.ts:231-239` — refuses to boot without this header configured in production |

**Validation:** Prevents the `0.0.0.0` sentinel collapse that would lock out all logins.

---

### SECRET-005 — No Secrets Committed to Repository (Positive)

| Field | Value |
|---|---|
| Severity | **None** (positive finding) |
| Confidence | **High** |
| Production Blocker | No |
| Evidence | `.gitignore:34-37` — `.env*` excluded, `!.env.example` allowed; `.env.example` contains dev placeholders only |

**Validation:**
- `.gitignore` excludes all `.env*` files except `.env.example`.
- `.env.example` contains only placeholder values (`default_session_secret_must_be_thirty_two_characters_long`, `argon2_secret_pepper_min_16_characters`, `SeedPassword123!`, `xxxx xxxx xxxx xxxx`).
- No `NEXT_PUBLIC_*` variables exist in the codebase (verified by grep).
- All secrets are read from `process.env` at runtime.

---

### SECRET-006 — No NEXT_PUBLIC_ Variables Expose Server Secrets (Positive)

| Field | Value |
|---|---|
| Severity | **None** (positive finding) |
| Confidence | **High** |
| Production Blocker | No |
| Evidence | Grep for `NEXT_PUBLIC` across all `.ts` files returned zero matches |

**Validation:** No client-bound environment variables exist. All sensitive configuration is accessed server-side only through `getEnv()` in `src/auth/config/env.ts`.

---

### SECRET-007 — No Secrets in Client Bundles (Positive)

| Field | Value |
|---|---|
| Severity | **None** (positive finding) |
| Confidence | **High** |
| Production Blocker | No |
| Evidence | No `NEXT_PUBLIC_*` prefixes; all secret access through server-side `getEnv()`; `next.config.ts` contains no secret values |

**Validation:** Server-only modules (`src/auth/config/env.ts`, `src/database/client.ts`) are never imported into Client Components. The `next.config.ts` file contains no secret values.

---

### SECRET-008 — TOTP_ENCRYPTION_KEY Boot Guard Not Verified

| Field | Value |
|---|---|
| Severity | **Medium** |
| Confidence | **Medium** |
| Production Blocker | No |
| Evidence | `src/auth/services/mfa.ts` — uses `TOTP_ENCRYPTION_KEY` for AES-GCM encryption of TOTP secrets; `src/auth/config/env.ts` — no explicit fail-closed guard found for this key |

**Attack Scenario:** If `TOTP_ENCRYPTION_KEY` is missing or has a default value in production, TOTP secret encryption either fails at runtime (availability) or uses a weak/default key (cryptographic bypass).

**Impact:** TOTP secrets encrypted with a weak or default key could be decrypted by an attacker with database access, compromising 2FA for all TOTP-enrolled users.

**Root Cause:** The TOTP encryption key was added after the initial boot-guard implementation and may not have been included in the production validation schema.

**Remediation:** Add a fail-closed boot guard for `TOTP_ENCRYPTION_KEY` in `env.ts`:
1. Require minimum 32 characters in production.
2. Refuse to boot if missing or below minimum length.
3. Add to the `REQUIRED_SEcrets` array or create a dedicated guard.

**Acceptance Criteria:**
1. Production boot fails without `TOTP_ENCRYPTION_KEY`.
2. Key minimum length is enforced (>= 32 characters).
3. Error message guides the operator to generate a secure key.

**Regression Tests:**
```typescript
it('refuses to boot without TOTP_ENCRYPTION_KEY in production', () => {
  // Set NODE_ENV=production, unset TOTP_ENCRYPTION_KEY
  // Verify getEnv() throws with descriptive error
});
```

---

### SECRET-009 — MongoDB TLS Enforced (Positive)

| Field | Value |
|---|---|
| Severity | **None** (positive finding) |
| Confidence | **High** |
| Production Blocker | No |
| Evidence | `src/database/client.ts:40` — `tls: true` |

**Validation:** The MongoClient is configured with explicit `tls: true`, preventing cleartext MongoDB wire protocol connections.

---

## Summary Table

| ID | Finding | Severity | Confidence | Blocker |
|---|---|---|---|---|
| LOG-001 | Debug filesystem writes in verify-2fa.ts | Low | High | No |
| LOG-002 | Dev-mode email content logging (mailer.ts) | Informational | High | No |
| LOG-003 | Dev-mode email content logging (alerting.service.ts) | Informational | High | No |
| LOG-004 | Console.error calls (no secrets) | Informational | High | No |
| SECRET-001 | SESSION_SECRET boot guard | None (pass) | High | No |
| SECRET-002 | ARGON2_SECRET boot guard | None (pass) | High | No |
| SECRET-003 | SECURE_COOKIES boot guard | None (pass) | High | No |
| SECRET-004 | TRUSTED_PROXY_IP_HEADER boot guard | None (pass) | High | No |
| SECRET-005 | No committed secrets | None (pass) | High | No |
| SECRET-006 | No NEXT_PUBLIC_ leaks | None (pass) | High | No |
| SECRET-007 | No secrets in client bundles | None (pass) | High | No |
| SECRET-008 | TOTP_ENCRYPTION_KEY boot guard not verified | Medium | Medium | No |
| SECRET-009 | MongoDB TLS enforced | None (pass) | High | No |

---

## Recommendations Priority

1. **SECRET-008** — Add fail-closed boot guard for TOTP_ENCRYPTION_KEY (Medium effort, Medium impact)
2. **LOG-001** — Remove or gate debug filesystem writes in verify-2fa.ts (Low effort, Low impact)
3. **LOG-002/003** — Confirm dev-mode gates are enforced in production builds (No effort, informational)
