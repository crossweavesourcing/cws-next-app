# 16 — Deployment and Operational Audit

| Field | Value |
|---|---|
| Audit Date | 2026-07-28 |
| Scope | Environment validation, boot guards, database schema, indexes, graceful shutdown, health checks, operational infrastructure, dependency security |
| Files Reviewed | `src/auth/config/env.ts`, `src/database/client.ts`, `src/database/config.ts`, `src/database/indexes/*.indexes.ts`, `next.config.ts`, `package.json`, `tsconfig.json` |

---

## Executive Summary

The application demonstrates strong operational foundations with Zod-based environment validation, fail-closed production boot guards, JSON Schema database validation, comprehensive indexing, graceful shutdown handlers, health checks, audit log archival, TTL pruning, slow query detection, and connection retry with exponential backoff and jitter. The primary gaps are in infrastructure-level controls (HTTPS, HSTS, security headers at the edge) and operational tooling (production backup strategy, monitoring, CI/CD secret protection) that fall outside the application code boundary.

---

## Environment Validation

### Zod Schema Validation (Positive)

| Field | Value |
|---|---|
| Severity | **None** (positive finding) |
| Confidence | **High** |
| Evidence | `src/auth/config/env.ts` — all environment variables validated through Zod schemas |

**Validation:**
- All environment variables are validated at startup using Zod schemas.
- Type-safe access through `getEnv()` function.
- Invalid configurations produce clear error messages with variable names (not values).
- Environment configuration is centralized in a single module.

---

### Fail-Closed Production Boot Guards (Positive)

| Field | Value |
|---|---|
| Severity | **None** (positive finding) |
| Confidence | **High** |
| Evidence | `src/auth/config/env.ts:112-280` — multiple guards enforce production requirements |

**Boot guards verified:**
| Guard | Behavior | Evidence |
|---|---|---|
| `SESSION_SECRET` | min 32 chars, blocklist of defaults | `env.ts:112-137` |
| `ARGON2_SECRET` | min 16 chars in production | `env.ts:210-218` |
| `SECURE_COOKIES` | must be `'true'` in production | `env.ts:273-280` |
| `TRUSTED_PROXY_IP_HEADER` | required in production | `env.ts:231-239` |
| Required secrets | lists missing (not values) | `env.ts:152-179` |

**Result:** All critical production secrets and configuration values are validated at boot. Missing or insecure values prevent the application from starting.

---

## Database

### Schema Validation (Positive)

| Field | Value |
|---|---|
| Severity | **None** (positive finding) |
| Confidence | **High** |
| Evidence | `src/database/config.ts` — JSON Schema validation with strict level |

**Validation:**
- Database configuration includes JSON Schema validation for collection documents.
- Strict validation level rejects documents that don't match the schema.
- URI scheme is validated (must start with `mongodb://` or `mongodb+srv://`).

---

### Database Indexes (Positive)

| Field | Value |
|---|---|
| Severity | **None** (positive finding) |
| Confidence | **High** |
| Evidence | `src/database/indexes/*.indexes.ts` — 29+ indexes across collections |

**Index inventory:**
| Collection | Index Count | Purpose |
|---|---|---|
| `login_attempts` | 6+ | Rate limiting, IP tracking, identifier tracking, TTL |
| `users` | 4+ | Email lookup, status, OAuth provider, MFA |
| `sessions` | 4+ | User lookup, refresh token, expiry, active status |
| `pending_authentications` | 3+ | Token lookup, expiry, user correlation |
| `verification_tokens` | 3+ | Token lookup, expiry, purpose |
| `recovery_codes` | 2+ | User lookup, hash-based redemption |
| `audit_logs` | 4+ | User lookup, event type, timestamp, TTL |
| `webauthn_credentials` | 3+ | User lookup, credential ID, sign count |

**Result:** Comprehensive indexing supports rate limiting, session management, and audit queries without full collection scans.

---

### MongoDB TLS Enforced (Positive)

| Field | Value |
|---|---|
| Severity | **None** (positive finding) |
| Confidence | **High** |
| Evidence | `src/database/client.ts:40` — `tls: true` |

---

### Connection Retry with Exponential Backoff and Jitter (Positive)

| Field | Value |
|---|---|
| Severity | **None** (positive finding) |
| Confidence | **High** |
| Evidence | `src/database/client.ts` — retry logic with exponential backoff and jitter |

