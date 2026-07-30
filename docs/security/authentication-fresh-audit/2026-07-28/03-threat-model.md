# Threat Model

## Methodology

This threat model uses the STRIDE framework (Spoofing, Tampering, Repudiation, Information Disclosure, Denial of Service, Elevation of Privilege) applied to each component of the authentication system. Threats are scored by likelihood and impact, and existing controls are mapped to determine residual risk.

## Component Decomposition

| Component | Description | Trust Boundary |
|---|---|---|
| C1: Browser/Client | User agent, cookies, HTTP requests | Untrusted |
| C2: Middleware (proxy.ts) | Edge-level session check, CSP nonce | Semi-trusted |
| C3: Route Handlers | /api/auth/* endpoints | Trusted |
| C4: Server Actions | src/auth/actions/* form handlers | Trusted |
| C5: Service Layer | Business logic, risk evaluation | Trusted |
| C6: Repository Layer | MongoDB queries, atomic operations | Trusted |
| C7: MongoDB | Data persistence | Trusted |
| C8: Cryptographic Ops | Password hashing, token signing, HMAC | Trusted |
| C9: Google OAuth | External identity provider | External |
| C10: Email (SMTP) | 2FA codes, reset links | External |
| C11: Geo-IP | Location-based risk signals | Untrusted |

## STRIDE Analysis

### Spoofing

#### T-001: Session Cookie Forgery

| Field | Value |
|---|---|
| Threat ID | T-001 |
| STRIDE | Spoofing |
| Affected Component | C8 (Session Signing), C1 (Browser) |
| Likelihood | Low |
| Impact | Critical |
| Description | Attacker forges a `cws_session` cookie to impersonate a legitimate user. |
| Existing Controls | HMAC-SHA256 signing with `SESSION_SECRET` (≥32 chars, fail-closed in prod); timing-safe verification (`crypto.timingSafeEqual`) |
| Residual Risk | Low — Requires compromise of `SESSION_SECRET` (≥32 chars, generated via `openssl rand -hex 32`) |
| Recommended Mitigation | None — controls are adequate. Ensure `SESSION_SECRET` is rotated per-environment and never committed to version control. |

#### T-002: CSRF Attack on State-Changing Endpoints

| Field | Value |
|---|---|
| Threat ID | T-002 |
| STRIDE | Spoofing |
| Affected Component | C3, C4, C5 |
| Likelihood | Low |
| Impact | High |
| Description | Attacker crafts a cross-origin request that triggers a state-changing action (login, password change, 2FA) on behalf of an authenticated user. |
| Existing Controls | `assertSameOrigin()` / `assertSameOriginStrict()` on every state-changing endpoint; Next.js Server Action CSRF (encrypted action IDs + POST-only); SameSite cookie policy (Strict for high-value tokens) |
| Residual Risk | Low — Triple-layer defense: SameSite cookies block cross-site form POST sends for high-value tokens; origin/Referer check catches cross-origin fetch; Next.js built-in catches malformed actions |
| Recommended Mitigation | None — controls are defense-in-depth and adequate. |

#### T-003: OAuth State Parameter Bypass

| Field | Value |
|---|---|
| Threat ID | T-003 |
| STRIDE | Spoofing |
| Affected Component | C9 (Google OAuth) |
| Likelihood | Very Low |
| Impact | Critical |
| Description | Attacker forges or manipulates the OAuth `state` parameter to complete an OAuth login as a different user or link to a different account. |
| Existing Controls | `state` is 32 bytes (256 bits) of `crypto.randomBytes`; stored in HttpOnly cookie; verified at callback (`state !== expectedState` → error); PKCE `code_verifier` prevents code interception |
| Residual Risk | Very Low — 256-bit entropy makes brute-force infeasible; cookie is HttpOnly (no XSS read); PKCE prevents authorization code injection |
| Recommended Mitigation | Replace `!==` with timing-safe comparison for defense-in-depth (see OAUTH-002). |

#### T-004: Device Token Forgery

| Field | Value |
|---|---|
| Threat ID | T-004 |
| STRIDE | Spoofing |
| Affected Component | C8, C1 |
| Likelihood | Low |
| Impact | Medium |
| Description | Attacker forges a `cws_device_token` cookie to present a different device identity. |
| Existing Controls | HMAC-SHA256 signed with `SESSION_SECRET`; timing-safe verification; device binding on refresh |
| Residual Risk | Low — Same protection as session signing |
| Recommended Mitigation | None |

#### T-005: Account Enumeration via OAuth Error Messages

| Field | Value |
|---|---|
| Threat ID | T-005 |
| STRIDE | Spoofing |
| Affected Component | C9 (Google OAuth) |
| Likelihood | Medium |
| Impact | Low |
| Description | Error messages in the OAuth callback reveal whether a Google account has a pre-provisioned link ("Google sign-in is not enabled for this account") vs. other errors. |
| Existing Controls | Generic redirect to `/dashboard/login/?error=oauth_failed` at the route handler level; detailed error logged server-side only |
| Residual Risk | Low — The route handler catches all errors and redirects with a generic error. The detailed message is only in server logs. |
| Recommended Mitigation | None — the route handler already provides enumeration resistance at the HTTP response level. |

---

### Tampering

#### T-006: Password Reset Token Manipulation

| Field | Value |
|---|---|
| Threat ID | T-006 |
| STRIDE | Tampering |
| Affected Component | C6 (VerificationTokenRepository) |
| Likelihood | Very Low |
| Impact | Critical |
| Description | Attacker attempts to modify a password reset token to gain access to a different account. |
| Existing Controls | Token stored as SHA-256 hash only; 32-byte random token; atomic redeem pattern (single-use); 30-minute expiry; rate limiting |
| Residual Risk | Very Low — Token is never stored in plaintext; modification would require preimage attack on SHA-256 |
| Recommended Mitigation | None |

#### T-007: Session Data Modification via MongoDB

| Field | Value |
|---|---|
| Threat ID | T-007 |
| STRIDE | Tampering |
| Affected Component | C7 (MongoDB) |
| Likelihood | Very Low |
| Impact | Critical |
| Description | Attacker with direct MongoDB access modifies session documents to extend expiry or change userId. |
| Existing Controls | Session ID is HMAC-signed (tampering detectable); `accountSecurityVersion` mismatch triggers revocation; session validation re-checks user status on every use |
| Residual Risk | Very Low — Requires MongoDB compromise; HMAC signature detects session ID tampering; version check detects data tampering |
| Recommended Mitigation | Ensure MongoDB authentication is enabled and credentials are rotated. Enable audit logging for direct DB access. |

#### T-008: Argon2 Pepper Removal

| Field | Value |
|---|---|
| Threat ID | T-008 |
| STRIDE | Tampering |
| Affected Component | C8 (Password Hashing) |
| Likelihood | Very Low |
| Impact | High |
| Description | An attacker who gains access to the database without the pepper can attempt offline password cracking more easily. |
| Existing Controls | `ARGON2_SECRET` required in production (≥16 chars); fail-closed boot guard; pepper integrated into Argon2id as `secret` parameter |
| Residual Risk | Low — Fail-closed boot guard prevents deployment without pepper; Argon2id parameters (64MB, t=3, p=1) provide strong baseline even without pepper |
| Recommended Mitigation | Consider increasing Argon2id memory cost to 128MB or 256MB for stronger baseline protection. |

---

### Repudiation

#### T-009: Missing Audit Log for Authentication Events

| Field | Value |
|---|---|
| Threat ID | T-009 |
| STRIDE | Repudiation |
| Affected Component | C5, C6 (AuditLogRepository) |
| Likelihood | Low |
| Impact | Medium |
| Description | A user denies performing an action (login, password change, logout) and there is insufficient audit trail. |
| Existing Controls | Comprehensive audit logging: `auth.login.success`, `auth.login.failure`, `auth.mfa.verified`, `auth.mfa.failed`, `auth.mfa.code.sent`, `auth.mfa.recovery.used`, `auth.password.change.success`, `auth.password.change.failure`, `auth.password.reset.success`, `auth.logout.success`, `auth.risk.evaluated`, `auth.refresh.expired`, `auth.refresh.reuse_detected` |
| Residual Risk | Low — All significant authentication events are logged with userId, sessionId, IP, userAgent, timestamp, and metadata |
| Recommended Mitigation | None — audit coverage is comprehensive |

#### T-010: Alert Event Not Forwarded

| Field | Value |
|---|---|
| Threat ID | T-010 |
| STRIDE | Repudiation |
| Affected Component | C5 (AlertingService) |
| Likelihood | Low |
| Impact | Medium |
| Description | A critical security event (e.g., refresh token reuse) occurs but the alert is not forwarded due to sink failure. |
| Existing Controls | Best-effort fan-out (never throws); sink errors are logged to console; email delivery failures are swallowed |
| Residual Risk | Low — Events are always logged to `audit_logs` (MongoDB); the alerting sink is supplementary, not the sole record |
| Recommended Mitigation | Consider a dead-letter queue or retry mechanism for failed alert deliveries. |

---

### Information Disclosure

#### T-011: Timing Side-Channel on Login

| Field | Value |
|---|---|
| Threat ID | T-011 |
| STRIDE | Information Disclosure |
| Affected Component | C5 (LoginService), C8 (Password Verification) |
| Likelihood | Medium |
| Impact | Medium |
| Description | Response time differences reveal whether an email address exists in the system (known-user path takes longer than unknown-user path). |
| Existing Controls | FIX-08: `DUMMY_HASH` (precomputed Argon2id hash) runs on unknown-user path; `randomDelayMs(0-50)` adds jitter; both paths execute `verifyPassword()` |
| Residual Risk | Low — Dummy hash + jitter makes timing profiles approximately equal; remaining variance is within normal network jitter |
| Recommended Mitigation | None — mitigation is effective. |

#### T-012: Error Message Leakage

| Field | Value |
|---|---|
| Threat ID | T-012 |
| STRIDE | Information Disclosure |
| Affected Component | C3, C4, C5 |
| Likelihood | Low |
| Impact | Medium |
| Description | Detailed error messages reveal internal state (e.g., "User record not found" vs. "Password verification failed" reveals whether the email exists). |
| Existing Controls | Generic user-facing messages (`GENERIC_PASSWORD_REJECTION` for policy violations); CSRF error returns `{ error: 'Request blocked.' }` without revealing origin; OAuth errors are generic at the HTTP level |
| Residual Risk | Low — Login error messages are generic at the HTTP response level; detailed messages are only in server logs and audit entries |
| Recommended Mitigation | None — user-facing error messages are already generic |

#### T-013: Debug Log Secret Exposure

| Field | Value |
|---|---|
| Threat ID | T-013 |
| STRIDE | Information Disclosure |
| Affected Component | C5 (Services), C6 (Repositories) |
| Likelihood | Low |
| Impact | Critical |
| Description | Secrets, tokens, or session IDs are logged to console or external logging services. |
| Existing Controls | `validateSecurityConfig()` explicitly states "No secret values are printed in this message"; error logging uses `err.message` (never secret values); audit logs store only metadata, never credentials |
| Residual Risk | Low — Code review shows no instances of secret values in log statements |
| Recommended Mitigation | None — but ensure log aggregation services are configured to redact patterns matching hex strings and base64 tokens. |

#### T-014: Cookie Value Exposure via Referer Header

| Field | Value |
|---|---|
| Threat ID | T-014 |
| STRIDE | Information Disclosure |
| Affected Component | C1 (Browser) |
| Likelihood | Low |
| Impact | Medium |
| Description | Sensitive values in URLs (e.g., password reset tokens) are leaked via the Referer header when navigating to external sites. |
| Existing Controls | `Referrer-Policy: strict-origin-when-cross-origin` (CSP); reset tokens are in query params but short-lived (30min); `form-action 'self'` in CSP |
| Residual Risk | Low — CSP `form-action 'self'` prevents form submission to external origins; `Referrer-Policy` limits cross-origin referer leakage |
| Recommended Mitigation | Consider adding `Referrer-Policy: no-referrer` for auth endpoints, or using one-time tokens that are immediately invalidated. |

---

### Denial of Service

#### T-015: Rate Limit Collapse via Untrusted IP Sentinel

| Field | Value |
|---|---|
| Threat ID | T-015 |
| STRIDE | Denial of Service |
| Affected Component | C5 (RateLimitService), C3 (getClientIp) |
| Likelihood | Low (with production fail-closed) |
| Impact | Critical |
| Description | Without a trusted proxy header, all client IPs resolve to `0.0.0.0` sentinel, collapsing per-IP rate limits into a single global bucket. ~20 cross-user failures lock out all logins. |
| Existing Controls | `TRUSTED_PROXY_IP_HEADER` required in production (fail-closed boot guard); `UNTRUSTED_IP_SENTINEL` detection skips IP dimension in rate limit; per-identifier limit remains active |
| Residual Risk | Low — Production deployment requires `TRUSTED_PROXY_IP_HEADER` (fail-closed); even without it, per-identifier limit still protects individual accounts |
| Recommended Mitigation | None — fail-closed guard is adequate. Ensure deployment documentation clearly specifies this requirement. |

#### T-016: Account Lockout DoS

| Field | Value |
|---|---|
| Threat ID | T-016 |
| STRIDE | Denial of Service |
| Affected Component | C5 (LoginService), C6 (UserRepository) |
| Likelihood | Medium |
| Impact | Medium |
| Description | Attacker intentionally triggers account lockout by submitting 5 wrong passwords, locking the legitimate user out for 15 minutes. |
| Existing Controls | Atomic lockout (5 failures → 15min); rate limiting (20/15min per IP); progressive delay (exponential backoff after 5 failures) |
| Residual Risk | Medium — A targeted attacker with multiple IPs could still lock out a specific account. The 15-minute window limits damage. |
| Recommended Mitigation | Consider: (1) account recovery mechanism for locked accounts (e.g., email notification with unlock link), (2) increasing lockout threshold, (3) CAPTCHA after N failures |

#### T-017: Password Hash Computation DoS

| Field | Value |
|---|---|
| Threat ID | T-017 |
| STRIDE | Denial of Service |
| Affected Component | C8 (Argon2id) |
| Likelihood | Low |
| Impact | Medium |
| Description | Attacker floods login endpoint with requests, each triggering an expensive Argon2id computation (64MB, t=3). |
| Existing Controls | IP rate limiting (20/15min); progressive delay; unknown-email path uses `DUMMY_HASH` (same cost); platform-level rate limiting assumed |
| Residual Risk | Low — Rate limiting + progressive delay limit exposure; platform-level controls (CDN, WAF) assumed |
| Recommended Mitigation | Ensure platform-level rate limiting is configured. Consider request timeout at the middleware level. |

---

### Elevation of Privilege

#### T-018: Horizontal Privilege Escalation via Session Fixation

| Field | Value |
|---|---|
| Threat ID | T-018 |
| STRIDE | Elevation of Privilege |
| Affected Component | C5 (SessionService) |
| Likelihood | Very Low |
| Impact | Critical |
| Description | Attacker fixes a session ID for a victim, then the victim authenticates with the attacker's session. |
| Existing Controls | Session IDs are MongoDB ObjectIds (server-generated, not user-controllable); HMAC-signed; session is created fresh on each login; `accountSecurityVersion` check |
| Residual Risk | Very Low — Session IDs are server-generated ObjectIds; no session fixation vector exists |
| Recommended Mitigation | None |

#### T-019: Vertical Privilege Escalation via Missing Authorization Check

| Field | Value |
|---|---|
| Threat ID | T-019 |
| STRIDE | Elevation of Privilege |
| Affected Component | C3, C4, C5 |
| Likelihood | Low |
| Impact | Critical |
| Description | A regular user accesses admin-only endpoints or data due to missing role checks. |
| Existing Controls | `requireActiveSession()` for protected dashboard access; `requireRole('admin')` for admin-only work; ownership checks in repositories; session validation re-checks user status on every use |
| Residual Risk | Low — Authorization is enforced server-side at every entry point; session validation checks user status on each request |
| Recommended Mitigation | None — but ensure all new endpoints consistently use `requireRole()` for admin operations |

#### T-020: MFA Bypass via OAuth Login

| Field | Value |
|---|---|
| Threat ID | T-020 |
| STRIDE | Elevation of Privilege |
| Affected Component | C9 (Google OAuth), C5 (OAuthService) |
| Likelihood | Low |
| Impact | Critical |
| Description | An attacker uses Google OAuth to bypass MFA requirements that would be enforced on password login. |
| Existing Controls | FIX-03: OAuth callback applies same risk evaluation pipeline as password login; MFA required if risk policy says so; pre-provisioned linking only (no auto-link) |
| Residual Risk | Low — OAuth login goes through the same `evaluateLoginRisk()` pipeline; MFA is enforced for high-risk logins regardless of authentication method |
| Recommended Mitigation | None |

#### T-021: OAuth Auto-Link Account Takeover

| Field | Value |
|---|---|
| Threat ID | T-021 |
| STRIDE | Elevation of Privilege |
| Affected Component | C9 (Google OAuth), C6 (OAuthAccountRepository) |
| Likelihood | Low |
| Impact | Critical |
| Description | An attacker creates a Google account with a verified email matching a provisioned user, then uses OAuth to auto-link and authenticate as that user. |
| Existing Controls | FIX-C3: Pre-provisioned linking ONLY; no auto-link by verified email; `oauth_accounts` row must exist before OAuth login succeeds |
| Residual Risk | Low — The `findByProvider('google', profile.sub)` lookup requires a pre-existing row; there is no email-based auto-link path |
| Recommended Mitigation | None — FIX-C3 is correctly implemented |

#### T-022: Password Reset Bypasses 2FA

| Field | Value |
|---|---|
| Threat ID | T-022 |
| STRIDE | Elevation of Privilege |
| Affected Component | C5 (PasswordService) |
| Likelihood | Low |
| Impact | High |
| Description | After a password reset, does the user bypass 2FA on next login? |
| Existing Controls | Password reset revokes ALL sessions (`revokeAllUserSessionsExcept(userId, null)`); user must authenticate fresh; login flow re-evaluates risk and 2FA policy |
| Residual Risk | Low — Reset clears all sessions; next login goes through full authentication pipeline including risk evaluation and 2FA |
| Recommended Mitigation | None |

#### T-023: Concurrent Refresh Token Rotation Race

| Field | Value |
|---|---|
| Threat ID | T-023 |
| STRIDE | Elevation of Privilege |
| Affected Component | C5 (SessionService), C6 (RefreshTokenRepository) |
| Likelihood | Low |
| Impact | Medium |
| Description | Two concurrent refresh requests with the same token both succeed, producing two valid token chains. |
| Existing Controls | H-4 fix: `atomicReplace()` ensures only one concurrent rotation wins; loser is routed down reuse-revoke path; entire session family revoked on detected race |
| Residual Risk | Low — Atomic MongoDB operation prevents double-spend; race loser triggers reuse detection |
| Recommended Mitigation | None |

#### T-024: Step-Up MFA Bypass via Geo-IP Fail-Open

| Field | Value |
|---|---|
| Threat ID | T-024 |
| STRIDE | Elevation of Privilege |
| Affected Component | C11 (Geo-IP), C5 (evaluateLoginRisk) |
| Likelihood | Medium |
| Impact | Medium |
| Description | If `GEOIP_LOOKUP_URL` is not configured, geo-IP lookup returns null (fail-open), disabling country-change step-up MFA. An attacker from a different country can log in without triggering step-up. |
| Existing Controls | `STEP_UP_ENABLED` warning when GEOIP not configured; new-device step-up still fires; env.ts warns loudly in production |
| Residual Risk | Medium — Country-change step-up is inert without geo resolution; new-device step-up still provides some protection |
| Recommended Mitigation | Configure `GEOIP_LOOKUP_URL` in production to enable country-change step-up. Document the security impact of running without geo resolution. |

#### T-025: Trusted Device Status Manipulation

| Field | Value |
|---|---|
| Threat ID | T-025 |
| STRIDE | Elevation of Privilege |
| Affected Component | C1, C6 (DeviceRepository) |
| Likelihood | Low |
| Impact | Medium |
| Description | Attacker manipulates device trust status to bypass step-up MFA. |
| Existing Controls | Device trust is set server-side only (admin or explicit user action); device token is HMAC-signed; trust status verified in risk evaluation |
| Residual Risk | Low — Device trust is server-controlled; client cannot modify it |
| Recommended Mitigation | None |

---

## Threat Summary Matrix

| Threat ID | STRIDE | Component | Likelihood | Impact | Residual Risk | Status |
|---|---|---|---|---|---|---|
| T-001 | Spoofing | Session Forgery | Low | Critical | Low | Mitigated |
| T-002 | Spoofing | CSRF | Low | High | Low | Mitigated |
| T-003 | Spoofing | OAuth State | Very Low | Critical | Very Low | Mitigated |
| T-004 | Spoofing | Device Token | Low | Medium | Low | Mitigated |
| T-005 | Spoofing | OAuth Enumeration | Medium | Low | Low | Mitigated |
| T-006 | Tampering | Reset Token | Very Low | Critical | Very Low | Mitigated |
| T-007 | Tampering | Session Data | Very Low | Critical | Very Low | Mitigated |
| T-008 | Tampering | Pepper Removal | Very Low | High | Low | Mitigated |
| T-009 | Repudiation | Missing Audit | Low | Medium | Low | Mitigated |
| T-010 | Repudiation | Alert Failure | Low | Medium | Low | Mitigated |
| T-011 | Info Disc. | Timing Channel | Medium | Medium | Low | Mitigated |
| T-012 | Info Disc. | Error Messages | Low | Medium | Low | Mitigated |
| T-013 | Info Disc. | Secret Exposure | Low | Critical | Low | Mitigated |
| T-014 | Info Disc. | Referer Leakage | Low | Medium | Low | Mitigated |
| T-015 | DoS | Rate Limit Collapse | Low | Critical | Low | Mitigated |
| T-016 | DoS | Lockout DoS | Medium | Medium | Medium | Accept/Mitigate |
| T-017 | DoS | Hash Computation | Low | Medium | Low | Mitigated |
| T-018 | EoP | Session Fixation | Very Low | Critical | Very Low | Mitigated |
| T-019 | EoP | Missing AuthZ | Low | Critical | Low | Mitigated |
| T-020 | EoP | MFA Bypass (OAuth) | Low | Critical | Low | Mitigated |
| T-021 | EoP | OAuth Auto-Link | Low | Critical | Low | Mitigated |
| T-022 | EoP | Reset Bypasses 2FA | Low | High | Low | Mitigated |
| T-023 | EoP | Refresh Race | Low | Medium | Low | Mitigated |
| T-024 | EoP | Geo-IP Fail-Open | Medium | Medium | Medium | Accept/Mitigate |
| T-025 | EoP | Device Trust | Low | Medium | Low | Mitigated |

## Acceptable Risks

| Threat | Rationale |
|---|---|
| T-016 (Lockout DoS) | 15-minute lockout window limits damage; rate limiting limits attacker throughput; consider account recovery mechanism in future iteration |
| T-024 (Geo-IP Fail-Open) | Operational risk — requires external service configuration; new-device step-up still provides baseline protection; documented warning in env.ts |
