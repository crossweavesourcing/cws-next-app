# 16 — Operational Security Guide

| Field | Value |
|---|---|
| Audit Date | 2026-07-27 |
| Scope | Security event logging, log hygiene (what must NOT be logged), recommended alerts, dependency security, deployment operational security |
| Files Reviewed | `src/auth/services/alerting.service.ts`, `src/auth/services/mailer.ts`, `src/auth/services/login.service.ts`, `src/auth/actions/verify-2fa.ts`, `src/auth/actions/verify-totp.ts`, `src/auth/actions/password-reset.ts`, `src/app/api/auth/google/callback/route.ts`, `src/app/api/auth/refresh/route.ts`, `src/database/observability.ts`, `src/database/config.ts`, `src/proxy.ts`, `src/auth/config/env.ts`, `src/auth/lib/cookies.ts`, `security-scan.js`, `package.json`, `.gitignore` |

---

## Executive Summary

The application has a well-structured security event architecture with a pluggable sink (console JSON or webhook), centralized alerting through `AlertingService`, and structured audit logging. However, a debug logging artifact was found in production code, and several operational gaps exist in alerting coverage, dependency scanning, and log retention policy.

---

## Current Security Event Architecture

### Event Flow
```
Application Code
    ↓
AlertingService.emit()          → SecurityAlertSink (console.warn or webhook)
    ↓
AuditLogRepository.log()       → MongoDB audit_logs collection (180-day TTL)
    ↓
LoginAttemptRepository         → MongoDB login_attempts collection (24-hour TTL)
```

### Security Events Currently Emitted

| Event Action | Severity | Trigger | Sink |
|---|---|---|---|
| `auth.refresh.reuse_detected` | Critical | Refresh token reuse/revocation | Audit + Alert |
| `auth.login.new_device` | Warning | First login from a new device | Audit + Alert |
| `auth.login.suspicious` | Warning | Country change on known device | Audit + Alert |
| `auth.password.reset.success` | Warning | Password reset completed | Audit + Alert |
| `auth.oauth.failed` | Warning | OAuth callback failure | Audit + Alert |
| `auth.login.failure` | Warning | Individual login failure | Audit + Alert |
| `auth.login.failure_spike` | Critical | ≥10 failures per identifier in 5 min | Alert only |
| `auth.login.success` | Info | Successful login | Audit only |
| `auth.mfa.code.sent` | Info | 2FA code emailed | Audit only |
| `auth.mfa.verified` | Info | 2FA code verified | Audit only |
| `auth.mfa.failed` | Warning | 2FA code verification failed | Audit only |
| `auth.mfa.totp.verified` | Info | TOTP code verified | Audit only |
| `auth.mfa.totp.failed` | Warning | TOTP code verification failed | Audit only |
| `auth.mfa.recovery.used` | Info | Recovery code used | Audit only |
| `auth.login.failure` (OAuth) | Warning | OAuth token exchange failed | Audit + Alert |

---

## Findings

### OPS-001 — Debug File Writes Left in Production 2FA Code Path

| Field | Value |
|---|---|
| Severity | **Critical** |
| Confidence | **High** |
| Production Blocker | Yes |
| Evidence | `src/auth/actions/verify-2fa.ts:126-135` — `fs.appendFileSync('debug-verify.log', ...)` |

**Attack Scenario:** An attacker who can read the filesystem (e.g., container escape, shared hosting, serverless temp directory) can read `debug-verify.log`, which contains:
- `pendingAuth.deviceObjectId` (internal MongoDB ObjectId)
- Device trust/block status
- Whether the trust prompt was triggered

In serverless environments, the file is written to `/tmp` or the function's ephemeral storage. If a subsequent request on the same instance reads the file, the data is stale but still reveals internal state.

**Impact:** Information disclosure of internal device trust state; filesystem write in production code.

**Root Cause:** Debug code was added during development and not removed before deployment. The `import { fs } from 'fs'` at line 125 and the four `appendFileSync` calls at lines 126, 130, 132, and 135 are development artifacts.

**Remediation:** Remove all `fs.appendFileSync` calls and the `import { fs } from 'fs'` statement from `src/auth/actions/verify-2fa.ts`. If the trust-prompt logic needs debugging in the future, use structured logging through the audit log repository.

**Acceptance Criteria:**
1. No `appendFileSync` calls exist in any source file under `src/`.
2. No `fs` module imports exist outside of legitimate uses (e.g., config loading scripts).
3. A grep for `debug-verify.log` across the codebase returns zero matches.