**Validation:** Connection retries include exponential backoff with jitter to prevent thundering herd effects on database reconnection. This is critical for serverless deployments where many function instances may reconnect simultaneously.

---

## Operational Infrastructure

### Graceful Shutdown Handlers (Positive)

| Field | Value |
|---|---|
| Severity | **None** (positive finding) |
| Confidence | **High** |
| Evidence | Application registers `SIGTERM`/`SIGINT` handlers for graceful shutdown |

**Validation:** Graceful shutdown ensures in-flight requests complete and database connections are properly closed before the process exits.

---

### Health Checks (Positive)

| Field | Value |
|---|---|
| Severity | **None** (positive finding) |
| Confidence | **High** |
| Evidence | Health check endpoint available for uptime monitoring |

**Validation:** Health check endpoint allows load balancers and monitoring systems to verify application availability.

---

### Audit Log Archival (Positive)

| Field | Value |
|---|---|
| Severity | **None** (positive finding) |
| Confidence | **High** |
| Evidence | Audit logs include archival mechanism for long-term retention |

---

### TTL Pruning (Positive)

| Field | Value |
|---|---|
| Severity | **None** (positive finding) |
| Confidence | **High** |
| Evidence | `src/database/indexes/audit-logs.indexes.ts` and login_attempts indexes include TTL |

**Validation:** TTL indexes automatically prune expired records (login attempts, pending authentications, old audit logs) to prevent unbounded collection growth.

---

### Slow Query Detection (Positive)

| Field | Value |
|---|---|
| Severity | **None** (positive finding) |
| Confidence | **High** |
| Evidence | Database client includes slow query detection and logging |

**Validation:** Slow queries are detected and logged, enabling operational teams to identify and address performance issues before they impact availability.

---

## Findings

### DEPLOY-001 — HTTPS Enforcement at Edge Not Verified

| Field | Value |
|---|---|
| Severity | **High** |
| Confidence | **High** |
| Production Blocker | Yes (deployment-level) |
| Evidence | `next.config.ts` — no HTTPS redirect configuration; application relies on edge/platform configuration |

**Attack Scenario:** Without HTTPS enforcement at the edge, the initial request may be served over HTTP. An attacker on the same network can intercept the session cookie before the redirect to HTTPS completes (SSL stripping).

**Impact:** Session cookie interception; credential theft.

**Root Cause:** The application defers HTTPS enforcement to the hosting platform (Vercel/Netlify/Cloudflare). This is standard practice for serverless deployments but must be verified at the infrastructure level.

**Remediation:**
1. Document the required edge configuration for HTTPS enforcement.
2. Add an E2E test that verifies HTTP-to-HTTPS redirect behavior.
3. Verify the hosting platform configuration includes HTTPS enforcement.

**Acceptance Criteria:**
1. HTTP requests are redirected to HTTPS at the edge.
2. E2E test confirms redirect behavior.
3. Deployment documentation specifies HTTPS requirements.

**Regression Tests:**
```typescript
test('HTTP requests redirect to HTTPS', async ({ request }) => {
  const response = await request.get('http://example.com/dashboard/login/', {
    maxRedirects: 0
  });
  expect(response.status()).toBe(301);
  expect(response.headers()['location']).toMatch(/^https:\/\//);
});
```

---

### DEPLOY-002 — HSTS Header at Edge Not Verified

| Field | Value |
|---|---|
| Severity | **High** |
| Confidence | **High** |
| Production Blocker | Yes (deployment-level) |
| Evidence | `next.config.ts:32-35` — comment explicitly states HSTS must be at the edge; no `Strict-Transport-Security` header in `securityHeaders` array |

**Attack Scenario:** Without HSTS, a user navigating to the admin dashboard over HTTP sends the initial request in cleartext. SSL stripping attacks can downgrade the connection.

**Impact:** Session cookie interception on first visit; credential theft.

**Remediation:**
1. Document the required edge configuration:
   ```
   Strict-Transport-Security: max-age=63072000; includeSubDomains; preload
   ```
2. Add an E2E test that asserts the `Strict-Transport-Security` header is present.
3. Consider adding the header in `next.config.ts` as defense-in-depth.

**Acceptance Criteria:**
1. E2E test verifies `Strict-Transport-Security` is present with `max-age >= 31536000`.
2. Deployment documentation specifies the required edge header.
3. The header uses `includeSubDomains` and optionally `preload`.

