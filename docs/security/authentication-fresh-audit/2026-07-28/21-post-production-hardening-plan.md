# 21 — Post-Production Hardening Plan

**Audit Date:** 2026-07-28
**Commit:** `32af9be`
**Branch:** `main`
**Auditor:** opencode/big-pickle

---

## Overview

This document details the 23 P2 (Medium) and 12 P3 (Low/Informational) findings that should be addressed after initial production deployment. Items are organized by priority and estimated effort.

**Total estimated effort:** 5–8 days

---

## P2 — Medium (Fix Within 30 Days)

### Rate Limiting Hardening

| ID | Finding | File | Fix | Effort |
|----|---------|------|-----|--------|
| FINDING-08 | Per-IP rate limit on password reset | `src/auth/services/password.service.ts:244` | Add `checkIpRateLimit(ipAddress)` at start of `requestReset()` | S |
| FINDING-20 | IPv6 normalization | `src/auth/lib/request.ts:33` | Normalize IPv6 addresses (collapse form, lowercase hex, strip zeros) | S |
| FINDING-21 | Recovery code failure counter | `src/auth/services/two-factor.service.ts:88` | Track recovery code failures separately from email 2FA | S |
| FINDING-22 | Daily reset cap | `src/auth/actions/password-reset.ts:13` | Add daily cap (e.g., 15 per 24 hours) per email | S |
| FINDING-23 | Serverless race condition | `src/auth/repositories/login-attempt.repository.ts:24` | Accept known limitation; document tolerance | S |
| FINDING-24 | In-memory spike aggregation | `src/auth/services/alerting.service.ts:249` | Move spike detection to MongoDB or increase threshold | M |
| FINDING-25 | Global IP lockout | `src/auth/services/login.service.ts:127` | Consider more aggressive per-IP limit or escalating lockout | S |
| FINDING-27 | WebAuthn rate limiting | `src/app/api/auth/webauthn/login-options/route.ts` | Add per-IP rate limit on login-options | S |

### Security Headers and Browser Protection

| ID | Finding | File | Fix | Effort |
|----|---------|------|-----|--------|
| FINDING-26 | Permissions-Policy directives | `next.config.ts:50` | Extend to comprehensive deny list for payment, USB, etc. | S |
| FINDING-28 | CSP style-src unsafe-inline | `next.config.ts:59` | Accept as React/Next.js requirement; ensure script-src excludes unsafe-inline | N/A |

### Password and Auth Flow

| ID | Finding | File | Fix | Effort |
|----|---------|------|-----|--------|
| FINDING-16 | CAPTCHA on login | Login flow | Document decision on CAPTCHA requirement for internal tool | S |
| FINDING-17 | Reset token in URL | `src/auth/services/password.service.ts:266` | Consider fragment or POST-based flow; document decision | M |
| FINDING-18 | Lockout email notification | `src/auth/services/login.service.ts:133` | Send email on lockout (similar to `alertReuseDetected`) | S |

### OAuth and Token Verification

| ID | Finding | File | Fix | Effort |
|----|---------|------|-----|--------|
| FINDING-07 | Timing-safe state comparison | `src/auth/services/oauth.service.ts:248` | Replace with `crypto.timingSafeEqual()` | S |
| FINDING-19 | JWKS fetch timeout | `src/auth/services/oauth.service.ts:56` | Add 5-10 second timeout using AbortController | S |

### Deployment and Infrastructure Verification