**Regression Tests:**
```typescript
it('does not write to debug log files', async () => {
  const { execSync } = require('child_process');
  const result = execSync('grep -r "appendFileSync\\|debug-verify.log" src/ --include="*.ts"');
  expect(result.toString()).toBe('');
});
```

---

### OPS-002 — Console Dev Mode Logs 2FA Codes and Reset Links

| Field | Value |
|---|---|
| Severity | **Medium** |
| Confidence | **High** |
| Production Blocker | No |
| Evidence | `src/auth/services/mailer.ts:52-54` — `console.info('[mail:dev] to=... subject=...\n${message.text}')` |

**Attack Scenario:** In development or misconfigured production environments (where `EMAIL_USER`/`EMAIL_PASSWORD` are unset), the full email content — including 6-digit 2FA codes and password reset links with tokens — is logged to stdout. If stdout is captured by a logging aggregator (CloudWatch, Datadog, Logflare), the secrets are stored in plaintext log streams.

**Impact:** 2FA codes and password reset tokens exposed in log aggregators.

**Root Cause:** The dev fallback in `sendMail()` logs the full message body to assist local development. The guard (`!mailer || !env.EMAIL_FROM`) prevents this in properly configured production environments.

**Remediation:**
1. Add a runtime guard: only log email content when `NODE_ENV !== 'production'` (belt-and-suspenders).
2. Document that production deployments MUST configure `EMAIL_USER` + `EMAIL_PASSWORD` to avoid falling into the dev logging path.

**Acceptance Criteria:**
1. In production (`NODE_ENV=production`), `sendMail()` never logs email body content to console.
2. Dev logging only occurs when both `NODE_ENV !== 'production'` and email provider is not configured.

**Regression Tests:**
```typescript
it('does not log email content in production mode', async () => {
  process.env.NODE_ENV = 'production';
  const consoleSpy = vi.spyOn(console, 'info');
  // Call sendMail without email provider configured
  // Verify console.info is NOT called with message body
});
```

---

### OPS-003 — Database Config Error Leaks Partial Connection String

| Field | Value |
|---|---|
| Severity | **Medium** |
| Confidence | **High** |
| Production Blocker | No |
| Evidence | `src/database/config.ts:54` — `` `got "${uri.slice(0, 20)}..."` `` |

**Attack Scenario:** If `MONGODB_URI` is misconfigured, the `DatabaseConfigError` includes the first 20 characters of the URI. For a typical Atlas connection string (`mongodb+srv://username:password@cluster0.xxxxx.mongodb.net/dbname`), this could expose `mongodb+srv://user:pa` — including the username and the first two characters of the password.

**Impact:** Partial credential leakage in error messages / stack traces / monitoring dashboards.

**Root Cause:** The error message includes a URI prefix to help developers diagnose scheme issues.

**Remediation:** Replace with a safe diagnostic:
```typescript
violations.push(
  `MONGODB_URI: must start with 'mongodb://' or 'mongodb+srv://' (got scheme "${uri.split('://')[0]}")`
);
```

**Acceptance Criteria:**
1. The error message includes at most the scheme portion (`mongodb` or `mongodb+srv`), not the authority (host/user/password).

**Regression Tests:**
```typescript
it('does not leak credentials in database config error', () => {
  process.env.MONGODB_URI = 'mongodb+srv://admin:Secret123@cluster0.example.com/db';
  try { getDatabaseConfig(); } catch (e) {
    expect(e.message).not.toContain('Secret123');
    expect(e.message).not.toContain('admin');
  }
});
```

---

### OPS-004 — Security Webhook Is Optional and Falls Back to Console

| Field | Value |
|---|---|
| Severity | **Medium** |
| Confidence | **High** |
| Production Blocker | No |
| Evidence | `src/database/observability.ts:128-131` — `createDefaultSecuritySink()` returns console sink when `SECURITY_WEBHOOK_URL` is unset |

**Attack Scenario:** Without `SECURITY_WEBHOOK_URL`, all critical security events (token reuse, failure spikes) are emitted as `console.warn` JSON. In serverless environments, these may be:
- Lost entirely (if stdout is not captured)
- Buried in high-volume log streams
- Not trigger any alerting/notification

**Impact:** Critical security events go undetected; incident response delayed.

**Root Cause:** The webhook sink is opt-in. No warning or startup guard enforces its configuration in production.

**Remediation:**
1. Add a startup warning (like `ARGON2_SECRET`) when `SECURITY_WEBHOOK_URL` is unset in production.
2. Consider making it a hard requirement (boot guard) for production if the deployment has a webhook endpoint available.
3. At minimum, document that `SECURITY_WEBHOOK_URL` should be configured for production monitoring.

