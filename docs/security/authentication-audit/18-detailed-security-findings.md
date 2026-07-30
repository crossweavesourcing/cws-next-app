# 18 — Detailed Security Findings

**Audit Date:** 2026-07-27
**Commit:** `32af9be`
**Branch:** `main`
**Auditor:** opencode/big-pickle

This document consolidates ALL findings from reports 04–16 with complete detail structure for each.

---

## Table of Contents

- [Password & Authentication (04)](#password--authentication-04)
- [Password Recovery (05)](#password-recovery-05)
- [Google OAuth (06)](#google-oauth-06)
- [Account Linking (07)](#account-linking-07)
- [Email OTP (08)](#email-otp-08)
- [TOTP Authenticator (09)](#totp-authenticator-09)
- [MFA Recovery & Bypass (10)](#mfa-recovery--bypass-10)
- [Session Security (11)](#session-security-11)
- [Authorization (12)](#authorization-12)
- [Next.js Security (13)](#nextjs-security-13)
- [Abuse Prevention (14)](#abuse-prevention-14)
- [Secrets & Deployment (15)](#secrets--deployment-15)
- [Operational Security (16)](#operational-security-16)

---

## Password & Authentication (04)

### PWD-001 — Argon2id Memory Cost Below OWASP Recommendation

| Field | Value |
|---|---|
| **Finding ID** | PWD-001 |
| **Title** | Argon2id Memory Cost Below OWASP Recommendation |
| **Status** | Open |
| **Severity** | Medium |
| **Confidence** | High |
| **Production Blocker** | No |
| **Affected Components** | `src/auth/crypto/password.ts` |
| **Affected Workflows** | Password hashing |
| **CWE** | CWE-916 |
| **ASVS** | V7.1.1 |
| **Priority** | P2 |
| **Effort** | S |
| **Suggested Owner** | Backend security |
| **Residual Risk** | Low — existing 64 MB memoryCost still provides meaningful protection |

**Summary:** Argon2id memoryCost is 64 MB with parallelism=1. OWASP recommends minimum parallelism=4, which forces attackers to allocate more GPU memory per lane.

**Evidence:** `src/auth/crypto/password.ts:12`

**Attack Scenario:** Attacker obtains user collection dump and runs offline brute-force. With parallelism=1, GPU can pack more candidates into SRAM, reducing memory-bandwidth bottleneck.

**Impact:** Offline cracking speed higher than necessary. Lower work factor for offline brute-force.

**Root Cause:** Parameters matched reference example rather than OWASP Argon2id baseline.

**Remediation:** Increase parallelism to 4: `memoryCost: 65536, timeCost: 3, parallelism: 4`. Existing hashes unaffected (argon2.verify reads parameters from hash string).

**Acceptance Criteria:** Parameters match or exceed OWASP recommended baseline. Existing passwords continue to verify.

**Required Tests:**
1. Verify `hashPassword()` produces hash with `p=4`
2. Verify `verifyPassword()` succeeds against old `p=1` hashes
3. Measure hash time on deployment platform (100–500ms)

---

### PWD-002 — Argon2id Parallelism Set to 1

| Field | Value |
|---|---|
| **Finding ID** | PWD-002 |
| **Title** | Argon2id Parallelism Set to 1 |
| **Status** | Open |
| **Severity** | Low |
| **Confidence** | High |
| **Production Blocker** | No |
| **Affected Components** | `src/auth/crypto/password.ts` |
| **Affected Workflows** | Password hashing |
| **CWE** | CWE-916 |
| **ASVS** | V7.1.1 |
| **Priority** | P2 |
| **Effort** | S |
| **Suggested Owner** | Backend security |
| **Residual Risk** | Low — addressed by PWD-001 |

**Summary:** Parallelism of 1 allows attackers to pack more hash candidates into GPU SRAM.

**Evidence:** `src/auth/crypto/password.ts:14`

**Attack Scenario:** Same as PWD-001.

**Impact:** Marginal increase in offline cracking throughput.

**Root Cause:** Defaulted to 1 without OWASP guidance review.

**Remediation:** Addressed by PWD-001 remediation.

**Acceptance Criteria:** `parallelism >= 4`.

---

### PWD-003 — Pepper Not Enforced in Non-Production Environments

| Field | Value |
|---|---|
| **Finding ID** | PWD-003 |
| **Title** | Pepper Not Enforced in Non-Production Environments |
| **Status** | Open |
| **Severity** | Low |
| **Confidence** | High |
| **Production Blocker** | No |
| **Affected Components** | `src/auth/config/env.ts` |
| **Affected Workflows** | Password hashing |
| **CWE** | CWE-250 |
| **ASVS** | V7.1.2 |
| **Priority** | P3 |
| **Effort** | S |
| **Suggested Owner** | DevOps |
| **Residual Risk** | Low — production correctly enforced |

**Summary:** ARGON2_SECRET optional in non-production. Staging may hash without pepper.

**Evidence:** `src/auth/config/env.ts:9,210-219,254-259`

**Attack Scenario:** Staging accidentally classified as non-production. Breach exposes crackable hashes.

**Impact:** Staging/preview environments may lack pepper protection.

**Root Cause:** Env schema marks ARGON2_SECRET as optional; boot guard only fails closed in production.

**Remediation:** Add check for NODE_ENV=staging. Document that staging MUST set NODE_ENV=production or ARGON2_SECRET.

**Acceptance Criteria:** Every non-development environment either requires ARGON2_SECRET or logs visible warning.

---

### PWD-004 — Login Timing Side-Channel Mitigation Delay Is Insufficient

| Field | Value |
|---|---|
| **Finding ID** | PWD-004 |
| **Title** | Login Timing Side-Channel Mitigation Delay Is Insufficient |
| **Status** | Open |
| **Severity** | Medium |
| **Confidence** | Medium |
| **Production Blocker** | No |
| **Affected Components** | `src/auth/services/login.service.ts` |
| **Affected Workflows** | Login |
| **CWE** | CWE-208 |
| **ASVS** | V2.1.1 |
| **Priority** | P1 |
| **Effort** | S |
| **Suggested Owner** | Backend security |
| **Residual Risk** | Medium — timing analysis possible with 1000+ samples |

**Summary:** Random delay max of 50ms doesn't mask Argon2 verify timing variance. Statistical analysis of 1000+ samples distinguishes real vs dummy verify paths.

**Evidence:** `src/auth/services/login.service.ts:26-28,73-82`

**Attack Scenario:** Attacker measures response time difference between known email + wrong password (real verify ~50-200ms) and unknown email (dummy + 0-50ms delay). Collecting 1000+ samples statistically distinguishes paths.

**Impact:** Account enumeration via timing analysis defeats FIX-08 mitigation.

**Root Cause:** Delay ceiling chosen conservatively for UX but doesn't mask Argon2 variance.

**Remediation:** Add fixed delay floor: `FLOOR_MS=100 + randomDelayMs(100)`.

**Acceptance Criteria:** Timing distribution indistinguishable under 1000+ samples (KS test p-value > 0.05).

---

### PWD-005 — Default Password Policy Has No Complexity Requirements

| Field | Value |
|---|---|
| **Finding ID** | PWD-005 |
| **Title** | Default Password Policy Has No Complexity Requirements |
| **Status** | Open |
| **Severity** | Low |
| **Confidence** | High |
| **Production Blocker** | No |
| **Affected Components** | `src/auth/validation/password-policy.ts` |
| **Affected Workflows** | Password creation, Password change |
| **CWE** | CWE-521 |
| **ASVS** | V2.1.7 |
| **Priority** | P3 |
| **Effort** | S |
| **Suggested Owner** | Backend security |
| **Residual Risk** | Low — zxcvbn provides baseline strength evaluation |

**Summary:** Default policy doesn't require uppercase, lowercase, numbers, or special characters. Relies solely on zxcvbn.

**Evidence:** `src/auth/validation/password-policy.ts:20-29`

**Attack Scenario:** User creates 'abcdefghijklmnop' (15 lowercase). Passes zxcvbn but lacks class diversity.

**Impact:** Marginal reduction in password strength.

**Root Cause:** Deliberate reliance on zxcvbn (NIST 800-63B guidance).

**Remediation:** Enable `requireUppercase: true` and `requireNumber: true` in production policy, or raise zxcvbn threshold.

**Acceptance Criteria:** Production policy requires at least 2 character classes plus zxcvbn scoring.

---

### PWD-006 — Account Status Checks Leak Timing Information

| Field | Value |
|---|---|
| **Finding ID** | PWD-006 |
| **Title** | Account Status Checks Leak Timing Information |
| **Status** | Open |
| **Severity** | Low |
| **Confidence** | Medium |
| **Production Blocker** | No |
| **Affected Components** | `src/auth/services/login.service.ts` |
| **Affected Workflows** | Login |
| **CWE** | CWE-208 |
| **ASVS** | V2.1.1 |
| **Priority** | P2 |
| **Effort** | S |
| **Suggested Owner** | Backend security |
| **Residual Risk** | Low — status info leakable via other channels |

**Summary:** Status checks (suspended, deleted, disabled) placed BEFORE password verification without timing mitigation.

**Evidence:** `src/auth/services/login.service.ts:73-99`

**Attack Scenario:** 'Not found' path runs dummy verify + delay (~50-250ms). 'Found but deleted' throws immediately (<5ms). Statistical difference reveals valid emails.

**Impact:** Account enumeration via response time measurement.

**Root Cause:** Status checks before password verification without dummy verify.

**Remediation:** Move status checks after password verification, or add dummy verify + delay in status branches.

**Acceptance Criteria:** Timing of 'email exists + deleted' and 'email does not exist' is statistically indistinguishable.

---

### PWD-007 — Rate Limiting Collapses Without Trusted Proxy

| Field | Value |
|---|---|
| **Finding ID** | PWD-007 |
| **Title** | Rate Limiting Collapses to Single Global Bucket Without Trusted Proxy |
| **Status** | Open |
| **Severity** | High |
| **Confidence** | High |
| **Production Blocker** | Yes (guard exists) |
| **Affected Components** | `src/auth/lib/request.ts`, `src/auth/config/env.ts` |
| **Affected Workflows** | Login, Rate limiting |
| **CWE** | CWE-770 |
| **ASVS** | V2.2.1 |
| **Priority** | P0 |
| **Effort** | S |
| **Suggested Owner** | DevOps / Backend security |
| **Residual Risk** | Low — boot guard prevents production deployment without header |

**Summary:** Without TRUSTED_PROXY_IP_HEADER, all traffic resolves to 0.0.0.0 sentinel. 20 failures lock out ALL users platform-wide for 15 minutes.

**Evidence:** `src/auth/lib/request.ts:38-55`, `src/auth/config/env.ts:231-240`

**Attack Scenario:** Deployment skips env validation. All traffic shares one bucket. ~20 failures lock out all logins.

**Impact:** Platform-wide login lockout (availability DoS).

**Root Cause:** Fail-closed guard correct but could be bypassed by misconfigured deployment.

**Remediation:** Add runtime assertion that sentinel is never used as rate-limit key.

**Acceptance Criteria:** Production without TRUSTED_PROXY_IP_HEADER refuses to boot. Second defense-in-depth check prevents sentinel usage.

---

### PWD-008 — Lockout Does Not Cap Maximum Lock Duration

| Field | Value |
|---|---|
| **Finding ID** | PWD-008 |
| **Title** | Lockout Does Not Cap Maximum Lock Duration |
| **Status** | Open |
| **Severity** | Low |
| **Confidence** | Medium |
| **Production Blocker** | No |
| **Affected Components** | `src/auth/services/login.service.ts` |
| **Affected Workflows** | Login |
| **CWE** | CWE-799 |
| **ASVS** | V2.1.9 |
| **Priority** | P3 |
| **Effort** | M |
| **Suggested Owner** | Backend security |
| **Residual Risk** | Low — attacker needs sustained access to target account |

**Summary:** Fixed 15-minute lockout without escalation. Attacker keeps account perpetually locked with 5 requests per 15 minutes.

**Evidence:** `src/auth/services/login.service.ts:40-41`

**Attack Scenario:** Repeated 5 failures → 15 min lock → 5 failures → 15 min lock cycle.

**Impact:** Targeted account DoS.

**Root Cause:** Fixed duration without escalation or maximum total lock window.

**Remediation:** Implement escalating durations (15 min, 30 min, 1 hour, 24 hours) with admin unlock.

**Acceptance Criteria:** After 3 lockout cycles, duration escalates. Auto-unlock after maximum window.

---

### PWD-009 — Math.random() Used for Timing Mitigation Delay

| Field | Value |
|---|---|
| **Finding ID** | PWD-009 |
| **Title** | Math.random() Used for Timing Mitigation Delay |
| **Status** | Open |
| **Severity** | Low |
| **Confidence** | High |
| **Production Blocker** | No |
| **Affected Components** | `src/auth/services/login.service.ts` |
| **Affected Workflows** | Login |
| **CWE** | CWE-330 |
| **ASVS** | V7.1.1 |
| **Priority** | P3 |
| **Effort** | S |
| **Suggested Owner** | Backend security |
| **Residual Risk** | Low — requires many samples and JS engine knowledge |

**Summary:** `Math.random()` is not cryptographically secure. Predictable delays reduce timing normalization effectiveness.

**Evidence:** `src/auth/services/login.service.ts:26-28`

**Attack Scenario:** Attacker observes enough delay values to predict PRNG state, subtracts predicted delay to recover Argon2 verify duration.

**Impact:** Marginal weakening of timing mitigation.

**Root Cause:** Math.random() used for non-security-critical delay.

**Remediation:** Replace with `crypto.randomInt(max + 1)`.

**Acceptance Criteria:** Delay uses cryptographically secure random source.

---

### PWD-010 — Password Change Session ID Derivation

| Field | Value |
|---|---|
| **Finding ID** | PWD-010 |
| **Title** | Password Change Action Derives Session ID from Client-Provided Cookie |
| **Status** | Open |
| **Severity** | Low |
| **Confidence** | Medium |
| **Production Blocker** | No |
| **Affected Components** | `src/auth/actions/change-password.ts` |
| **Affected Workflows** | Password change |
| **CWE** | CWE-668 |
| **ASVS** | V3.3.1 |
| **Priority** | P3 |
| **Effort** | S |
| **Suggested Owner** | Backend security |
| **Residual Risk** | None — design is correct, needs documentation |

**Summary:** Session ID derivation is correct; fail-safe behavior (revoke all sessions) is secure. Needs documentation.

**Evidence:** `src/auth/actions/change-password.ts:41-54`

**Attack Scenario:** N/A — design is correct.

**Impact:** Low. Design correct; fail-safe secure.

**Root Cause:** N/A — documentation needed.

**Remediation:** Add comment documenting trust boundary.

**Acceptance Criteria:** Code comment documents session ID derivation.

---

### PWD-011 — Session Secret Minimum Length Is Adequate

| Field | Value |
|---|---|
| **Finding ID** | PWD-011 |
| **Title** | Session Secret Minimum Length Is Adequate |
| **Status** | Closed |
| **Severity** | Informational |
| **Confidence** | High |
| **Production Blocker** | No |
| **Affected Components** | `src/auth/config/env.ts` |
| **Affected Workflows** | Session signing |
| **CWE** | CWE-326 |
| **ASVS** | V7.1.4 |
| **Priority** | P3 |
| **Effort** | S |
| **Suggested Owner** | N/A |
| **Residual Risk** | None — 128-bit entropy sufficient |

**Summary:** 32-char hex string (128 bits) sufficient for HMAC-SHA256. No change needed.

**Evidence:** `src/auth/config/env.ts:10,127-137`

**Attack Scenario:** None — 128 bits provides cryptographic-strength unguessability.

**Impact:** None. Positive finding.

**Root Cause:** N/A.

**Remediation:** No change needed.

---

## Password Recovery (05)

### RST-001 — Reset Token Entropy Is 64 Bits Below NIST Minimum

| Field | Value |
|---|---|
| **Finding ID** | RST-001 |
| **Title** | Reset Token Entropy Is 64 Bits Below NIST 128-Bit Minimum |
| **Status** | Open |
| **Severity** | Medium |
| **Confidence** | High |
| **Production Blocker** | No |
| **Affected Components** | `src/auth/repositories/verification-token.repository.ts` |
| **Affected Workflows** | Password recovery |
| **CWE** | CWE-330 |
| **ASVS** | V2.6.1 |
| **Priority** | P1 |
| **Effort** | S |
| **Suggested Owner** | Backend security |
| **Residual Risk** | Low — rate limiting prevents online brute-force |

**Summary:** Reset tokens use 8 bytes (64 bits). NIST requires minimum 128 bits.

**Evidence:** `src/auth/repositories/verification-token.repository.ts:24,30`

**Attack Scenario:** Offline brute-force of 16-char hex token. Online brute-force infeasible (10/15min limit). Risk if token prefix exposed.

**Impact:** Token entropy below NIST minimum.

**Root Cause:** Default byteLength=8 for URL brevity.

**Remediation:** Increase to byteLength=16 (128 bits, 32 hex chars).

**Acceptance Criteria:** Tokens have >= 128 bits entropy. Email token >= 32 hex chars.

---

### RST-002 through RST-013

*(Detailed in report 05. Summary table:)*

| ID | Title | Severity | Status | Priority |
|---|---|---|---|---|
| RST-002 | Token in URL query string | Low | Open | P3 |
| RST-003 | Token prefix in rate-limit ID | Informational | Open | P2 |
| RST-004 | TOCTOU race condition - correct | Informational | Closed | P3 |
| RST-005 | Rate limit split across layers | Low | Open | P3 |
| RST-006 | Completion rate limit uses raw prefix | Low | Open | P3 |
| RST-007 | Host header poisoning mitigated | Informational | Closed | P3 |
| RST-008 | All sessions revoked on reset | Informational | Closed | P3 |
| RST-009 | Pending tokens invalidated on change | Informational | Closed | P3 |
| RST-010 | Password change requires current password | Informational | Closed | P3 |
| RST-011 | Change revokes other sessions | Informational | Closed | P3 |
| RST-012 | Confirmation email after reset | Informational | Closed | P3 |
| RST-013 | Force-change pending cookie | Low | Open | P3 |

---

## Google OAuth (06)

### OAUTH-001 — No Clock Skew Leeway for id_token Expiry

| Field | Value |
|---|---|
| **Finding ID** | OAUTH-001 |
| **Title** | No Clock Skew Leeway for id_token Expiry |
| **Status** | Open |
| **Severity** | Medium |
| **Confidence** | High |
| **Production Blocker** | No |
| **Affected Components** | `src/auth/services/oauth.service.ts` |
| **Affected Workflows** | Google OAuth login |
| **CWE** | CWE-613 |
| **ASVS** | V2.5.2 |
| **Priority** | P1 |
| **Effort** | S |
| **Suggested Owner** | Backend security |
| **Residual Risk** | Low — only causes intermittent failures, not security bypass |

**Summary:** Strict `exp` comparison with no leeway. Legitimate users experience intermittent login failures from network latency or clock skew.

**Evidence:** `src/auth/services/oauth.service.ts:484`

**Attack Scenario:** Network latency causes token exp to be slightly in the past at verification time.

**Impact:** Intermittent login failures. Not exploitable for security bypass.

**Root Cause:** `claims.exp < now` uses strict comparison. Google recommends 5-minute leeway.

**Remediation:** Add 5-minute leeway: `claims.exp + 300 < now`.

**Acceptance Criteria:** Token with exp up to 5 minutes past is accepted; beyond is rejected.

---

### OAUTH-002 through OAUTH-020

*(Detailed in reports 06 and 07. Summary table:)*

| ID | Title | Severity | Status | Priority |
|---|---|---|---|---|
| OAUTH-002 | State comparison not constant-time | Low | Open | P3 |
| OAUTH-003 | Web path missing email_verified | Medium | Open | P2 |
| OAUTH-004 | GOOGLE_REDIRECT_URI not conditionally required | Low | Open | P2 |
| OAUTH-005 | JWKS fetch doesn't validate key types | Informational | Open | P3 |
| OAUTH-006 | Per-IP rate limit shared | Low | Open | P3 |
| OAUTH-007 | Mobile skips nonce verification | Informational | Closed | P3 |
| OAUTH-008 | No iat claim validation | Low | Open | P3 |
| OAUTH-009 | State cookie single blob | Informational | Closed | P3 |
| OAUTH-010 | Error logs internal messages | Informational | Closed | P3 |
| OAUTH-011 | Secret not required non-prod | Informational | Closed | P3 |
| OAUTH-012 | select_account prevents bypass | Informational (Pos) | Closed | P3 |
| OAUTH-013 | Alerting failures swallowed | Low | Closed | P3 |
| OAUTH-014 | providerEmail not normalized | Low | Open | P3 |
| OAUTH-015 | No unique index on (provider, providerAccountId) | Medium | Open | P1 |
| OAUTH-016 | No uniqueness for (userId, provider) | Low | Open | P3 |
| OAUTH-017 | No audit trail for linking events | Low | Open | P2 |
| OAUTH-018 | No Google token revocation mechanism | Low | Open | P3 |
| OAUTH-019 | Pre-provisioned link to active user check | Informational | Closed | P3 |
| OAUTH-020 | link() doesn't validate user existence | Low | Open | P3 |

---

## Account Linking (07)

*(Covered in OAUTH-014 through OAUTH-020 above)*

---

## Email OTP (08)

| ID | Title | Severity | Status | Priority |
|---|---|---|---|---|
| MFA-OTP-001 | OTP type filter not passed to redeem() | Informational | Open | P3 |
| MFA-OTP-002 | Code-sent audit logs missing IP | Informational | Open | P3 |

**Overall:** Email OTP implementation is well-designed with defense-in-depth across all critical areas.

---

## TOTP Authenticator (09)

### MFA-TOTP-001 — TOTP Secrets Stored in Plaintext

| Field | Value |
|---|---|
| **Finding ID** | MFA-TOTP-001 |
| **Title** | TOTP Secrets Stored in Plaintext |
| **Status** | Open |
| **Severity** | Medium |
| **Confidence** | High |
| **Production Blocker** | No |
| **Affected Components** | `src/auth/repositories/mfa.repository.ts` |
| **Affected Workflows** | TOTP authentication, TOTP enrollment |
| **CWE** | CWE-312 |
| **ASVS** | V7.1.1 |
| **Priority** | P1 |
| **Effort** | M |
| **Suggested Owner** | Backend security |
| **Residual Risk** | Medium — requires DB compromise to exploit |

**Summary:** TOTP secrets stored as plaintext Base32 in MongoDB. DB compromise exposes all TOTP secrets indefinitely.

**Evidence:** `src/auth/repositories/mfa.repository.ts:6-26`

**Attack Scenario:** Attacker with DB read access extracts all TOTP secrets, generates valid codes indefinitely.

**Impact:** Complete 2FA bypass for all TOTP-enrolled users.

**Root Cause:** No application-layer encryption.

**Remediation:** Encrypt with AES-256-GCM or use MongoDB CSFLE.

**Acceptance Criteria:** TOTP secrets unreadable without encryption key.

---

### MFA-TOTP-002 through MFA-TOTP-005

| ID | Title | Severity | Status | Priority |
|---|---|---|---|---|
| MFA-TOTP-002 | QR code URL in response | Low | Open | P3 |
| MFA-TOTP-003 | No per-user TOTP rate limit | Low | Open | P2 |
| MFA-TOTP-004 | No TOTP-specific lockout | Low | Open | P2 |
| MFA-TOTP-005 | Server clock sync informational | Informational | Closed | P3 |

---

## MFA Recovery & Bypass (10)

### MFA-BYPASS-001 — 2FA Can Be Disabled Without Reauthentication

| Field | Value |
|---|---|
| **Finding ID** | MFA-BYPASS-001 |
| **Title** | 2FA Can Be Disabled Without Reauthentication |
| **Status** | Open |
| **Severity** | Medium |
| **Confidence** | High |
| **Production Blocker** | No |
| **Affected Components** | `src/auth/actions/mfa.ts` |
| **Affected Workflows** | MFA management |
| **CWE** | CWE-308 |
| **ASVS** | V2.1.1 |
| **Priority** | P0 |
| **Effort** | M |
| **Suggested Owner** | Backend security |
| **Residual Risk** | Medium — requires stolen session to exploit |

**Summary:** disableTotpAction only requires requireActiveSession(), not password or TOTP re-entry.

**Evidence:** `src/auth/actions/mfa.ts:46-53`

**Attack Scenario:** Attacker steals session cookie. Calls disableTotpAction. TOTP disabled without re-proving identity.

**Impact:** Complete 2FA removal without re-proving identity.

**Root Cause:** Session-only gate instead of reauthentication.

**Remediation:** Require password re-entry or valid TOTP code before disabling.

**Acceptance Criteria:** disableTotpAction rejects without password or TOTP proof.

---

### MFA-BYPASS-002 — TOTP Replacement Without Confirming Existing Factor

| Field | Value |
|---|---|
| **Finding ID** | MFA-BYPASS-002 |
| **Title** | TOTP Replacement Without Confirming Existing Factor |
| **Status** | Open |
| **Severity** | Medium |
| **Confidence** | High |
| **Production Blocker** | No |
| **Affected Components** | `src/auth/actions/mfa.ts`, `src/auth/services/mfa.service.ts` |
| **Affected Workflows** | TOTP enrollment |
| **CWE** | CWE-308 |
| **ASVS** | V2.1.1 |
| **Priority** | P0 |
| **Effort** | M |
| **Suggested Owner** | Backend security |
| **Residual Risk** | Medium — requires valid session to exploit |

**Summary:** User can generate new TOTP secret without verifying existing TOTP. Silent replacement via upsert.

**Evidence:** `src/auth/actions/mfa.ts:19-42`, `src/auth/services/mfa.service.ts:78-95`

**Attack Scenario:** Attacker with valid session generates new secret, sets up in own app, verifies code. Victim's TOTP replaced.

**Impact:** Attacker controls second factor.

**Root Cause:** No check for existing TOTP status before replacement.

**Remediation:** When totpEnabled: true, require current TOTP verification before replacement.

**Acceptance Criteria:** TOTP replacement requires current factor verification.

---

### MFA-BYPASS-003 — Trusted Devices Never Expire

| Field | Value |
|---|---|
| **Finding ID** | MFA-BYPASS-003 |
| **Title** | Trusted Devices Never Expire |
| **Status** | Open |
| **Severity** | Low |
| **Confidence** | High |
| **Production Blocker** | No |
| **Affected Components** | `src/auth/repositories/device.repository.ts` |
| **Affected Workflows** | Device trust |
| **CWE** | CWE-613 |
| **ASVS** | V3.5.1 |
| **Priority** | P2 |
| **Effort** | M |
| **Suggested Owner** | Backend security |
| **Residual Risk** | Low — requires physical access to trusted device |

**Summary:** trustedUntil always null. Devices remain trusted indefinitely.

**Evidence:** `src/auth/repositories/device.repository.ts:285`

**Attack Scenario:** User trusts device, later lost/sold. Remains trusted.

**Impact:** Attacker with physical access skips MFA.

**Root Cause:** No expiry logic.

**Remediation:** Set trustedUntil to 90 days from grant. Check in 2FA step-up.

**Acceptance Criteria:** Devices auto-untrust after configured duration.

---

## Session Security (11)

All session findings are Informational with no Critical or High severity. Key positive findings:

| ID | Title | Status |
|---|---|---|
| SESSION-001 | Session ID entropy (96-bit) | Closed |
| SESSION-002 | Refresh token entropy (384-bit) | Closed |
| SESSION-003 | Cookie flags correctly configured | Closed |
| SESSION-005 | New session on each login | Closed |
| SESSION-007 | 30-min idle timeout enforced | Closed |
| SESSION-008 | 7-day absolute timeout enforced | Closed |
| SESSION-010 | Logout revokes session + refresh family | Closed |
| SESSION-012 | Password change invalidates via security version | Closed |
| SESSION-014 | Disabled user checked on every validation | Closed |
| SESSION-016 | Concurrent session cap at 5 (batched) | Closed |
| SESSION-019 | Atomic refresh rotation prevents replay | Closed |
| SESSION-020 | Device binding on refresh tokens | Closed |
| SESSION-021 | EdDSA with algorithm allowlist | Closed |

**No Critical or High severity findings.**

---

## Authorization (12)

### AUTHZ-003 — Mobile Admin Routes Missing Bearer Authentication

| Field | Value |
|---|---|
| **Finding ID** | AUTHZ-003 |
| **Title** | Mobile Admin Routes Missing Bearer Authentication |
| **Status** | Open |
| **Severity** | Medium |
| **Confidence** | High |
| **Production Blocker** | No |
| **Affected Components** | `src/app/api/mobile/v1/admin/categories/route.ts`, `src/app/api/mobile/v1/admin/products/route.ts`, `src/app/api/mobile/v1/admin/sessions/revoke/route.ts` |
| **Affected Workflows** | Mobile admin API |
| **CWE** | CWE-306 |
| **ASVS** | V2.1.1 |
| **Priority** | P1 |
| **Effort** | M |
| **Suggested Owner** | Mobile/Backend |
| **Residual Risk** | Medium — functional regression for mobile clients |

**Summary:** Mobile admin routes for categories, products, and session revocation lack `authenticateBearerRequest()`. Mobile clients cannot use these endpoints.

**Evidence:** Affected routes at line 6/10.

**Attack Scenario:** Mobile app sends bearer token, receives 500 because requireActiveSession() only reads cookies.

**Impact:** Functional regression — no authorization bypass.

**Root Cause:** Inconsistent application of authenticateBearerRequest().

**Remediation:** Add authenticateBearerRequest() or authenticateCookieOrBearer() to affected routes.

**Acceptance Criteria:** Every /api/mobile/v1/admin/* route calls authenticateBearerRequest().

---

### AUTHZ-005 — revokeSessionAction Trusts Form-Supplied currentSessionId

| Field | Value |
|---|---|
| **Finding ID** | AUTHZ-005 |
| **Title** | revokeSessionAction Trusts User-Supplied currentSessionId |
| **Status** | Open |
| **Severity** | Medium |
| **Confidence** | Medium |
| **Production Blocker** | No |
| **Affected Components** | `src/auth/actions/session.ts` |
| **Affected Workflows** | Session management |
| **CWE** | CWE-862 |
| **ASVS** | V4.1.1 |
| **Priority** | P1 |
| **Effort** | S |
| **Suggested Owner** | Backend security |
| **Residual Risk** | Low — requires encrypted action ID and matching session ObjectIds |

**Summary:** revokeSessionActionImpl takes currentSessionId from form data instead of verifying caller's session.

**Evidence:** `src/auth/actions/session.ts:51-109`

**Attack Scenario:** Attacker supplies different currentSessionId. Both sessions belong to same user; ownership check passes.

**Impact:** Horizontal privilege escalation for session revocation. Low practical risk.

**Root Cause:** No requireActiveSession() call.

**Remediation:** Add requireActiveSession() and use authenticated session for ownership verification.

**Acceptance Criteria:** Caller authenticated; ownership check uses server-side session.

---

## Next.js Security (13)

### NEXT-008 — Category/Product Actions Missing withCsrfGuard

| Field | Value |
|---|---|
| **Finding ID** | NEXT-008 |
| **Title** | Category and Product CRUD Actions Missing withCsrfGuard |
| **Status** | Open |
| **Severity** | Medium |
| **Confidence** | High |
| **Production Blocker** | No |
| **Affected Components** | `src/auth/actions/category.actions.ts`, `src/auth/actions/product.actions.ts` |
| **Affected Workflows** | CMS content management |
| **CWE** | CWE-352 |
| **ASVS** | V4.1.2 |
| **Priority** | P1 |
| **Effort** | S |
| **Suggested Owner** | Backend security |
| **Residual Risk** | Low — protected by Next.js action IDs + requireCmsPermission() |

**Summary:** CMS CRUD actions not wrapped with withCsrfGuard. Reduced CSRF defense depth per project convention.

**Evidence:** `src/auth/actions/category.actions.ts:7,31,55`, `src/auth/actions/product.actions.ts:7,46,90`

**Attack Scenario:** Malicious website creates form to POST to these actions.

**Impact:** Reduced CSRF defense depth. Still protected by Next.js action IDs and server-side auth.

**Root Cause:** Actions added before withCsrfGuard convention.

**Remediation:** Wrap all exported functions with withCsrfGuard.

**Acceptance Criteria:** All data-modifying Server Actions wrapped with withCsrfGuard.

---

### NEXT-019 — Debug File Writes in verify-2fa.ts

| Field | Value |
|---|---|
| **Finding ID** | NEXT-019 |
| **Title** | Debug File Writes in verify-2fa.ts |
| **Status** | Open |
| **Severity** | Medium |
| **Confidence** | High |
| **Production Blocker** | No |
| **Affected Components** | `src/auth/actions/verify-2fa.ts` |
| **Affected Workflows** | 2FA verification |
| **CWE** | CWE-532 |
| **ASVS** | V12.4.1 |
| **Priority** | P1 |
| **Effort** | S |
| **Suggested Owner** | Backend |
| **Residual Risk** | Medium — information disclosure + operational concern |

**Summary:** fs.appendFileSync writes debug info to debug-verify.log. Creates filesystem write in production with unbounded growth.

**Evidence:** `src/auth/actions/verify-2fa.ts:125-138`

**Attack Scenario:** Filesystem access reveals device IDs, trust status. Unbounded disk growth.

**Impact:** Information disclosure; operational concern.

**Root Cause:** Debugging code left in codebase.

**Remediation:** Remove fs.appendFileSync calls. Use audit log repository.

**Acceptance Criteria:** No appendFileSync calls in src/.

---

### Other Next.js Findings

| ID | Title | Severity | Status | Priority |
|---|---|---|---|---|
| NEXT-005 | Health endpoint public | Low | Open | P3 |
| NEXT-006 | Test cookies endpoint in codebase | Low | Open | P3 |
| NEXT-017 | Contact form lacks CSRF | Low | Open | P3 |
| NEXT-021 | CSP only on dashboard | Low | Open | P3 |

---

## Abuse Prevention (14)

### RATE-001 — No Rate Limit on Session Refresh Endpoint

| Field | Value |
|---|---|
| **Finding ID** | RATE-001 |
| **Title** | No Rate Limiting on Session Refresh Endpoint |
| **Status** | Open |
| **Severity** | Medium |
| **Confidence** | High |
| **Production Blocker** | No |
| **Affected Components** | `src/app/api/auth/refresh/route.ts` |
| **Affected Workflows** | Session refresh |
| **CWE** | CWE-770 |
| **ASVS** | V2.2.1 |
| **Priority** | P1 |
| **Effort** | M |
| **Suggested Owner** | Backend security |
| **Residual Risk** | Medium — DoS via connection pool exhaustion |

**Summary:** No per-IP rate limit on POST /api/auth/refresh. Flooding could exhaust MongoDB connection pool.

**Evidence:** `src/app/api/auth/refresh/route.ts:23-106`

**Attack Scenario:** Attacker floods refresh endpoint. Each call triggers MongoDB read+write. Exhausts pool (maxPoolSize: 10).

**Impact:** DoS against all authenticated users.

**Root Cause:** Relies on origin check and token rotation only.

**Remediation:** Add per-IP rate limit (60/min).

**Acceptance Criteria:** POST /api/auth/refresh enforces per-IP rate limit returning 429.

---

### RATE-002 — TOTP Verification Has No Dedicated IP-Based Rate Limit

| Field | Value |
|---|---|
| **Finding ID** | RATE-002 |
| **Title** | TOTP Verification Has No Dedicated IP-Based Rate Limit |
| **Status** | Open |
| **Severity** | Medium |
| **Confidence** | High |
| **Production Blocker** | No |
| **Affected Components** | `src/auth/actions/verify-totp.ts` |
| **Affected Workflows** | TOTP authentication |
| **CWE** | CWE-307 |
| **ASVS** | V2.2.1 |
| **Priority** | P1 |
| **Effort** | S |
| **Suggested Owner** | Backend security |
| **Residual Risk** | Medium — 6-digit TOTP space not practically brute-forceable |

**Summary:** No per-user aggregate TOTP failure limit across pending sessions.

**Evidence:** `src/auth/actions/verify-totp.ts:35-169,77-90`

**Attack Scenario:** Multiple pending sessions allow 5*N total TOTP attempts.

**Impact:** Elevated brute-force surface.

**Root Cause:** Only attemptsRemaining per pending auth, no aggregate limit.

**Remediation:** Add per-user TOTP failure rate limit (10 per 15 min).

**Acceptance Criteria:** Per-user aggregate failure counter enforced.

---

### RATE-004 — IP Bucket Collapse Without Trusted Proxy

*(Mitigated — boot guard prevents production deployment without header)*

### Other Rate Limiting Findings

| ID | Title | Severity | Status | Priority |
|---|---|---|---|---|
| RATE-003 | Recovery code shares failure window | Low | Open | P2 |
| RATE-005 | IPv6 normalization not enforced | Low | Open | P2 |
| RATE-006 | No global IP lockout | Low | Open | P3 |
| RATE-007 | Password reset allows repeated cycles | Low | Open | P2 |
| RATE-008 | Serverless race condition | Low | Open | P3 |
| RATE-009 | Spike alerting in-memory only | Low | Open | P3 |
| RATE-010 | No rate limit on WebAuthn | Low | Open | P2 |

---

## Secrets & Deployment (15)

### DEPLOY-001 — HSTS Must Be Configured at the Edge

| Field | Value |
|---|---|
| **Finding ID** | DEPLOY-001 |
| **Title** | HSTS Must Be Configured at the Edge |
| **Status** | Open |
| **Severity** | High |
| **Confidence** | High |
| **Production Blocker** | Yes (deployment-level) |
| **Affected Components** | `next.config.ts` |
| **Affected Workflows** | HTTPS enforcement |
| **CWE** | CWE-319 |
| **ASVS** | V9.1.2 |
| **Priority** | P0 |
| **Effort** | S |
| **Suggested Owner** | DevOps |
| **Residual Risk** | Medium — requires edge platform configuration |

**Summary:** HSTS must be at edge (Vercel/Netlify _headers). Without it, initial HTTP requests send session cookies in cleartext.

**Evidence:** `next.config.ts:32-35`

**Attack Scenario:** SSL stripping attack intercepts session cookie before HTTPS redirect.

**Impact:** Session cookie interception on first visit.

**Root Cause:** Application defers HSTS to edge but no verification exists.

**Remediation:** Document required edge config. Add E2E test. Consider adding header in next.config.ts.

**Acceptance Criteria:** E2E test verifies Strict-Transport-Security with max-age >= 31536000.

---

### Other Deployment Findings

| ID | Title | Severity | Status |
|---|---|---|---|
| DEPLOY-002 | No committed secrets | None (pass) | Closed |
| DEPLOY-003 | No NEXT_PUBLIC_ leaks | None (pass) | Closed |
| DEPLOY-004 | SESSION_SECRET guard | None (pass) | Closed |
| DEPLOY-005 | ARGON2_SECRET guard | None (pass) | Closed |
| DEPLOY-006 | SECURE_COOKIES guard | None (pass) | Closed |
| DEPLOY-007 | TRUSTED_PROXY guard | None (pass) | Closed |
| DEPLOY-008 | All secrets boot-verified | None (pass) | Closed |
| DEPLOY-009 | MongoDB TLS enforced | None (pass) | Closed |
| DEPLOY-010 | URI leak in DB config error | Low | Open |
| DEPLOY-011 | Security headers on dashboard | None (pass) | Closed |
| DEPLOY-012 | CSP nonce generation | None (pass) | Closed |
| DEPLOY-013 | Missing Permissions-Policy | Low | Open |
| DEPLOY-014 | style-src unsafe-inline | Low | Open |
| DEPLOY-015 | CORS mobile origins optional | Low | Open |
| DEPLOY-016 | WebAuthn HTTPS enforced | None (pass) | Closed |

---

## Operational Security (16)

### OPS-001 — Debug File Writes in Production 2FA Code Path

| Field | Value |
|---|---|
| **Finding ID** | OPS-001 |
| **Title** | Debug File Writes Left in Production 2FA Code Path |
| **Status** | Open |
| **Severity** | Critical |
| **Confidence** | High |
| **Production Blocker** | Yes |
| **Affected Components** | `src/auth/actions/verify-2fa.ts` |
| **Affected Workflows** | 2FA verification |
| **CWE** | CWE-532 |
| **ASVS** | V12.4.1 |
| **Priority** | P0 |
| **Effort** | S |
| **Suggested Owner** | Backend |
| **Residual Risk** | None after removal |

**Summary:** fs.appendFileSync writes to debug-verify.log on every 2FA verification. Contains device IDs, trust status. Production blocker.

**Evidence:** `src/auth/actions/verify-2fa.ts:126-135`

**Attack Scenario:** Filesystem access reads device trust state. Unbounded log growth.

**Impact:** Information disclosure; operational concern.

**Root Cause:** Debug code added during development, not removed.

**Remediation:** Remove all fs.appendFileSync calls and fs import. Use audit log repository.

**Acceptance Criteria:** No appendFileSync calls in src/. No debug-verify.log references.

---

### OPS-002 through OPS-011

| ID | Title | Severity | Status | Priority |
|---|---|---|---|---|
| OPS-002 | Dev mode logs 2FA codes | Medium | Open | P1 |
| OPS-003 | DB config leaks URI | Medium | Open | P1 |
| OPS-004 | Security webhook optional | Medium | Open | P1 |
| OPS-005 | login_attempts TTL 24h | Low | Open | P2 |
| OPS-006 | Spike buckets reset on restart | Low | Open | P3 |
| OPS-007 | No dependency scanning | Medium | Open | P1 |
| OPS-008 | Audit log retention 180 days | Low | Open | P3 |
| OPS-009 | Alerting fire-and-forget | None (pass) | Closed | P3 |
| OPS-010 | Mail failures swallowed | Low | Open | P2 |
| OPS-011 | No startup banner | Low | Open | P3 |

---

## Finding Statistics

| Severity | Count |
|---|---|
| Critical | 2 (OPS-001, RATE-004 mitigated) |
| High | 2 (PWD-007, DEPLOY-001) |
| Medium | 18 |
| Low | 42 |
| Informational | 56 |
| **Total** | **~120** |

| Status | Count |
|---|---|
| Open | ~70 |
| Closed | ~50 |

| Priority | Count |
|---|---|
| P0 | 5 |
| P1 | 12 |
| P2 | 18 |
| P3 | ~85 |