| ID | Finding | File | Fix | Effort |
|----|---------|------|-----|--------|
| FINDING-09 | HSTS at edge | Edge/CDN | Verify hosting platform configures HSTS; add E2E test | S |
| FINDING-10 | HTTPS enforcement | Edge/CDN | Verify HTTP-to-HTTPS redirect; add E2E test | S |
| FINDING-11 | Database backup | Infrastructure | Document backup strategy; verify MongoDB Atlas config | S |
| FINDING-12 | Logging infrastructure | External | Document logging stack; verify audit log export | S |
| FINDING-13 | Monitoring and alerting | External | Document monitoring; verify alert thresholds | S |
| FINDING-14 | CI/CD secret protection | CI/CD | Document secret management; verify no exposure | S |
| FINDING-15 | Preview environment isolation | Infrastructure | Document isolation strategy; verify separate databases | S |
| FINDING-29 | CORS mobile origins | `src/auth/config/env.ts:29` | Verify CORS middleware rejects when allowedOrigins is empty | S |

---

## P3 — Low and Informational (Backlog)

### Password Policy

| ID | Finding | Fix | Effort |
|----|---------|-----|--------|
| FINDING-30 | Pepper optional in schema | Document fail-closed behavior; consider enforcing in schema | S |
| FINDING-31 | Argon2id parameters | Consider increasing memoryCost to 128MB (OWASP recommendation) | S |
| FINDING-32 | No password expiration | Document as NIST-aligned decision | N/A |
| FINDING-33 | No complexity requirements | Document as NIST-aligned (zxcvbn provides protection) | N/A |
| FINDING-34 | Progressive delay cap | Add explicit maximum cap on progressive delay | S |

### TOTP and MFA

| ID | Finding | Fix | Effort |
|----|---------|-----|--------|
| FINDING-35 | Abandoned TOTP enrollments | Add cleanup for unverified TOTP secrets (e.g., after 24 hours) | S |
| FINDING-36 | TOTP plaintext fallback | Accept as dev-only; production requires encryption key | N/A |

### Edge Headers

| ID | Finding | Fix | Effort |
|----|---------|-----|--------|
| FINDING-37 | X-Content-Type-Options at edge | Verify edge preserves header | S |
| FINDING-38 | Referrer-Policy at edge | Verify edge preserves header | S |
| FINDING-39 | Permissions-Policy at edge | Verify edge preserves header | S |

### Caching and Delivery

| ID | Finding | Fix | Effort |
|----|---------|-----|--------|
| FINDING-40 | Cache controls for dashboard routes | Add `Cache-Control: no-store` to authenticated routes | S |
| FINDING-41 | Email delivery failure | Accept as deliberate design; recovery codes provide fallback | N/A |

---

## Implementation Schedule

### Week 1–2: Rate Limiting Hardening
1. FINDING-08: Add per-IP reset rate limit (1 hour)
2. FINDING-20: IPv6 normalization (2 hours)
3. FINDING-21: Recovery code counter (2 hours)
4. FINDING-22: Daily reset cap (1 hour)
5. FINDING-27: WebAuthn rate limit (1 hour)

### Week 3: OAuth and Security Headers
6. FINDING-07: Timing-safe comparison (30 min)
7. FINDING-19: JWKS fetch timeout (30 min)
8. FINDING-26: Permissions-Policy extension (1 hour)

### Week 4: Deployment Verification
9. FINDING-09: HSTS verification + E2E test (2 hours)
10. FINDING-10: HTTPS enforcement verification (1 hour)
11. FINDING-11: Backup strategy documentation (1 hour)
12. FINDING-12–15: Infrastructure verification (2 hours)

### Week 5: Password Flow Improvements
13. FINDING-18: Lockout notification (1 hour)
14. FINDING-16/17: Document CAPTCHA and token transport decisions (1 hour)

### Ongoing: Backlog
- P3 items as capacity allows

---

## Verification Commands

After implementing hardening:

```bash
# Lint and typecheck
pnpm lint
pnpm build

# Unit tests
pnpm test:unit

# E2E tests
pnpm test:e2e

# Security checks
pnpm docs:check
pnpm test:api-contract

# Specific verification
grep -n "timingSafeEqual" src/auth/services/oauth.service.ts
grep -n "AbortController" src/auth/services/oauth.service.ts
grep -n "checkIpRateLimit" src/auth/services/password.service.ts
```