**Acceptance Criteria:**
1. A startup warning is emitted when `SECURITY_WEBHOOK_URL` is unset in production.
2. The warning is visible in deployment logs.
3. Documentation specifies the recommended webhook endpoint (Slack, PagerDuty, OpsGenie, etc.).

**Regression Tests:**
```typescript
it('warns when SECURITY_WEBHOOK_URL is unset in production', () => {
  process.env.NODE_ENV = 'production';
  delete process.env.SECURITY_WEBHOOK_URL;
  const consoleSpy = vi.spyOn(console, 'warn');
  setupSecurityAlerting();
  expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('SECURITY_WEBHOOK_URL'));
});
```

---

### OPS-005 — login_attempts TTL Is Only 24 Hours

| Field | Value |
|---|---|
| Severity | **Low** |
| Confidence | **High** |
| Production Blocker | No |
| Evidence | `src/database/indexes/login-attempts.indexes.ts:28` — `expireAfterSeconds: 86_400` (24 hours) |

**Attack Scenario:** After 24 hours, all login attempt records are automatically deleted by MongoDB's TTL index. If a security incident is discovered after this window (e.g., a slow brute-force campaign), forensic evidence of the attack is unavailable.

**Impact:** Loss of forensic evidence for incidents discovered after 24 hours.

**Root Cause:** The TTL is set to 24 hours for storage efficiency, but this conflicts with forensic retention needs.

**Remediation:** Extend the TTL to at least 7 days (604,800 seconds) for login attempts. For compliance requirements (SOC 2, ISO 27001), consider 30-90 days. Balance against storage costs for the `login_attempts` collection.

**Acceptance Criteria:**
1. `login_attempts` TTL is at least 7 days.
2. The change is documented in the maintenance/index notes.

**Regression Tests:**
```typescript
it('login_attempts TTL is at least 7 days', () => {
  const ttlIndex = loginAttemptsIndexes.find(i => i.name === 'ttl_createdAt');
  expect(ttlIndex?.expireAfterSeconds).toBeGreaterThanOrEqual(604800);
});
```

---

### OPS-006 — In-Memory Failure Spike Buckets Reset on Process Restart

| Field | Value |
|---|---|
| Severity | **Low** |
| Confidence | **High** |
| Production Blocker | No |
| Evidence | `src/auth/services/alerting.service.ts:249` — `private static readonly failureBuckets = new Map<string, number[]>()` |

**Attack Scenario:** In serverless environments where function instances are frequently recycled, the in-memory `failureBuckets` map resets on each new instance. A distributed brute-force attack that spreads failures across many instances will never reach the spike threshold (10 per 5 min) on any single instance.

**Impact:** Spike detection is unreliable in serverless; only individual failure events are emitted.

**Root Cause:** The spike aggregation is designed for single-instance deployments. The code comment acknowledges this: "In-memory aggregation is sufficient for a single-instance internal app."

**Remediation:** For serverless deployments, replace in-memory aggregation with a MongoDB-backed counter (analogous to `countRecentByIdentifier`). Alternatively, accept this as a known limitation and rely on the per-identifier rate limit (10/15 min) for brute-force protection.

**Acceptance Criteria:**
1. Document the limitation in the alerting service code comments.
2. If serverless spike detection is required, implement a MongoDB-backed alternative.

**Regression Tests:**
```typescript
it('spike alert triggers correctly in single-instance mode', async () => {
  AlertingService.clearFailureBuckets();
  // Record 10 failures for the same identifier
  // Verify spike event is emitted
});
```

---

### OPS-007 — No Automated Dependency Vulnerability Scanning

| Field | Value |
|---|---|
| Severity | **Medium** |
| Confidence | **High** |
| Production Blocker | No |
| Evidence | `package.json:7-23` — no `audit` script; `security-scan.js` — custom source-code scanner (not dependency scanner) |

**Attack Scenario:** A dependency (e.g., `nodemailer`, `jose`, `argon2`) publishes a known vulnerability. Without automated scanning, the vulnerability persists until manually discovered.

**Impact:** Known vulnerabilities in dependencies remain unpatched; potential for exploitation.

**Root Cause:** The build pipeline includes a custom `security-scan.js` for source-code secret scanning but not for dependency vulnerability scanning.

**Remediation:**
1. Add `pnpm audit` to the CI pipeline (run on every PR and before deployment).
2. Consider adding `pnpm audit --audit-level=critical` as a build gate.
3. Enable GitHub Dependabot or Renovate for automated dependency update PRs.
4. Add a `test:security` script: `"test:security": "pnpm audit --audit-level=critical"`.