**Regression Tests:**
```typescript
test('HSTS header is present on admin routes', async ({ page }) => {
  const response = await page.goto('/dashboard/login/');
  const hsts = response?.headers()['strict-transport-security'];
  expect(hsts).toContain('max-age=');
  expect(parseInt(hsts.match(/max-age=(\d+)/)?.[1] ?? '0')).toBeGreaterThanOrEqual(31536000);
});
```

---

### DEPLOY-003 — X-Content-Type-Options at Edge Not Verified

| Field | Value |
|---|---|
| Severity | **Low** |
| Confidence | **Medium** |
| Production Blocker | No |
| Evidence | `next.config.ts:37-61` — `X-Content-Type-Options: nosniff` configured in application headers; edge delivery may strip or override |

**Attack Scenario:** If the edge/CDN does not preserve the `X-Content-Type-Options` header, browsers may MIME-sniff responses and execute content as scripts.

**Impact:** Limited — the application sets the header, but edge delivery may not preserve it.

**Remediation:** Verify the edge/CDN preserves security headers. Add an E2E test that checks the header in production responses.

**Acceptance Criteria:**
1. E2E test verifies `X-Content-Type-Options: nosniff` is present in production responses.

---

### DEPLOY-004 — Referrer-Policy at Edge Not Verified

| Field | Value |
|---|---|
| Severity | **Low** |
| Confidence | **Medium** |
| Production Blocker | No |
| Evidence | `next.config.ts:37-61` — `Referrer-Policy: no-referrer` configured; edge may not preserve |

**Remediation:** Same as DEPLOY-003 — verify edge preserves the header.

---

### DEPLOY-005 — Permissions-Policy at Edge Not Verified

| Field | Value |
|---|---|
| Severity | **Low** |
| Confidence | **Medium** |
| Production Blocker | No |
| Evidence | `next.config.ts:50-52` — `Permissions-Policy` configured for camera, microphone, geolocation; edge may not preserve; also limited feature set (see DEPLOY-006) |

**Remediation:** Same as DEPLOY-003 — verify edge preserves the header.

---

### DEPLOY-006 — Missing Permissions-Policy Directives for Modern Browser Features

| Field | Value |
|---|---|
| Severity | **Low** |
| Confidence | **High** |
| Production Blocker | No |
| Evidence | `next.config.ts:50-52` — only `camera`, `microphone`, `geolocation` are restricted |

**Attack Scenario:** The browser allows other powerful features by default (payment, USB, MIDI, screen wake lock, etc.). An XSS or injected script could abuse these APIs.

**Impact:** Limited — the admin dashboard does not use these features, but the principle of least privilege recommends disabling them.

**Remediation:** Extend to a comprehensive deny list:
```
camera=(), microphone=(), geolocation=(), payment=(), usb=(), magnetometer=(), gyroscope=(), accelerometer=(), ambient-light-sensor=(), autoplay=(), battery=(), display-capture=(), encrypted-media=(), gamepad=(), keyboard-map=(), midi=(), picture-in-picture=(), speaker=(), sync-xhr=(self), web-share=(), xr-spatial-tracking=()
```

**Acceptance Criteria:**
1. `Permissions-Policy` header includes deny directives for all high-risk browser features.

**Regression Tests:**
```typescript
test('Permissions-Policy disables high-risk features', async ({ page }) => {
  const response = await page.goto('/dashboard/login/');
  const policy = response?.headers()['permissions-policy'];
  expect(policy).toContain('payment=');
  expect(policy).toContain('usb=');
});
```

---

### DEPLOY-007 — Production Database Backup Strategy Not Verified

| Field | Value |
|---|---|
| Severity | **High** |
| Confidence | **High** |
| Production Blocker | Yes (operational) |
| Evidence | No backup configuration found in application code; relies entirely on database hosting platform |

**Attack Scenario:** Data loss from accidental deletion, ransomware, or database corruption without a backup strategy in place.

**Impact:** Complete data loss; no recovery path.

**Root Cause:** Backup strategy is an infrastructure concern outside the application code boundary.

**Remediation:**
1. Document the required backup strategy (frequency, retention, geographic distribution).
2. Verify the MongoDB Atlas (or equivalent) backup configuration.
3. Test backup restoration periodically.

**Acceptance Criteria:**
1. Backup strategy is documented.
2. Backups are verified to include all authentication-related collections.
3. Restoration is tested at least quarterly.

---

### DEPLOY-008 — Production Logging Infrastructure Not Verified

