# 18 — Detailed Security Findings (Fresh Audit)

**Audit Date:** 2026-07-28
**Commit:** 32af9be
**Branch:** main
**Auditor:** opencode/big-pickle

This document consolidates ALL findings from reports 04–17 with complete detail structure for each.

---

## Table of Contents

- [P0 — Critical](#p0--critical)
- [P1 — High](#p1--high)
- [P2 — Medium](#p2--medium)
- [P3 — Low and Informational](#p3--low-and-informational)

---

## P0 — Critical

_No P0 findings identified in this fresh audit. Previous audit production blockers (OPS-001 debug file writes, RATE-004 rate-limit collapse, OAUTH-015 missing unique index, DEPLOY-001 HSTS) have been addressed or downgraded._

---

## P1 — High

### FINDING-01 — Refresh Cookie SameSite Inconsistency in OAuth Callback

| Field | Value |
|---|---|
| **Finding ID** | OAUTH-004 |
| **Title** | Refresh Cookie SameSite='lax' in OAuth Callback vs 'strict' Elsewhere |
| **Status** | Confirmed |
| **Severity** | Medium |
| **Confidence** | High |
| **Production Blocker** | No |
| **Affected Components** | `src/app/api/auth/google/callback/route.ts` |
| **Affected Workflows** | Google OAuth login, Session refresh |
| **CWE** | CWE-1275 |
| **ASVS** | V3.5.3 |
| **Summary** | The `cws_refresh` cookie is set with `SameSite: 'lax'` in the OAuth callback route but `SameSite: 'strict'` in the refresh route and `setAuthCookies()`. This inconsistency weakens the SameSite policy after OAuth login. |
| **Evidence** | `src/app/api/auth/google/callback/route.ts:151-157` vs `src/app/api/auth/refresh/route.ts:114` |
| **Attack Scenario** | After an OAuth login, an attacker crafts a cross-site form POST to `/api/auth/refresh`. With `SameSite: 'lax'`, the browser sends the refresh cookie. The `assertSameOriginStrict()` CSRF guard provides a second layer, but the defense-in-depth is weakened. |
| **Impact** | Medium — CSRF origin check mitigates but cookie policy defense-in-depth is inconsistent |
| **Preconditions** | User must have completed an OAuth login (not password login) |
| **Root Cause** | The OAuth callback route manually sets cookies instead of using the shared `setAuthCookies()` function |
| **Remediation** | Change `sameSite: 'lax'` to `sameSite: 'strict'` on line 152 of `src/app/api/auth/google/callback/route.ts`. Or refactor to use `setAuthCookies()`. |
| **Acceptance Criteria** | Refresh cookie always uses `SameSite: 'strict'` regardless of authentication method |
| **Required Regression Tests** | Verify refresh cookie SameSite is 'strict' after OAuth login |
| **Priority** | P1 |
| **Effort** | Small |
| **Suggested Owner** | Backend security |
| **Residual Risk** | Low after fix — existing CSRF origin check provides defense-in-depth |
| **Source** | 06-google-oauth-audit.md |

---

### FINDING-02 — TOTP Re-enrollment Does Not Require Sudo Mode

| Field | Value |
|---|---|
| **Finding ID** | MFA-BYPASS-002 |
| **Title** | TOTP Re-enrollment Does Not Require Sudo Mode |
| **Status** | Confirmed |
| **Severity** | Medium |
| **Confidence** | High |
| **Production Blocker** | No |
| **Affected Components** | `src/auth/actions/mfa.ts` |
| **Affected Workflows** | TOTP enrollment, MFA management |
| **CWE** | CWE-308 |
| **ASVS** | V2.8.1 |
| **Summary** | `verifyAndEnableTotpAction` calls `requireActiveSession()` but not `requireSudoMode()`. An attacker with a valid session could replace the victim's TOTP secret by enrolling their own authenticator. |
| **Evidence** | `src/auth/actions/mfa.ts:35-46` |
| **Attack Scenario** | Attacker obtains a valid session cookie (e.g., via XSS on a vulnerable page). They generate a new TOTP secret and verify a code from their own authenticator, replacing the victim's TOTP. |
| **Impact** | Medium — Attacker needs a valid session first; TOTP replacement grants persistent MFA bypass |
| **Preconditions** | Valid session cookie required; TOTP must already be enabled on the account |
| **Root Cause** | `verifyAndEnableTotpAction` uses `requireActiveSession()` instead of `requireSudoMode()` |
| **Remediation** | Add `requireSudoMode()` check when TOTP is already enabled (re-enrollment). For first-time enrollment, `requireActiveSession()` is sufficient. |
| **Acceptance Criteria** | TOTP re-enrollment when TOTP is already enabled requires recent password re-authentication |
| **Required Regression Tests** | Verify TOTP re-enrollment is rejected without sudo mode when TOTP is already enabled |
| **Priority** | P1 |
| **Effort** | Small |
| **Suggested Owner** | Backend security |
| **Residual Risk** | Low after fix — sudo mode provides re-authentication gate |
| **Source** | 10-mfa-bypass-and-recovery-audit.md |

---

### FINDING-03 — No Rate Limiting on Session Refresh Endpoint

| Field | Value |
|---|---|
| **Finding ID** | RATE-004 |
| **Title** | No Rate Limiting on Session Refresh Endpoint |
| **Status** | Confirmed |
| **Severity** | Medium |
| **Confidence** | High |
| **Production Blocker** | No |
| **Affected Components** | `src/app/api/auth/refresh/route.ts` |
| **Affected Workflows** | Session refresh |
| **CWE** | CWE-770 |
| **ASVS** | V2.2.1 |
| **Summary** | The refresh endpoint has no per-IP or per-token rate limit. An attacker with a valid refresh token could flood the endpoint, consuming serverless compute and database connections. |
| **Evidence** | `src/app/api/auth/refresh/route.ts:23-106` |
| **Attack Scenario** | Attacker floods `POST /api/auth/refresh` at high frequency. Each call triggers MongoDB read+write (token rotation), potentially exhausting the connection pool (`maxPoolSize: 10`). |
| **Impact** | Medium — Denial-of-service against all authenticated users; DB connection pool exhaustion |
| **Preconditions** | Valid (or stolen) refresh token |
| **Root Cause** | Refresh endpoint relies on origin-check and token rotation but has no explicit request throttle |
| **Remediation** | Add per-IP rate limit (e.g., 60 requests/min) and/or per-refresh-token limit (e.g., 5 rotations per 5 min) using existing `LoginAttemptRepository` pattern. |
| **Acceptance Criteria** | `POST /api/auth/refresh` returns HTTP 429 with `Retry-After` header when limit exceeded |
| **Required Regression Tests** | Unit test verifying 429 when per-IP refresh limit exceeded |
| **Priority** | P1 |
| **Effort** | Medium |
| **Suggested Owner** | Backend security |
| **Residual Risk** | Low after fix — rate limit prevents flooding |
| **Source** | 14-rate-limit-and-abuse-audit.md |

---

### FINDING-04 — TOTP_ENCRYPTION_KEY Boot Guard Not Verified

| Field | Value |
|---|---|
| **Finding ID** | SECRET-008 |
| **Title** | TOTP_ENCRYPTION_KEY Boot Guard Not Verified |
| **Status** | Likely |
| **Severity** | Medium |
| **Confidence** | Medium |
| **Production Blocker** | No |
| **Affected Components** | `src/auth/config/env.ts`, `src/auth/services/mfa.ts` |
| **Affected Workflows** | TOTP enrollment, TOTP verification |
| **CWE** | CWE-320 |
| **ASVS** | V6.5.1 |
| **Summary** | The `TOTP_ENCRYPTION_KEY` is required in production (validated at boot) but the boot guard was not explicitly verified during this audit. If missing or weak, TOTP secrets could be encrypted with a default key, compromising 2FA. |
| **Evidence** | `src/auth/config/env.ts:11` (schema), `src/auth/services/mfa.ts` (usage) |
| **Attack Scenario** | Production runs without `TOTP_ENCRYPTION_KEY` or with a weak key. Attacker with DB access decrypts all TOTP secrets. |
| **Impact** | Medium — TOTP 2FA bypass for all enrolled users if key is weak/missing |
| **Preconditions** | Database access required; TOTP_ENCRYPTION_KEY must be missing or weak |
| **Root Cause** | Boot guard may not enforce minimum length or complexity for the key |
| **Remediation** | Add explicit fail-closed boot guard: require minimum 32 characters, refuse to boot if missing in production. |
| **Acceptance Criteria** | Production boot fails without `TOTP_ENCRYPTION_KEY`; key minimum length enforced |
| **Required Regression Tests** | Verify production boot fails without `TOTP_ENCRYPTION_KEY` |
| **Priority** | P1 |
| **Effort** | Small |
| **Suggested Owner** | Backend security |
| **Residual Risk** | Low after fix — boot guard prevents misconfiguration |
| **Source** | 15-logging-and-secrets-audit.md |

---

### FINDING-05 — Dev-Mode Mailer Logs 2FA Codes and Reset Links

| Field | Value |
|---|---|
| **Finding ID** | OTP-012 |
| **Title** | Dev-Mode Mailer Logs 2FA Codes and Reset Links to stdout |
| **Status** | Confirmed |
| **Severity** | Medium |
| **Confidence** | High |
| **Production Blocker** | No |
| **Affected Components** | `src/auth/services/mailer.ts` |
| **Affected Workflows** | Email OTP delivery, Password reset email |
| **CWE** | CWE-532 |
| **ASVS** | V7.1.1 |
| **Summary** | When email env vars are not configured, the dev fallback logs full email content (2FA codes, reset links) to `console.info`. If production runs without email config, all sensitive codes would be logged. |
| **Evidence** | `src/auth/services/mailer.ts:52-54` |
| **Attack Scenario** | Production misconfigured without `EMAIL_USER`/`EMAIL_PASSWORD`. All 2FA codes and reset links logged to stdout/container logs. |
| **Impact** | Medium — Sensitive authentication codes exposed in logs |
| **Preconditions** | Production must lack email configuration |
| **Root Cause** | Dev fallback lacks a `NODE_ENV === 'production'` guard |
| **Remediation** | Add production guard: if `NODE_ENV === 'production'` and no email configured, throw error instead of logging. |
| **Acceptance Criteria** | Production without email config throws at startup; no email content logged in production |
| **Required Regression Tests** | Verify no email content logged in production mode |
| **Priority** | P1 |
| **Effort** | Small |
| **Suggested Owner** | Backend security |
| **Residual Risk** | Low after fix — fail-closed prevents misconfiguration |
| **Source** | 08-email-otp-audit.md |

---

### FINDING-06 — Debug Filesystem Writes in 2FA Verification

| Field | Value |
|---|---|
| **Finding ID** | LOG-001 |
| **Title** | Debug Filesystem Writes in verify-2fa.ts |
| **Status** | Confirmed |
| **Severity** | Low |
| **Confidence** | High |
| **Production Blocker** | No |
| **Affected Components** | `src/auth/actions/verify-2fa.ts` |
| **Affected Workflows** | 2FA verification |
| **CWE** | CWE-532 |
| **ASVS** | V7.1.1 |
| **Summary** | `fs.appendFileSync` writes device IDs and trust state to `debug-verify.log`. This debug instrumentation persists in production. |
| **Evidence** | `src/auth/actions/verify-2fa.ts:125-138` |
| **Attack Scenario** | In shared hosting/containerized environment, debug log file persists on disk and may be readable by other processes. |
| **Impact** | Low — Device IDs are not high-sensitivity, but unprotected file is information disclosure |
| **Preconditions** | Shared hosting or containerized deployment |
| **Root Cause** | Debug instrumentation left in code |
| **Remediation** | Remove `fs.appendFileSync` calls or gate behind a `DEBUG` environment variable. |
| **Acceptance Criteria** | No `fs.appendFileSync` calls write auth data to filesystem in production |
| **Required Regression Tests** | Verify no filesystem writes during 2FA verification |
| **Priority** | P1 |
| **Effort** | Small |
| **Suggested Owner** | Backend security |
| **Residual Risk** | Low after fix — no debug data written |
| **Source** | 15-logging-and-secrets-audit.md, 17-security-test-results.md |

---

## P2 — Medium

### FINDING-07 — OAuth State Comparison Uses Non-Timing-Safe Comparison

| Field | Value |
|---|---|
| **Finding ID** | OAUTH-002 |
| **Title** | OAuth State Comparison Uses !== Instead of timingSafeEqual |
| **Status** | Confirmed |
| **Severity** | Low |
| **Confidence** | High |
| **Production Blocker** | No |
| **Affected Components** | `src/auth/services/oauth.service.ts` |
| **Affected Workflows** | Google OAuth callback |
| **CWE** | CWE-208 |
| **ASVS** | V2.1.1 |
| **Summary** | OAuth state comparison uses `!==` instead of `crypto.timingSafeEqual()`. 256-bit entropy makes practical attack infeasible, but inconsistent with codebase conventions. |
| **Evidence** | `src/auth/services/oauth.service.ts:248` |
| **Attack Scenario** | Attacker measures precise response time of OAuth callback to determine matching characters of state. Still requires 2^255 attempts on average. |
| **Impact** | Low — 256-bit entropy makes timing attack infeasible |
| **Root Cause** | Standard JavaScript comparison used instead of timing-safe |
| **Remediation** | Replace with `crypto.timingSafeEqual(Buffer.from(state), Buffer.from(expectedState))` |
| **Acceptance Criteria** | State comparison uses timing-safe function |
| **Priority** | P2 |
| **Effort** | Small |
| **Suggested Owner** | Backend security |
| **Residual Risk** | Very low — entropy makes attack infeasible regardless |
| **Source** | 06-google-oauth-audit.md |

---

### FINDING-08 — No Per-IP Rate Limit on Password Reset Request

| Field | Value |
|---|---|
| **Finding ID** | RST-007 |
| **Title** | No Per-IP Rate Limit on Password Reset Request |
| **Status** | Confirmed |
| **Severity** | Low |
| **Confidence** | High |
| **Production Blocker** | No |
| **Affected Components** | `src/auth/services/password.service.ts` |
| **Affected Workflows** | Password reset request |
| **CWE** | CWE-770 |
| **ASVS** | V2.2.1 |
| **Summary** | Reset request records IP but does not call `checkIpRateLimit()`. An attacker could distribute reset requests across different emails from the same IP. |
| **Evidence** | `src/auth/services/password.service.ts:244-249` |
| **Attack Scenario** | Attacker sends reset requests for 20 different emails from one IP in 15 minutes. Per-email limit prevents flooding any single email, but IP limit does not trigger. |
| **Impact** | Low — Per-email limit already prevents individual email flooding |
| **Root Cause** | Per-IP check not added to reset request path |
| **Remediation** | Add `checkIpRateLimit(ipAddress)` at start of `requestReset()` |
| **Acceptance Criteria** | Per-IP rate limit enforced on password reset requests |
| **Priority** | P2 |
| **Effort** | Small |
| **Suggested Owner** | Backend security |
| **Residual Risk** | Low — per-email limit provides primary protection |
| **Source** | 05-password-recovery-audit.md |

---

### FINDING-09 — HSTS Header at Edge Not Verified

| Field | Value |
|---|---|
| **Finding ID** | DEPLOY-002 |
| **Title** | HSTS Header at Edge Not Verified |
| **Status** | Not Verified |
| **Severity** | High |
| **Confidence** | High |
| **Production Blocker** | Yes (deployment-level) |
| **Affected Components** | Edge/CDN configuration |
| **Affected Workflows** | All HTTPS connections |
| **CWE** | CWE-319 |
| **ASVS** | V1.2.1 |
| **Summary** | HSTS header (`Strict-Transport-Security`) is not set in application code and must be configured at the edge/CDN level. Without HSTS, SSL stripping attacks are possible on first visit. |
| **Evidence** | `next.config.ts:32-35` — comment states HSTS must be at edge |
| **Attack Scenario** | User navigates to admin dashboard over HTTP. Attacker on same network intercepts initial request before HTTPS redirect completes. |
| **Impact** | High — Session cookie interception on first visit |
| **Root Cause** | Application defers HTTPS enforcement to hosting platform |
| **Remediation** | 1. Verify hosting platform configures HSTS. 2. Add header in `next.config.ts` as defense-in-depth. 3. Add E2E test. |
| **Acceptance Criteria** | E2E test verifies `Strict-Transport-Security` header with `max-age >= 31536000` |
| **Priority** | P2 |
| **Effort** | Small |
| **Suggested Owner** | DevOps |
| **Residual Risk** | Low after verification — hosting platform likely enforces HTTPS |
| **Source** | 13-nextjs-csrf-browser-audit.md, 16-deployment-and-operational-audit.md |

---

### FINDING-10 — HTTPS Enforcement at Edge Not Verified

| Field | Value |
|---|---|
| **Finding ID** | DEPLOY-001 |
| **Title** | HTTPS Enforcement at Edge Not Verified |
| **Status** | Not Verified |
| **Severity** | High |
| **Confidence** | High |
| **Production Blocker** | Yes (deployment-level) |
| **Affected Components** | Edge/CDN configuration |
| **Affected Workflows** | All connections |
| **CWE** | CWE-319 |
| **ASVS** | V1.2.1 |
| **Summary** | HTTP-to-HTTPS redirect must be configured at the edge. Without it, initial requests may be served over HTTP. |
| **Evidence** | `next.config.ts` — no HTTPS redirect configuration |
| **Attack Scenario** | SSL stripping attack on initial HTTP request |
| **Impact** | High — Credential and session interception |
| **Root Cause** | Application relies on platform for HTTPS enforcement |
| **Remediation** | 1. Document required edge configuration. 2. Add E2E test. 3. Verify hosting platform. |
| **Acceptance Criteria** | HTTP requests redirect to HTTPS; E2E test confirms |
| **Priority** | P2 |
| **Effort** | Small |
| **Suggested Owner** | DevOps |
| **Residual Risk** | Low — serverless platforms typically enforce HTTPS by default |
| **Source** | 16-deployment-and-operational-audit.md |

---

### FINDING-11 — Production Database Backup Not Verified

| Field | Value |
|---|---|
| **Finding ID** | DEPLOY-007 |
| **Title** | Production Database Backup Strategy Not Verified |
| **Status** | Not Verified |
| **Severity** | High |
| **Confidence** | High |
| **Production Blocker** | Yes (operational) |
| **Affected Components** | Database infrastructure |
| **Affected Workflows** | Data persistence |
| **CWE** | CWE-404 |
| **ASVS** | V1.10.1 |
| **Summary** | No backup configuration found in application code. Relies entirely on database hosting platform. |
| **Evidence** | No backup configuration in repository |
| **Attack Scenario** | Data loss from accidental deletion, ransomware, or corruption without backup. |
| **Impact** | High — Complete data loss with no recovery path |
| **Root Cause** | Backup strategy is infrastructure concern outside application boundary |
| **Remediation** | 1. Document required backup strategy. 2. Verify MongoDB Atlas backup config. 3. Test restoration quarterly. |
| **Acceptance Criteria** | Backup strategy documented; restoration tested |
| **Priority** | P2 |
| **Effort** | Small |
| **Suggested Owner** | DevOps |
| **Residual Risk** | Low — MongoDB Atlas typically includes automated backups |
| **Source** | 16-deployment-and-operational-audit.md |

---

### FINDING-12 — Production Logging Infrastructure Not Verified

| Field | Value |
|---|---|
| **Finding ID** | DEPLOY-008 |
| **Title** | Production Logging Infrastructure Not Verified |
| **Status** | Not Verified |
| **Severity** | Medium |
| **Confidence** | High |
| **Production Blocker** | No |
| **Affected Components** | External logging infrastructure |
| **Affected Workflows** | Security event monitoring |
| **CWE** | CWE-778 |
| **ASVS** | V7.1.1 |
| **Summary** | Application uses `console.error` and audit_logs collection but no external logging infrastructure is configured in code. Security events may not be monitored. |
| **Evidence** | `src/auth/services/alerting.service.ts` — in-app alerting only |
| **Impact** | Medium — Delayed incident response; missed security events |
| **Root Cause** | Logging infrastructure is external to application code |
| **Remediation** | 1. Document required logging infrastructure. 2. Verify audit logs are exported. 3. Configure alerts for critical events. |
| **Acceptance Criteria** | Logging infrastructure documented and operational; alerts configured |
| **Priority** | P2 |
| **Effort** | Small |
| **Suggested Owner** | DevOps |
| **Residual Risk** | Low after verification — audit_logs collection provides baseline |
| **Source** | 16-deployment-and-operational-audit.md |

---

### FINDING-13 — Production Monitoring and Alerting Not Verified

| Field | Value |
|---|---|
| **Finding ID** | DEPLOY-009 |
| **Title** | Production Monitoring and Alerting Not Verified |
| **Status** | Not Verified |
| **Severity** | Medium |
| **Confidence** | High |
| **Production Blocker** | No |
| **Affected Components** | External monitoring infrastructure |
| **Affected Workflows** | Incident response |
| **CWE** | CWE-778 |
| **ASVS** | V7.1.1 |
| **Summary** | In-app alerting exists but external monitoring (uptime, error rates, latency) not configured in code. |
| **Evidence** | `src/auth/services/alerting.service.ts` |
| **Impact** | Medium — Missed incidents; delayed response |
| **Root Cause** | Monitoring is infrastructure concern |
| **Remediation** | 1. Document monitoring stack. 2. Verify alerting thresholds. 3. Test alert delivery. |
| **Acceptance Criteria** | Monitoring operational; alerts fire for critical failures |
| **Priority** | P2 |
| **Effort** | Small |
| **Suggested Owner** | DevOps |
| **Residual Risk** | Low after verification |
| **Source** | 16-deployment-and-operational-audit.md |

---

### FINDING-14 — CI/CD Secret Protection Not Verified

| Field | Value |
|---|---|
| **Finding ID** | DEPLOY-010 |
| **Title** | CI/CD Secret Protection Not Verified |
| **Status** | Not Verified |
| **Severity** | Medium |
| **Confidence** | High |
| **Production Blocker** | No |
| **Affected Components** | CI/CD pipeline |
| **Affected Workflows** | Deployment |
| **CWE** | CWE-200 |
| **ASVS** | V6.4.1 |
| **Summary** | No CI/CD configuration found in repository. Secret protection depends on platform configuration. |
| **Evidence** | No CI/CD config in repository |
| **Impact** | Medium — Secret leakage in CI/CD logs or build artifacts |
| **Root Cause** | CI/CD is external to application code |
| **Remediation** | 1. Document CI/CD secret management. 2. Verify secrets not logged. 3. Verify build artifacts clean. |
| **Acceptance Criteria** | CI/CD secret management documented; no secret exposure |
| **Priority** | P2 |
| **Effort** | Small |
| **Suggested Owner** | DevOps |
| **Residual Risk** | Low after verification |
| **Source** | 16-deployment-and-operational-audit.md |

---

### FINDING-15 — Preview Environment Isolation Not Verified

| Field | Value |
|---|---|
| **Finding ID** | DEPLOY-011 |
| **Title** | Preview Environment Isolation Not Verified |
| **Status** | Not Verified |
| **Severity** | Medium |
| **Confidence** | High |
| **Production Blocker** | No |
| **Affected Components** | Preview/staging environments |
| **Affected Workflows** | Multi-environment security |
| **CWE** | CWE-668 |
| **ASVS** | V1.4.1 |
| **Summary** | Preview environments may share databases, secrets, or network access with production. |
| **Evidence** | No preview environment configuration found |
| **Impact** | Medium — Production data exposure; cross-environment attack |
| **Root Cause** | Preview environment is infrastructure concern |
| **Remediation** | 1. Document isolation strategy. 2. Verify separate databases. 3. Verify no public access without auth. |
| **Acceptance Criteria** | Preview environments isolated from production |
| **Priority** | P2 |
| **Effort** | Small |
| **Suggested Owner** | DevOps |
| **Residual Risk** | Low after verification |
| **Source** | 16-deployment-and-operational-audit.md |

---

### FINDING-16 — No CAPTCHA on Login

| Field | Value |
|---|---|
| **Finding ID** | PWD-007 |
| **Title** | No CAPTCHA on Login |
| **Status** | Confirmed |
| **Severity** | Low |
| **Confidence** | High |
| **Production Blocker** | No |
| **Affected Components** | `src/app/api/auth/login/route.ts` |
| **Affected Workflows** | Login |
| **CWE** | CWE-307 |
| **ASVS** | V2.2.1 |
| **Summary** | Login relies on IP+identifier rate limiting without CAPTCHA. Sophisticated attacker could distribute attempts across IPs. |
| **Evidence** | No CAPTCHA mechanism in login flow |
| **Attack Scenario** | Botnet with 100+ IPs attempts 10 passwords per IP (below per-IP limit), resulting in 1000 attempts against one account. |
| **Impact** | Low — Per-identifier progressive delay and account lockout still protect accounts |
| **Root Cause** | CAPTCHA not implemented |
| **Remediation** | Consider CAPTCHA after N failed attempts as defense-in-depth |
| **Acceptance Criteria** | Decision documented on whether CAPTCHA is required |
| **Priority** | P2 |
| **Effort** | Medium |
| **Suggested Owner** | Product security |
| **Residual Risk** | Low — existing rate limiting provides adequate protection for internal tool |
| **Source** | 04-email-password-audit.md |

---

### FINDING-17 — Password Reset Token in URL Query Parameter

| Field | Value |
|---|---|
| **Finding ID** | RST-015 |
| **Title** | Reset Token Passed in URL Query Parameter |
| **Status** | Confirmed |
| **Severity** | Low |
| **Confidence** | High |
| **Production Blocker** | No |
| **Affected Components** | `src/auth/services/password.service.ts` |
| **Affected Workflows** | Password reset |
| **CWE** | CWE-598 |
| **ASVS** | V3.5.1 |
| **Summary** | Reset token in URL query parameter may appear in browser history, server logs, proxy logs, and Referer headers. |
| **Evidence** | `src/auth/services/password.service.ts:266` |
| **Attack Scenario** | Attacker gains access to browser history, proxy logs, or server access logs containing reset URL. |
| **Impact** | Low — Token is single-use and expires in 30 minutes; accessing logs requires prior access |
| **Root Cause** | Common pattern for email-based reset links |
| **Remediation** | Consider using fragment (`#token=...`) or POST-based flow |
| **Acceptance Criteria** | Decision documented on token transport method |
| **Priority** | P2 |
| **Effort** | Medium |
| **Suggested Owner** | Backend security |
| **Residual Risk** | Low — short-lived, single-use token limits exposure |
| **Source** | 05-password-recovery-audit.md |

---

### FINDING-18 — No Lockout Email Notification

| Field | Value |
|---|---|
| **Finding ID** | PWD-011 |
| **Title** | No Email Notification on Account Lockout |
| **Status** | Confirmed |
| **Severity** | Low |
| **Confidence** | High |
| **Production Blocker** | No |
| **Affected Components** | `src/auth/services/login.service.ts` |
| **Affected Workflows** | Account lockout |
| **CWE** | CWE-778 |
| **ASVS** | V7.1.1 |
| **Summary** | When account is locked due to 5 failed attempts, no email notification is sent. User may not know until they try to log in. |
| **Evidence** | `src/auth/services/login.service.ts:133-136` |
| **Attack Scenario** | Attacker locks victim's account. Victim doesn't notice for hours. By then lockout expired and attacker may have resumed. |
| **Impact** | Low — Lockout is temporary (15min); audit trail captures all attempts |
| **Root Cause** | No notification mechanism for lockout events |
| **Remediation** | Consider sending email on lockout (similar to `alertReuseDetected` pattern) |
| **Acceptance Criteria** | Decision documented on lockout notification |
| **Priority** | P2 |
| **Effort** | Small |
| **Suggested Owner** | Backend security |
| **Residual Risk** | Low — temporary lockout limits damage |
| **Source** | 04-email-password-audit.md |

---

### FINDING-19 — JWKS Fetch Has No Timeout

| Field | Value |
|---|---|
| **Finding ID** | OAUTH-009 |
| **Title** | No Timeout on JWKS Fetch |
| **Status** | Confirmed |
| **Severity** | Low |
| **Confidence** | High |
| **Production Blocker** | No |
| **Affected Components** | `src/auth/services/oauth.service.ts` |
| **Affected Workflows** | Google OAuth id_token verification |
| **CWE** | CWE-400 |
| **ASVS** | V2.8.1 |
| **Summary** | JWKS fetch has no timeout/abort controller. Slow Google response could consume function execution time. |
| **Evidence** | `src/auth/services/oauth.service.ts:56` |
| **Attack Scenario** | Google JWKS endpoint is slow; OAuth callback blocks until function timeout. |
| **Impact** | Low — Google JWKS is highly available; impact is availability degradation |
| **Root Cause** | No AbortController configured on fetch |
| **Remediation** | Add 5-10 second timeout using AbortController |
| **Acceptance Criteria** | JWKS fetch times out after configured duration |
| **Priority** | P2 |
| **Effort** | Small |
| **Suggested Owner** | Backend security |
| **Residual Risk** | Very low — fail-closed design prevents accepting unverified tokens |
| **Source** | 06-google-oauth-audit.md |

---

### FINDING-20 — IPv6 Address Normalization Not Verified

| Field | Value |
|---|---|
| **Finding ID** | RATE-006 |
| **Title** | IPv6 Address Normalization Not Verified |
| **Status** | Not Verified |
| **Severity** | Low |
| **Confidence** | Medium |
| **Production Blocker** | No |
| **Affected Components** | `src/auth/lib/request.ts` |
| **Affected Workflows** | Rate limiting |
| **CWE** | CWE-290 |
| **ASVS** | V2.2.1 |
| **Summary** | `getClientIp()` returns raw header value without IPv6 normalization. Different representations of same address create separate rate-limit buckets. |
| **Evidence** | `src/auth/lib/request.ts:33` |
| **Attack Scenario** | IPv6 client uses different address representations to multiply allowed attempts. |
| **Impact** | Low — Per-IP rate limits may be bypassed for IPv6 clients |
| **Root Cause** | No IP normalization in `getClientIp()` |
| **Remediation** | Normalize IPv6 addresses (collapse form, lowercase hex, strip leading zeros) |
| **Acceptance Criteria** | Equivalent IPv6 representations produce same rate-limit bucket |
| **Priority** | P2 |
| **Effort** | Small |
| **Suggested Owner** | Backend security |
| **Residual Risk** | Low — per-identifier limit still protects individual accounts |
| **Source** | 14-rate-limit-and-abuse-audit.md |

---

### FINDING-21 — Recovery Code Brute-Force Shares 2FA Failure Window

| Field | Value |
|---|---|
| **Finding ID** | RATE-007 |
| **Title** | Recovery Code Failures Share 2FA Failure Window |
| **Status** | Confirmed |
| **Severity** | Low |
| **Confidence** | High |
| **Production Blocker** | No |
| **Affected Components** | `src/auth/services/two-factor.service.ts` |
| **Affected Workflows** | 2FA verification, Recovery code use |
| **CWE** | CWE-307 |
| **ASVS** | V2.8.1 |
| **Summary** | Recovery code and email 2FA code failures share the same 5-per-15-minute counter. Attacker can alternate between two verification methods within budget. |
| **Evidence** | `src/auth/services/two-factor.service.ts:88-141` |
| **Attack Scenario** | Attacker submits recovery codes and email 2FA codes interchangeably, getting 5 attempts at each within the shared window. |
| **Impact** | Low — 5-per-15-min aggregate limit still applies |
| **Root Cause** | Shared failure counter for all 2FA methods |
| **Remediation** | Consider separate per-user counter for recovery code failures (e.g., 3 per 15 min) |
| **Acceptance Criteria** | Recovery code failures tracked independently |
| **Priority** | P2 |
| **Effort** | Small |
| **Suggested Owner** | Backend security |
| **Residual Risk** | Low — aggregate limit provides protection |
| **Source** | 14-rate-limit-and-abuse-audit.md |

---

### FINDING-22 — Password Reset Allows Repeated Daily Cycles

| Field | Value |
|---|---|
| **Finding ID** | RATE-008 |
| **Title** | Password Reset Allows Repeated Daily Cycles |
| **Status** | Confirmed |
| **Severity** | Low |
| **Confidence** | High |
| **Production Blocker** | No |
| **Affected Components** | `src/auth/actions/password-reset.ts` |
| **Affected Workflows** | Password reset request |
| **CWE** | CWE-770 |
| **ASVS** | V2.2.1 |
| **Summary** | Rate limits use sliding 15-minute window with no daily cap. Attacker can request 5 resets per 15 minutes indefinitely (480 emails per 24 hours). |
| **Evidence** | `src/auth/actions/password-reset.ts:13-16` |
| **Attack Scenario** | Attacker repeatedly requests resets, sending 480 emails to victim per day. |
| **Impact** | Low — Email bombing/harassment of target user |
| **Root Cause** | No longer-term daily cap on reset requests |
| **Remediation** | Add daily cap (e.g., 15 per 24 hours) per email |
| **Acceptance Criteria** | Per-email daily limit enforced |
| **Priority** | P2 |
| **Effort** | Small |
| **Suggested Owner** | Backend security |
| **Residual Risk** | Low — per-15-min limit provides baseline protection |
| **Source** | 14-rate-limit-and-abuse-audit.md |

---

### FINDING-23 — Serverless Race Condition on Rate-Limit Counters

| Field | Value |
|---|---|
| **Finding ID** | RATE-009 |
| **Title** | Serverless Race Condition on Rate-Limit Counters |
| **Status** | Confirmed |
| **Severity** | Low |
| **Confidence** | Medium |
| **Production Blocker** | No |
| **Affected Components** | `src/auth/repositories/login-attempt.repository.ts` |
| **Affected Workflows** | Rate limiting |
| **CWE** | CWE-362 |
| **ASVS** | V2.2.1 |
| **Summary** | Rate-limit check uses read-then-write pattern (count + insert), not atomic. Concurrent requests may slightly exceed limits. |
| **Evidence** | `src/auth/repositories/login-attempt.repository.ts:24-31` |
| **Attack Scenario** | Under high concurrency, two requests both read count below threshold, both proceed, exceeding limit by 1-3 requests. |
| **Impact** | Low — Limits may be slightly exceeded under high concurrency |
| **Root Cause** | Non-atomic count+insert pattern |
| **Remediation** | Accept known limitation for current scale; document tolerance. For exact enforcement, use MongoDB `$inc`-based counter. |
| **Acceptance Criteria** | Race window documented; sequential attacks still blocked |
| **Priority** | P2 |
| **Effort** | Medium |
| **Suggested Owner** | Backend security |
| **Residual Risk** | Low — effective against sequential brute-force |
| **Source** | 14-rate-limit-and-abuse-audit.md |

---

### FINDING-24 — Spike Alerting Uses In-Memory Aggregation

| Field | Value |
|---|---|
| **Finding ID** | RATE-010 |
| **Title** | Login Failure Spike Alerting Uses In-Memory Aggregation |
| **Status** | Confirmed |
| **Severity** | Low |
| **Confidence** | High |
| **Production Blocker** | No |
| **Affected Components** | `src/auth/services/alerting.service.ts` |
| **Affected Workflows** | Security alerting |
| **CWE** | CWE-778 |
| **ASVS** | V7.1.1 |
| **Summary** | Spike detection uses in-memory `Map` not shared across serverless instances. Distributed attacks may not trigger alerts. |
| **Evidence** | `src/auth/services/alerting.service.ts:249` |
| **Attack Scenario** | Brute-force spread across instances; no single instance sees enough failures to trigger threshold. |
| **Impact** | Low — Spike alerts diluted across instances |
| **Root Cause** | In-memory aggregation not shared across processes |
| **Remediation** | Move spike detection to MongoDB or increase threshold to account for dilution |
| **Acceptance Criteria** | Spike detection works in single-instance mode; multi-instance limitation documented |
| **Priority** | P2 |
| **Effort** | Medium |
| **Suggested Owner** | Backend security |
| **Residual Risk** | Low — audit_logs collection provides backup detection |
| **Source** | 14-rate-limit-and-abuse-audit.md |

---

### FINDING-25 — No Global IP Lockout Across Accounts

| Field | Value |
|---|---|
| **Finding ID** | RATE-011 |
| **Title** | No Global IP Lockout Across Accounts |
| **Status** | Confirmed |
| **Severity** | Low |
| **Confidence** | High |
| **Production Blocker** | No |
| **Affected Components** | `src/auth/services/login.service.ts` |
| **Affected Workflows** | Login, Account lockout |
| **CWE** | CWE-307 |
| **ASVS** | V2.2.1 |
| **Summary** | Lockout is per-user. Attacker rotating through email list from same IP gets separate per-email counters (10 per 15 min each) with per-IP limit (20 per 15 min) as only cross-account throttle. |
| **Evidence** | `src/auth/services/login.service.ts:127-131` |
| **Attack Scenario** | Attacker tries 20 different emails from same IP in 15 minutes. |
| **Impact** | Low — Per-IP limit provides cross-account throttle |
| **Root Cause** | Per-user lockout design |
| **Remediation** | Consider more aggressive per-IP limit (e.g., 10 per 15 min) or escalating IP lockout |
| **Acceptance Criteria** | Per-IP limit documented as chosen trade-off |
| **Priority** | P2 |
| **Effort** | Small |
| **Suggested Owner** | Backend security |
| **Residual Risk** | Low — per-IP limit provides protection |
| **Source** | 14-rate-limit-and-abuse-audit.md |

---

### FINDING-26 — Missing Permissions-Policy Directives

| Field | Value |
|---|---|
| **Finding ID** | DEPLOY-006 |
| **Title** | Missing Permissions-Policy Directives for Modern Browser Features |
| **Status** | Confirmed |
| **Severity** | Low |
| **Confidence** | High |
| **Production Blocker** | No |
| **Affected Components** | `next.config.ts` |
| **Affected Workflows** | Browser security |
| **CWE** | CWE-693 |
| **ASVS** | V14.4.3 |
| **Summary** | Only camera, microphone, geolocation restricted. Other powerful features (payment, USB, etc.) allowed by default. |
| **Evidence** | `next.config.ts:50-52` |
| **Attack Scenario** | XSS could abuse unrestricted browser APIs (payment, USB, etc.). |
| **Impact** | Low — Admin dashboard doesn't use these features |
| **Root Cause** | Incomplete Permissions-Policy |
| **Remediation** | Extend to comprehensive deny list |
| **Acceptance Criteria** | Permissions-Policy includes deny directives for all high-risk features |
| **Priority** | P2 |
| **Effort** | Small |
| **Suggested Owner** | Frontend security |
| **Residual Risk** | Very low — XSS unlikely with CSP nonce protection |
| **Source** | 16-deployment-and-operational-audit.md |

---

### FINDING-27 — WebAuthn Endpoints Lack Rate Limiting

| Field | Value |
|---|---|
| **Finding ID** | RATE-005 |
| **Title** | No Verified Rate Limiting on WebAuthn Endpoints |
| **Status** | Not Verified |
| **Severity** | Low |
| **Confidence** | Medium |
| **Production Blocker** | No |
| **Affected Components** | `src/app/api/auth/webauthn/login-options/route.ts` |
| **Affected Workflows** | WebAuthn authentication |
| **CWE** | CWE-770 |
| **ASVS** | V2.2.1 |
| **Summary** | WebAuthn endpoints lack explicit IP-based rate limiting. Options endpoint could be abused for DB write amplification. |
| **Evidence** | `src/app/api/auth/webauthn/login-options/route.ts` |
| **Attack Scenario** | Attacker floods login-options to trigger expensive challenge generation. |
| **Impact** | Low — Challenge single-use and login-level lockout provide protection |
| **Root Cause** | WebAuthn endpoints not yet rate-limited |
| **Remediation** | Add per-IP rate limit on login-options endpoint |
| **Acceptance Criteria** | Per-IP rate limit enforced on WebAuthn login-options |
| **Priority** | P2 |
| **Effort** | Small |
| **Suggested Owner** | Backend security |
| **Residual Risk** | Low — challenge single-use provides protection |
| **Source** | 14-rate-limit-and-abuse-audit.md |

---

### FINDING-28 — style-src Allows unsafe-inline

| Field | Value |
|---|---|
| **Finding ID** | DEPLOY-014 |
| **Title** | CSP style-src Allows unsafe-inline |
| **Status** | Confirmed |
| **Severity** | Low |
| **Confidence** | High |
| **Production Blocker** | No |
| **Affected Components** | `next.config.ts`, `src/proxy.ts` |
| **Affected Workflows** | XSS defense |
| **CWE** | CWE-79 |
| **ASVS** | V14.4.3 |
| **Summary** | `style-src 'self' 'unsafe-inline'` required by React/Next.js for runtime inline styles. Acceptable framework requirement. |
| **Evidence** | `next.config.ts:59`, `src/proxy.ts:40` |
| **Attack Scenario** | XSS could inject inline styles for CSS keyloggers or UI redressing. |
| **Impact** | Low — script-src nonce is primary XSS defense |
| **Root Cause** | React/Next.js framework requirement |
| **Remediation** | Accept as framework requirement; ensure script-src does NOT include unsafe-inline |
| **Acceptance Criteria** | script-src excludes unsafe-inline on dashboard routes |
| **Priority** | P2 |
| **Effort** | N/A |
| **Suggested Owner** | Frontend security |
| **Residual Risk** | Very low — nonce protection on scripts is primary defense |
| **Source** | 16-deployment-and-operational-audit.md |

---

### FINDING-29 — CORS Mobile Origins Optional

| Field | Value |
|---|---|
| **Finding ID** | DEPLOY-015 |
| **Title** | CORS Configuration for Mobile API — Fail-Open Not Verified |
| **Status** | Not Verified |
| **Severity** | Low |
| **Confidence** | Medium |
| **Production Blocker** | No |
| **Affected Components** | `src/auth/config/env.ts` |
| **Affected Workflows** | Mobile API CORS |
| **CWE** | CWE-942 |
| **ASVS** | V14.4.1 |
| **Summary** | `MOBILE_ALLOWED_ORIGINS` defaults to empty array. Need to verify CORS middleware rejects cross-origin when empty. |
| **Evidence** | `src/auth/config/env.ts:29-31` |
| **Impact** | Low — Depends on CORS middleware implementation |
| **Root Cause** | CORS configuration not verified |
| **Remediation** | Verify CORS middleware rejects when allowedOrigins is empty |
| **Acceptance Criteria** | Empty allowedOrigins rejects all cross-origin requests |
| **Priority** | P2 |
| **Effort** | Small |
| **Suggested Owner** | Backend security |
| **Residual Risk** | Low |
| **Source** | 16-deployment-and-operational-audit.md |

---

## P3 — Low and Informational

### FINDING-30 — Pepper Optional in Schema (Fail-Closed in Prod)

| Field | Value |
|---|---|
| **Finding ID** | PWD-001 |
| **Title** | Pepper Not Enforced as Mandatory in Schema |
| **Status** | Confirmed |
| **Severity** | Low |
| **Confidence** | High |
| **Production Blocker** | No |
| **Affected Components** | `src/auth/config/env.ts` |
| **Affected Workflows** | Password hashing |
| **CWE** | CWE-250 |
| **ASVS** | V7.1.2 |
| **Summary** | `ARGON2_SECRET` optional in Zod schema, relying on `validateSecurityConfig()` to enforce in production. |
| **Evidence** | `src/auth/config/env.ts:9` |
| **Impact** | Low — production fail-closed guard is effective |
| **Priority** | P3 |
| **Effort** | Small |
| **Suggested Owner** | Backend security |
| **Source** | 04-email-password-audit.md |

---

### FINDING-31 — Argon2id Parameters Could Be Stronger

| Field | Value |
|---|---|
| **Finding ID** | PWD-002 |
| **Title** | Argon2id Parameters Could Be Stronger |
| **Status** | Confirmed |
| **Severity** | Informational |
| **Confidence** | High |
| **Production Blocker** | No |
| **Affected Components** | `src/auth/crypto/password.ts` |
| **Affected Workflows** | Password hashing |
| **CWE** | CWE-916 |
| **ASVS** | V7.1.1 |
| **Summary** | Current parameters (64MB, t=3, p=1) are acceptable for internal admin tool but below OWASP recommended 128MB. |
| **Evidence** | `src/auth/crypto/password.ts:11-13` |
| **Impact** | Informational — appropriate for current use case |
| **Priority** | P3 |
| **Effort** | Small |
| **Suggested Owner** | Backend security |
| **Source** | 04-email-password-audit.md |

---

### FINDING-32 — No Password Expiration (NIST-Aligned)

| Field | Value |
|---|---|
| **Finding ID** | PWD-004 |
| **Title** | No Password Expiration |
| **Status** | Confirmed |
| **Severity** | Informational |
| **Confidence** | High |
| **Production Blocker** | No |
| **Affected Components** | `src/auth/validation/password-policy.ts` |
| **Affected Workflows** | Password policy |
| **CWE** | N/A |
| **ASVS** | V2.1.10 |
| **Summary** | Passwords do not expire. Consistent with NIST SP 800-63B. May conflict with PCI DSS. |
| **Evidence** | `src/auth/validation/password-policy.ts:27` |
| **Impact** | Informational |
| **Priority** | P3 |
| **Effort** | N/A |
| **Suggested Owner** | Backend security |
| **Source** | 04-email-password-audit.md |

---

### FINDING-33 — No Character Class Complexity Requirements

| Field | Value |
|---|---|
| **Finding ID** | PWD-003 |
| **Title** | No Character Class Complexity Requirements |
| **Status** | Confirmed |
| **Severity** | Low |
| **Confidence** | High |
| **Production Blocker** | No |
| **Affected Components** | `src/auth/validation/password-policy.ts` |
| **Affected Workflows** | Password creation |
| **CWE** | CWE-521 |
| **ASVS** | V2.1.7 |
| **Summary** | No complexity requirements. NIST-aligned; zxcvbn catches weak passwords. |
| **Evidence** | `src/auth/validation/password-policy.ts:23-26` |
| **Impact** | Low — 15-char minimum + zxcvbn provides adequate protection |
| **Priority** | P3 |
| **Effort** | N/A |
| **Suggested Owner** | Backend security |
| **Source** | 04-email-password-audit.md |

---

### FINDING-34 — Progressive Delay Has No Explicit Cap

| Field | Value |
|---|---|
| **Finding ID** | PWD-008 |
| **Title** | Progressive Delay Maximum Cap |
| **Status** | Confirmed |
| **Severity** | Informational |
| **Confidence** | High |
| **Production Blocker** | No |
| **Affected Components** | `src/auth/services/rate-limit.service.ts` |
| **Affected Workflows** | Login throttling |
| **CWE** | N/A |
| **ASVS** | V2.2.1 |
| **Summary** | Progressive delay grows exponentially without explicit cap. |
| **Evidence** | `src/auth/services/rate-limit.service.ts:55-68` |
| **Impact** | Informational — account lockout is primary protection |
| **Priority** | P3 |
| **Effort** | Small |
| **Suggested Owner** | Backend security |
| **Source** | 04-email-password-audit.md |

---

### FINDING-35 — No Cleanup for Abandoned TOTP Enrollments

| Field | Value |
|---|---|
| **Finding ID** | TOTP-008 |
| **Title** | No Explicit Cleanup for Abandoned TOTP Enrollments |
| **Status** | Confirmed |
| **Severity** | Low |
| **Confidence** | High |
| **Production Blocker** | No |
| **Affected Components** | `src/auth/repositories/mfa.repository.ts` |
| **Affected Workflows** | TOTP enrollment |
| **CWE** | N/A |
| **ASVS** | V2.8.1 |
| **Summary** | Abandoned TOTP enrollments (secret stored but not verified) are not cleaned up. |
| **Evidence** | `src/auth/repositories/mfa.repository.ts` |
| **Impact** | Low — secrets encrypted at rest; overwritten on re-enrollment |
| **Priority** | P3 |
| **Effort** | Small |
| **Suggested Owner** | Backend security |
| **Source** | 09-totp-audit.md |

---

### FINDING-36 — TOTP Plaintext Fallback When Key Missing (Dev Only)

| Field | Value |
|---|---|
| **Finding ID** | TOTP-004 |
| **Title** | TOTP Secrets Stored in Plaintext When Encryption Key Missing |
| **Status** | Confirmed |
| **Severity** | Low |
| **Confidence** | High |
| **Production Blocker** | No |
| **Affected Components** | `src/auth/repositories/mfa.repository.ts` |
| **Affected Workflows** | TOTP secret storage |
| **CWE** | CWE-312 |
| **ASVS** | V6.5.1 |
| **Summary** | When `TOTP_ENCRYPTION_KEY` not set, secrets stored in plaintext. Gated to dev environments only. |
| **Evidence** | `src/auth/repositories/mfa.repository.ts:9` |
| **Impact** | Low — production requires encryption key |
| **Priority** | P3 |
| **Effort** | N/A |
| **Suggested Owner** | Backend security |
| **Source** | 09-totp-audit.md |

---

### FINDING-37 — X-Content-Type-Options at Edge Not Verified

| Field | Value |
|---|---|
| **Finding ID** | DEPLOY-003 |
| **Title** | X-Content-Type-Options at Edge Not Verified |
| **Status** | Not Verified |
| **Severity** | Low |
| **Confidence** | Medium |
| **Production Blocker** | No |
| **Affected Components** | Edge/CDN |
| **Affected Workflows** | Browser security |
| **CWE** | CWE-693 |
| **ASVS** | V14.4.3 |
| **Summary** | Header set in application but edge may not preserve it. |
| **Evidence** | `next.config.ts:37-61` |
| **Impact** | Low |
| **Priority** | P3 |
| **Effort** | Small |
| **Suggested Owner** | DevOps |
| **Source** | 16-deployment-and-operational-audit.md |

---

### FINDING-38 — Referrer-Policy at Edge Not Verified

| Field | Value |
|---|---|
| **Finding ID** | DEPLOY-004 |
| **Title** | Referrer-Policy at Edge Not Verified |
| **Status** | Not Verified |
| **Severity** | Low |
| **Confidence** | Medium |
| **Production Blocker** | No |
| **Affected Components** | Edge/CDN |
| **Affected Workflows** | Browser security |
| **CWE** | CWE-200 |
| **ASVS** | V14.4.3 |
| **Summary** | Referrer-Policy set in application but edge may not preserve. |
| **Evidence** | `next.config.ts:37-61` |
| **Impact** | Low |
| **Priority** | P3 |
| **Effort** | Small |
| **Suggested Owner** | DevOps |
| **Source** | 16-deployment-and-operational-audit.md |

---

### FINDING-39 — Permissions-Policy at Edge Not Verified

| Field | Value |
|---|---|
| **Finding ID** | DEPLOY-005 |
| **Title** | Permissions-Policy at Edge Not Verified |
| **Status** | Not Verified |
| **Severity** | Low |
| **Confidence** | Medium |
| **Production Blocker** | No |
| **Affected Components** | Edge/CDN |
| **Affected Workflows** | Browser security |
| **CWE** | CWE-693 |
| **ASVS** | V14.4.3 |
| **Summary** | Permissions-Policy set in application but edge may not preserve. |
| **Evidence** | `next.config.ts:50-52` |
| **Impact** | Low |
| **Priority** | P3 |
| **Effort** | Small |
| **Suggested Owner** | DevOps |
| **Source** | 16-deployment-and-operational-audit.md |

---

### FINDING-40 — Cache Controls Not Verified for All Routes

| Field | Value |
|---|---|
| **Finding ID** | NEXT-013 |
| **Title** | Cache Controls Not Verified for All Dashboard Routes |
| **Status** | Not Verified |
| **Severity** | Low |
| **Confidence** | Low |
| **Production Blocker** | No |
| **Affected Components** | All `/dashboard/*` routes |
| **Affected Workflows** | Browser caching |
| **CWE** | CWE-524 |
| **ASVS** | V14.4.3 |
| **Summary** | QR code route sets `Cache-Control: no-store`. Other routes may need explicit cache headers. |
| **Evidence** | QR code route only |
| **Impact** | Low — browser may cache authenticated content |
| **Priority** | P3 |
| **Effort** | Small |
| **Suggested Owner** | Frontend security |
| **Source** | 13-nextjs-csrf-browser-audit.md |

---

### FINDING-41 — Email Delivery Failure Does Not Block Auth

| Field | Value |
|---|---|
| **Finding ID** | OTP-013 |
| **Title** | Email Delivery Failure Does Not Block Authentication |
| **Status** | Confirmed |
| **Severity** | Low |
| **Confidence** | High |
| **Production Blocker** | No |
| **Affected Components** | `src/auth/services/mailer.ts` |
| **Affected Workflows** | Email OTP delivery |
| **CWE** | N/A |
| **ASVS** | V2.8.1 |
| **Summary** | Email send failures are logged but never thrown. User without email delivery has no 2FA path except recovery codes. |
| **Evidence** | `src/auth/services/mailer.ts` |
| **Impact** | Low — deliberate design; recovery codes provide fallback |
| **Priority** | P3 |
| **Effort** | N/A |
| **Suggested Owner** | Backend security |
| **Source** | 08-email-otp-audit.md |

---

## Summary Statistics

| Priority | Count |
|----------|-------|
| P0 (Critical) | 0 |
| P1 (High) | 6 |
| P2 (Medium) | 23 |
| P3 (Low/Info) | 12 |
| **Total** | **41** |

| Severity | Count |
|----------|-------|
| Critical | 0 |
| High | 2 (DEPLOY-001, DEPLOY-002 — deployment-level) |
| Medium | 12 |
| Low | 18 |
| Informational | 9 |
| **Total** | **41** |
