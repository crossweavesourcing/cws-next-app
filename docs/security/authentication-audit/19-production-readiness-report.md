# 19 — Production Readiness Report

**Audit Date:** 2026-07-27
**Commit:** `32af9be`
**Branch:** `main`
**Auditor:** opencode/big-pickle

---

## Executive Summary

This report evaluates production readiness of the CWS Next.js application's authentication system based on findings from the comprehensive security audit (reports 04–16). The assessment covers 13 security categories with 90+ findings.

### Overall Verdict: NOT READY FOR PRODUCTION

**4 Critical/High production-blocking findings** must be remediated before deployment. 11 additional Medium-severity findings should be addressed in the same release window.

---

## Scoring Methodology

Each category is scored 0–5:

| Score | Meaning |
|-------|---------|
| 5 | No open findings or informational only |
| 4 | Only Low-severity findings |
| 3 | Medium findings exist, no production blockers |
| 2 | High-severity findings exist |
| 1 | Critical findings exist |
| 0 | Multiple critical findings or production blockers |

**Minimum production threshold:** All categories ≥ 3, no category at 0 or 1.

---

## Category Scores

### 1. Password & Authentication (04)
**Score: 2/5 — NOT READY**

| Finding | Severity | Production Blocker |
|---------|----------|-------------------|
| PWD-007 | High | **Yes** |
| PWD-001 | Medium | No |
| PWD-004 | Medium | No |
| PWD-002 | Low | No |
| PWD-003 | Low | No |
| PWD-005 | Low | No |
| PWD-006 | Low | No |
| PWD-008 | Low | No |
| PWD-009 | Low | No |
| PWD-010 | Low | No |

**Assessment:** PWD-007 (rate-limit bucket collapse) is a production blocker causing platform-wide login lockout. PWD-004 (timing side-channel) allows account enumeration. Both must be fixed.

---

### 2. Password Recovery (05)
**Score: 3/5 — CONDITIONALLY READY**

| Finding | Severity | Production Blocker |
|---------|----------|-------------------|
| RST-001 | Medium | No |
| RST-002 | Low | No |
| RST-003 | Informational | No |
| RST-005 | Low | No |
| RST-006 | Low | No |
| RST-013 | Low | No |

**Assessment:** No production blockers. RST-001 (token entropy below NIST) should be fixed for compliance but does not block deployment given rate limiting prevents online brute-force.

---

### 3. Google OAuth (06)
**Score: 2/5 — NOT READY**

| Finding | Severity | Production Blocker |
|---------|----------|-------------------|
| OAUTH-015 | Medium | **Yes** |
| OAUTH-001 | Medium | No |
| OAUTH-003 | Medium | No |
| OAUTH-002 | Low | No |
| OAUTH-004 | Low | No |
| OAUTH-005 | Informational | No |
| OAUTH-006 | Low | No |
| OAUTH-008 | Low | No |
| OAUTH-014 | Low | No |
| OAUTH-016 | Low | No |
| OAUTH-017 | Low | No |
| OAUTH-018 | Low | No |
| OAUTH-020 | Low | No |

**Assessment:** OAUTH-015 (no unique index on provider+providerAccountId) is a production blocker enabling duplicate OAuth account links. OAUTH-001 (no clock skew leeway) causes legitimate login failures. Both must be fixed.

---

### 4. Account Linking (07)
**Score: 3/5 — CONDITIONALLY READY**

| Finding | Severity | Production Blocker |
|---------|----------|-------------------|
| OAUTH-014 | Low | No |
| OAUTH-016 | Low | No |
| OAUTH-017 | Low | No |
| OAUTH-018 | Low | No |
| OAUTH-020 | Low | No |

**Assessment:** No production blockers. Low-severity findings only. Account linking is admin-only currently, limiting attack surface.

---

### 5. Email OTP (08)
**Score: 5/5 — READY**

| Finding | Severity | Production Blocker |
|---------|----------|-------------------|
| MFA-OTP-001 | Informational | No |
| MFA-OTP-002 | Informational | No |

**Assessment:** Only informational findings. Email OTP implementation is solid.

---

### 6. TOTP Authenticator (09)
**Score: 3/5 — CONDITIONALLY READY**

| Finding | Severity | Production Blocker |
|---------|----------|-------------------|
| MFA-TOTP-001 | Medium | No |
| MFA-TOTP-002 | Low | No |
| MFA-TOTP-003 | Low | No |
| MFA-TOTP-004 | Low | No |