| Field | Value |
|---|---|
| Severity | **Medium** |
| Confidence | **High** |
| Production Blocker | No |
| Evidence | Application uses `console.error` and audit_logs collection; no external logging infrastructure configured in code |

**Attack Scenario:** Without centralized logging, security events in the `audit_logs` collection may not be monitored, and operational errors may go undetected.

**Impact:** Delayed incident response; missed security events.

**Remediation:**
1. Document the required logging infrastructure (e.g., Datadog, Splunk, CloudWatch).
2. Verify that audit logs are exported to the logging infrastructure.
3. Configure alerts for critical security events (failed logins, account lockouts, MFA failures).

**Acceptance Criteria:**
1. Logging infrastructure is documented and operational.
2. Audit logs are exported and monitored.
3. Alerts are configured for critical security events.

---

### DEPLOY-009 — Production Monitoring and Alerting Not Verified

| Field | Value |
|---|---|
| Severity | **Medium** |
| Confidence | **High** |
| Production Blocker | No |
| Evidence | `src/auth/services/alerting.service.ts` — in-app alerting exists but external monitoring not configured in code |

**Remediation:**
1. Document the required monitoring stack (uptime, error rates, latency).
2. Verify alerting thresholds for authentication failures.
3. Test alert delivery channels.

**Acceptance Criteria:**
1. Monitoring infrastructure is documented and operational.
2. Alerts fire for critical authentication failures.

---

### DEPLOY-010 — CI/CD Secret Protection Not Verified

| Field | Value |
|---|---|
| Severity | **Medium** |
| Confidence | **High** |
| Production Blocker | No |
| Evidence | No CI/CD configuration found in repository; secret protection depends on platform configuration |

**Attack Scenario:** Secrets may be exposed in CI/CD logs, build artifacts, or deployment pipelines if not properly configured.

**Impact:** Secret leakage; credential theft.

**Remediation:**
1. Document the CI/CD secret management approach (GitHub Actions secrets, Vercel environment variables, etc.).
2. Verify secrets are not logged in CI/CD output.
3. Verify build artifacts do not contain secrets.

**Acceptance Criteria:**
1. CI/CD secret management is documented.
2. Secrets are not exposed in CI/CD logs or build artifacts.

---

### DEPLOY-011 — Preview Environment Isolation Not Verified

| Field | Value |
|---|---|
| Severity | **Medium** |
| Confidence | **High** |
| Production Blocker | No |
| Evidence | No preview environment configuration found; relies on hosting platform defaults |

**Attack Scenario:** Preview environments may share databases, secrets, or network access with production, allowing attackers to pivot from preview to production.

**Impact:** Production data exposure; cross-environment attack surface.

**Remediation:**
1. Document the preview environment isolation strategy.
2. Verify preview environments use separate databases and secrets.
3. Verify preview environments are not accessible from the public internet without authentication.

**Acceptance Criteria:**
1. Preview environments are isolated from production.
2. Preview databases are separate from production databases.

---

### DEPLOY-012 — WebAuthn Origin Enforced as HTTPS in Production (Positive)

| Field | Value |
|---|---|
| Severity | **None** (positive finding) |
| Confidence | **High** |
| Evidence | `src/auth/config/env.ts:331-336` — throws if origin is not `https:` in production |

**Validation:** WebAuthn origin validation ensures HTTPS is used in production, preventing credential injection over HTTP.

---

### DEPLOY-013 — CSP Nonce Correctly Generated Per-Request (Positive)

| Field | Value |
|---|---|
| Severity | **None** (positive finding) |
| Confidence | **High** |
| Evidence | `src/proxy.ts:105` — `crypto.randomBytes(16).toString('base64')` |

**Validation:**
- Nonce is generated fresh per request using cryptographically secure random bytes.
- 16 bytes = 128 bits of entropy.
- Exposed to Server Components via `x-csp-nonce` request header.
- `unsafe-inline` is removed from `script-src` on dashboard routes.

---

### DEPLOY-014 — Static CSP Allows unsafe-inline for style-src

| Field | Value |
|---|---|
| Severity | **Low** |
| Confidence | **High** |
| Production Blocker | No |
| Evidence | `next.config.ts:59` — `style-src 'self' 'unsafe-inline'`; `src/proxy.ts:40` — `style-src 'self' 'unsafe-inline' https://fonts.googleapis.com` |

**Attack Scenario:** An attacker who achieves XSS could inject inline styles for data exfiltration (CSS keyloggers via `background: url(...)`) or UI redressing.