**Acceptance Criteria:**
1. A `pnpm audit` command runs in CI on every PR.
2. Critical vulnerabilities block deployment.
3. Dependabot or Renovate is enabled for automated updates.

**Regression Tests:**
```json
// In package.json scripts:
"test:security": "pnpm audit --audit-level=critical"
```
```yaml
# In CI workflow:
- run: pnpm audit --audit-level=critical
```

---

### OPS-008 — Audit Log Retention Is 180 Days

| Field | Value |
|---|---|
| Severity | **Low** |
| Confidence | **High** |
| Production Blocker | No |
| Evidence | `src/database/indexes/audit-logs.indexes.ts:28` — `expireAfterSeconds: 15_552_000` (180 days) |

**Validation:** 180 days is reasonable for most compliance frameworks. For SOC 2 Type II, 1 year is recommended. For ISO 27001, retention should match the organization's data retention policy.

**Remediation:** Verify that 180 days meets the organization's compliance requirements. If SOC 2 is required, extend to 365 days.

---

### OPS-009 — AlertingService Is Fire-and-Forget by Design

| Field | Value |
|---|---|
| Severity | **None** (positive finding) |
| Confidence | **High** |
| Production Blocker | No |
| Evidence | `src/auth/services/alerting.service.ts:36-51` — `emit()` catches all errors; `src/auth/services/alerting.service.ts:58-80` — email delivery is `.catch()`'d |

**Validation:** The fire-and-forget design is correct:
- Alerting never blocks the request path.
- Sink failures are logged but do not propagate.
- Email delivery failures are caught separately.

---

### OPS-010 — Mail Delivery Failures Are Silently Swallowed

| Field | Value |
|---|---|
| Severity | **Low** |
| Confidence | **High** |
| Production Blocker | No |
| Evidence | `src/auth/services/mailer.ts:66-70` — `catch (err) { console.error(...) }` |

**Attack Scenario:** If Gmail SMTP is experiencing issues (rate limiting, credential expiry, account suspension), 2FA codes and password reset emails silently fail to deliver. Users are not notified, and no alert is raised. The login flow continues (2FA is required but the code never arrives), leaving users unable to authenticate.

**Impact:** Users cannot complete 2FA or password reset without any visible error or alert.

**Root Cause:** The mailer catches all errors and logs them, but does not forward failures to the alerting service.

**Remediation:**
1. After catching a mail error, forward an event to the alerting service sink:
   ```typescript
   this.emit({ action: 'mail.delivery_failed', severity: 'warning', ... });
   ```
2. Consider a circuit breaker pattern: after N consecutive failures, mark the mail transport as degraded and alert operations.

**Acceptance Criteria:**
1. Mail delivery failures are forwarded to the security alerting sink.
2. A monitoring alert fires when mail delivery fails consecutively.

**Regression Tests:**
```typescript
it('forwards mail delivery failures to the alerting sink', async () => {
  // Mock mailer to throw
  // Verify alerting sink receives a mail.delivery_failed event
});
```

---

### OPS-011 — No Startup Banner or Version Identification

| Field | Value |
|---|---|
| Severity | **Low** |
| Confidence | **High** |
| Production Blocker | No |
| Evidence | `src/auth/config/env.ts:422-434` — `getEnv()` validates and caches but does not log environment info |

**Attack Scenario:** In incident response, operators need to quickly identify which version of the application is running, which environment it's in, and which features are enabled. Without a startup banner, this information is not readily available.

**Impact:** Slower incident response; difficulty correlating logs across environments.

**Remediation:** Add a structured startup log (at info level) that includes:
- `NODE_ENV`
- `APP_URL` (safe to log — not a secret)
- Enabled features (OAuth, mobile API, step-up MFA, geo-IP)
- `SECURITY_WEBHOOK_URL` status (set/unset — not the URL itself)
- Application version from `package.json`

**Acceptance Criteria:**
1. A structured startup log entry is emitted when the application boots.
2. The log entry does NOT contain any secret values.

**Regression Tests:**
```typescript
it('emits startup banner with environment info', () => {
  const consoleSpy = vi.spyOn(console, 'log');
  getEnv();
  expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('APP_URL'));
});
```

---

## Security Event Log Hygiene — What Must NOT Be Logged

Based on the code review, the following must NEVER appear in logs:

| Prohibited Data | Risk | Current Status |
|---|---|---|
| `SESSION_SECRET` | Session forgery | ✅ Not logged (env.ts:142) |
| `ARGON2_SECRET` | Password hash cracking | ✅ Not logged |
| `MONGODB_URI` (full) | Credential exposure | ⚠️ Partial leak in config.ts:54 |
| `GOOGLE_CLIENT_SECRET` | OAuth impersonation | ✅ Not logged |
| `EMAIL_PASSWORD` | SMTP account compromise | ✅ Not logged |
| `ADMIN_SEED_PASSWORD` | Admin account compromise | ✅ Not logged |
| `MOBILE_JWT_PRIVATE_KEY_B64` | JWT forgery | ✅ Not logged |
| Session cookie values | Session hijacking | ✅ Not logged (only userId in audit) |
| Refresh token values | Token replay | ✅ Not logged (only hash in DB) |
| 2FA codes / reset links | Account takeover | ⚠️ Logged in dev mode (mailer.ts:53) |
| User passwords (plaintext) | Credential exposure | ✅ Never logged (Argon2 hash only) |
| Full IP addresses | Privacy / PII | ⚠️ Logged in audit log (acceptable for security) |
| User-Agent strings | Privacy | ⚠️ Logged in audit log (acceptable for security) |

---

## Recommended Alerts Matrix

| Alert | Trigger | Severity | Channel |
|---|---|---|---|
| **Refresh token reuse** | `auth.refresh.reuse_detected` | Critical | Webhook + Email |
| **Login failure spike** | `auth.login.failure_spike` (≥10 in 5 min) | Critical | Webhook |
| **New device login** | `auth.login.new_device` | Warning | Webhook |
| **Country change** | `auth.login.suspicious` | Warning | Webhook |
| **Password reset** | `auth.password.reset.success` | Warning | Webhook |
| **OAuth failure** | `auth.oauth.failed` | Warning | Webhook |
| **Mail delivery failure** | `mail.delivery_failed` (proposed) | Warning | Webhook |
| **Database connection failure** | `db.command.failed` (error) | Critical | Webhook |
| **Slow queries** | `db.slow_query` (>100ms) | Info | Console / Metrics |
| **Missing secrets at boot** | `FATAL: ... MISSING` | Critical | Crash + Alert |
| **HSTS missing** | E2E test failure | High | CI Alert |
| **Dependency vulnerability** | `pnpm audit` critical | High | CI Alert |

---

## Dependency Security Recommendations

| Item | Recommendation | Priority |
|---|---|---|
| **Automated scanning** | Add `pnpm audit --audit-level=critical` to CI | High |
| **Dependency updates** | Enable Dependabot or Renovate | High |
| **Lock file integrity** | Commit `pnpm-lock.yaml` (already done) | Done |
| **Supply chain** | Pin exact versions for critical deps (`argon2`, `jose`, `mongodb`) | Medium |
| **SLSA provenance** | Generate build provenance for production artifacts | Low |
| **SBOM** | Generate Software Bill of Materials | Low |

---

## Summary Table

| ID | Finding | Severity | Confidence | Blocker |
|---|---|---|---|---|
| OPS-001 | Debug file writes in production 2FA | Critical | High | Yes |
| OPS-002 | Dev mode logs 2FA codes and reset links | Medium | High | No |
| OPS-003 | Database config leaks partial URI | Medium | High | No |
| OPS-004 | Security webhook is optional | Medium | High | No |
| OPS-005 | login_attempts TTL is 24 hours | Low | High | No |
| OPS-006 | Spike buckets reset on restart | Low | High | No |
| OPS-007 | No dependency vulnerability scanning | Medium | High | No |
| OPS-008 | Audit log retention is 180 days | Low | High | No |
| OPS-009 | Alerting is fire-and-forget | None (pass) | High | No |
| OPS-010 | Mail failures silently swallowed | Low | High | No |
| OPS-011 | No startup banner | Low | High | No |

---

## Recommendations Priority

1. **OPS-001** — Remove debug `fs.appendFileSync` calls from `verify-2fa.ts` **immediately** (Critical, production blocker)
2. **OPS-007** — Add `pnpm audit` to CI pipeline (Medium, high impact)
3. **OPS-004** — Add startup warning for missing `SECURITY_WEBHOOK_URL` (Medium, medium effort)
4. **OPS-003** — Remove URI prefix from database config error (Medium, low effort)
5. **OPS-002** — Guard dev email logging with `NODE_ENV` check (Medium, low effort)
6. **OPS-005** — Extend `login_attempts` TTL to 7 days (Low, low effort)
7. **OPS-010** — Forward mail failures to alerting sink (Low, low effort)
8. **OPS-006** — Document in-memory spike limitation (Low, low effort)
9. **OPS-011** — Add structured startup banner (Low, low effort)