**Assessment:** MFA-TOTP-001 (plaintext TOTP secrets) is Medium severity but not a production blocker given DB access is already a severe compromise. MFA-TOTP-003/004 (missing rate limits) are mitigated by login-level lockout.

---

### 7. MFA Recovery & Bypass (10)
**Score: 3/5 — CONDITIONALLY READY**

| Finding | Severity | Production Blocker |
|---------|----------|-------------------|
| MFA-BYPASS-001 | Medium | No |
| MFA-BYPASS-002 | Medium | No |
| MFA-BYPASS-003 | Low | No |

**Assessment:** MFA-BYPASS-001/002 (disable/replace MFA without reauthentication) are Medium severity. Attacker needs stolen session to exploit. Should be fixed promptly but does not block initial deployment given other session controls.

---

### 8. Session Security (11)
**Score: 5/5 — READY**

| Finding | Severity | Production Blocker |
|---------|----------|-------------------|
| SESSION-001 | Informational | Closed |
| SESSION-003 | Informational | Closed |
| SESSION-006 | Low | Closed |
| SESSION-010 | Informational | Closed |
| SESSION-019 | Informational | Closed |
| SESSION-020 | Informational | Closed |
| SESSION-021 | Informational | Closed |

**Assessment:** All findings closed or informational. Session security is excellent with atomic refresh rotation, device binding, and proper cookie flags.

---

### 9. Authorization (12)
**Score: 3/5 — CONDITIONALLY READY**

| Finding | Severity | Production Blocker |
|---------|----------|-------------------|
| AUTHZ-003 | Medium | No |
| AUTHZ-005 | Medium | No |

**Assessment:** AUTHZ-003 (mobile admin routes missing bearer auth) is a functional regression, not a security bypass. AUTHZ-005 (revokeSessionAction trusts user-supplied sessionId) has low practical risk due to encrypted action IDs. Neither blocks web deployment.

---

### 10. Next.js Security (13)
**Score: 3/5 — CONDITIONALLY READY**

| Finding | Severity | Production Blocker |
|---------|----------|-------------------|
| NEXT-008 | Medium | No |
| NEXT-019 | Medium | No |
| NEXT-005 | Low | No |
| NEXT-006 | Low | No |
| NEXT-017 | Low | No |
| NEXT-021 | Low | No |

**Assessment:** NEXT-019 (debug file writes) overlaps with OPS-001 and must be fixed. NEXT-008 (missing CSRF guard) is defense-in-depth. Neither blocks deployment.

---

### 11. Abuse Prevention (14)
**Score: 1/5 — NOT READY**

| Finding | Severity | Production Blocker |
|---------|----------|-------------------|
| RATE-004 | Critical | **Yes** |
| RATE-001 | Medium | No |
| RATE-002 | Medium | No |
| RATE-003 | Low | No |
| RATE-005 | Low | No |
| RATE-006 | Low | No |
| RATE-007 | Low | No |
| RATE-008 | Low | No |
| RATE-009 | Low | No |
| RATE-010 | Low | No |

**Assessment:** RATE-004 (platform-wide login lockout without trusted proxy) is Critical but mitigated by boot guard. Boot guard must be verified functional. RATE-001 (no refresh rate limit) and RATE-002 (no TOTP aggregate rate limit) must be fixed.

---

### 12. Secrets & Deployment (15)
**Score: 1/5 — NOT READY**

| Finding | Severity | Production Blocker |
|---------|----------|-------------------|
| DEPLOY-001 | High | **Yes** |
| DEPLOY-010 | Low | No |
| DEPLOY-013 | Low | No |
| DEPLOY-015 | Low | No |

**Assessment:** DEPLOY-001 (HSTS not configured) is a production blocker. First HTTP request sends session cookies in cleartext. Must be configured at edge platform before deployment.

---

### 13. Operational Security (16)
**Score: 2/5 — NOT READY**

| Finding | Severity | Production Blocker |
|---------|----------|-------------------|
| OPS-001 | Critical | **Yes** |
| OPS-002 | Medium | No |
| OPS-003 | Medium | No |
| OPS-004 | Medium | No |
| OPS-007 | Medium | No |
| OPS-005 | Low | No |
| OPS-006 | Low | No |
| OPS-008 | Low | No |
| OPS-010 | Low | No |
| OPS-011 | Low | No |

**Assessment:** OPS-001 (debug file writes in production 2FA code path) is Critical. Information disclosure and unbounded disk growth. Must be removed. Overlaps with NEXT-019.

---

## Summary Scorecard