**Impact:** Limited — React and Next.js use runtime inline styles that require `unsafe-inline` in `style-src`. The `script-src` nonce protection is the primary XSS defense.

**Remediation:** Accept the `unsafe-inline` for `style-src` as a framework requirement. The `script-src` nonce protection is the primary defense.

**Acceptance Criteria:**
1. `style-src` includes `unsafe-inline` only (not `unsafe-eval`).
2. `script-src` does NOT include `unsafe-inline` on dashboard routes.

---

### DEPLOY-015 — CORS Configuration for Mobile API

| Field | Value |
|---|---|
| Severity | **Low** |
| Confidence | **Medium** |
| Production Blocker | No |
| Evidence | `src/auth/config/env.ts:29-31` — `MOBILE_ALLOWED_ORIGINS` defaults to empty array |

**Attack Scenario:** If `MOBILE_ALLOWED_ORIGINS` is not configured, the mobile API CORS check may reject all cross-origin requests (fail-closed) or accept all (fail-open), depending on implementation.

**Remediation:** Verify the CORS middleware implementation checks `allowedOrigins.length === 0` and rejects cross-origin requests in that case.

**Acceptance Criteria:**
1. When `MOBILE_ALLOWED_ORIGINS` is empty, CORS rejects all cross-origin requests.

---

## Dependency Security

### Current Dependencies

| Package | Version | Status | Maintained | Notes |
|---|---|---|---|---|
| `argon2` | 0.44.0 | Current | Yes | Password hashing with pepper |
| `jose` | 6.2.3 | Current | Yes | EdDSA/Ed25519 JWT for mobile API |
| `otplib` | 13.4.1 | Current | Yes | TOTP generation and verification |
| `@simplewebauthn/server` | 13.3.2 | Current | Yes | WebAuthn/passkey support |
| `mongodb` | 6.16.0 | Current | Yes | MongoDB driver |
| `nodemailer` | 6.9.16 | Current | Yes | Email delivery |
| `next` | 16.2.7 | Current | Yes | Next.js framework |
| `zod` | 4.4.3 | Current | Yes | Schema validation |

**Result:** All core authentication dependencies are current and actively maintained. No known vulnerabilities in the specified versions.

---

## Summary Table

| ID | Finding | Severity | Confidence | Blocker |
|---|---|---|---|---|
| DEPLOY-001 | HTTPS enforcement at edge not verified | High | High | Yes (deployment) |
| DEPLOY-002 | HSTS header at edge not verified | High | High | Yes (deployment) |
| DEPLOY-003 | X-Content-Type-Options at edge not verified | Low | Medium | No |
| DEPLOY-004 | Referrer-Policy at edge not verified | Low | Medium | No |
| DEPLOY-005 | Permissions-Policy at edge not verified | Low | Medium | No |
| DEPLOY-006 | Missing Permissions-Policy directives | Low | High | No |
| DEPLOY-007 | Production database backup not verified | High | High | Yes (operational) |
| DEPLOY-008 | Production logging infrastructure not verified | Medium | High | No |
| DEPLOY-009 | Production monitoring/alerting not verified | Medium | High | No |
| DEPLOY-010 | CI/CD secret protection not verified | Medium | High | No |
| DEPLOY-011 | Preview environment isolation not verified | Medium | High | No |
| DEPLOY-012 | WebAuthn HTTPS enforced | None (pass) | High | No |
| DEPLOY-013 | CSP nonce generation | None (pass) | High | No |
| DEPLOY-014 | style-src unsafe-inline | Low | High | No |
| DEPLOY-015 | CORS mobile origins optional | Low | Medium | No |

---

## Recommendations Priority

1. **DEPLOY-001** — Verify and document HTTPS enforcement at the edge; add E2E test (High impact, Low effort)
2. **DEPLOY-002** — Verify and document HSTS at the edge; add E2E test (High impact, Low effort)
3. **DEPLOY-007** — Document and verify production database backup strategy (High impact, Low effort)
4. **DEPLOY-008** — Document and verify production logging infrastructure (Medium impact, Low effort)
5. **DEPLOY-009** — Document and verify production monitoring/alerting (Medium impact, Low effort)
6. **DEPLOY-010** — Document and verify CI/CD secret protection (Medium impact, Low effort)
7. **DEPLOY-006** — Extend Permissions-Policy to deny all high-risk features (Low impact, Low effort)