| Category | Score | Ready? |
|----------|-------|--------|
| Password & Authentication | 2 | ❌ No |
| Password Recovery | 3 | ⚠️ Conditional |
| Google OAuth | 2 | ❌ No |
| Account Linking | 3 | ⚠️ Conditional |
| Email OTP | 5 | ✅ Yes |
| TOTP Authenticator | 3 | ⚠️ Conditional |
| MFA Recovery & Bypass | 3 | ⚠️ Conditional |
| Session Security | 5 | ✅ Yes |
| Authorization | 3 | ⚠️ Conditional |
| Next.js Security | 3 | ⚠️ Conditional |
| Abuse Prevention | 1 | ❌ No |
| Secrets & Deployment | 1 | ❌ No |
| Operational Security | 2 | ❌ No |

**Categories at 0–2:** 5 (must fix)
**Categories at 3:** 6 (should fix)
**Categories at 4–5:** 2 (acceptable)

---

## Production Blockers (Must Fix Before Deployment)

| ID | Finding | Severity | Owner | Effort |
|----|---------|----------|-------|--------|
| RATE-004 | Per-IP login rate limit collapses without trusted proxy | Critical | Infrastructure | S |
| OPS-001 | Debug file writes in production 2FA code path | Critical | Backend | S |
| DEPLOY-001 | HSTS must be configured at edge | High | DevOps | S |
| PWD-007 | Rate-limit bucket collapse without trusted proxy | High | Backend | S |
| OAUTH-015 | No unique index on (provider, providerAccountId) | Medium | Backend | S |

**Note:** RATE-004 and PWD-007 are the same root cause. Boot guard prevents this but must be verified. If boot guard is confirmed functional, these may be downgraded to defense-in-depth.

---

## Recommended Pre-Deployment Checklist

- [ ] Remove debug file writes from verify-2fa.ts (OPS-001/NEXT-019)
- [ ] Configure HSTS at edge platform (DEPLOY-001)
- [ ] Verify boot guard prevents trusted-proxy bypass (RATE-004/PWD-007)
- [ ] Add unique index on oauth_accounts (provider, providerAccountId) (OAUTH-015)
- [ ] Add per-IP rate limit on /api/auth/refresh (RATE-001)
- [ ] Add per-user TOTP failure rate limit (RATE-002)
- [ ] Increase login timing mitigation delay (PWD-004)
- [ ] Add 5-minute clock skew leeway for Google id_token (OAUTH-001)
- [ ] Add clock skew leeway to OAuth token verification (OAUTH-001)
- [ ] Remove console dev-mode logging of 2FA codes (OPS-002)
- [ ] Fix database config error message (OPS-003)
- [ ] Add SECURITY_WEBHOOK_URL startup warning (OPS-004)

---

## Post-Deployment Remediation (Within 30 Days)

| Priority | Findings | Count |
|----------|----------|-------|
| P1 | RST-001, MFA-TOTP-001, AUTHZ-003, AUTHZ-005, NEXT-008, RATE-003, RATE-007 | 7 |
| P2 | PWD-001, PWD-002, PWD-006, OAUTH-003, OAUTH-004, OAUTH-017, MFA-TOTP-003, MFA-TOTP-004, MFA-BYPASS-003, RATE-005, DEPLOY-010, DEPLOY-015, OPS-005, OPS-007, OPS-010 | 15 |
| P3 | All remaining Low/Informational | 50+ |

---

## Risk Assessment

### If Deployed Without Fixes

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Platform-wide login lockout | Medium | Critical | Boot guard functional; verify in staging |
| Information disclosure via debug logs | High | Medium | Debug writes in codebase; requires code change |
| Session cookie interception (no HSTS) | Medium | High | Requires edge config; no code change |
| Duplicate OAuth account links | Low | Medium | Admin-only linking; low concurrency |
| Account enumeration via timing | Medium | Medium | Requires statistical analysis |

### Recommended Approach

1. **Immediate (P0):** Fix 5 production blockers (2-4 hours of work)
2. **This Sprint (P1):** Fix 11 Medium-severity findings (1-2 days)
3. **Next Sprint (P2):** Fix remaining Low-severity findings (2-3 days)
4. **Backlog (P3):** Informational and defense-in-depth improvements

---

## Conclusion

The authentication system has strong foundational security (session management, refresh token rotation, cookie flags, algorithm allowlists). However, **5 production-blocking findings** prevent safe deployment:

1. Debug file writes leak sensitive data to filesystem
2. HSTS not configured, enabling session cookie interception
3. Rate-limit collapse risk without trusted proxy verification
4. Missing database indexes for OAuth account linking

After fixing these blockers and the 11 Medium-severity findings, the system will meet production-ready standards with a residual risk level of **Low**.
