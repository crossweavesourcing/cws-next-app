# Authentication & Authorization Security Audit

**Application:** CWS Next.js App (App Router, internal admin tool)
**Scope:** All auth-related code — crypto, middleware/proxy, DAL, services, route handlers, server actions, DB schemas, repositories, env config
**Auditor role:** Senior Security Engineer / Auth Architect / Next.js Full-Stack Engineer
**Audit date:** 2026-07-17 (revised)
**Prior hardening reviewed:** `docs/impl/01`–`11` (refresh rotation, argon2 pepper, atomic rotation/lockout, server device token, trusted-proxy IP, monitoring/alerting, centralized secrets, idle-refresh activity, geo-IP step-up, admin forced/global logout, backup recovery codes)

> **Methodology:** This audit is *incremental and additive*. The implementation is already substantially hardened. This report identifies residual weaknesses, gaps, and production-readiness items rather than recommending a rewrite. All severity ratings are **calibrated to the actual deployment context** described below.

---

## Application Context

This report is evaluated against the following real-world constraints:

| Dimension | Value |
|---|---|
| **User base** | Limited — no public registration; accounts created only by administrators or DB seed |
| **Operators** | Few (< 10) admins/members controlling the application |
| **Public surface** | Marketing/info pages are open to all visitors; dashboard is auth-gated |
| **Infrastructure** | Serverless (Vercel/Netlify) — **no dedicated VPS, no Redis** |
| **Scaling model** | Single-region serverless; horizontal pod scaling is NOT a current concern |
| **Registration** | Closed — no self-signup, no forgot-password for the public |

### How This Changes Severity Ratings

- **Multi-instance / Redis concerns** → downgraded from Critical to **Low / Future**. With limited users on a single serverless region, in-memory state loss on cold starts is acceptable — the worst case is a missed spike alert, not a security breach. MongoDB-backed rate limiting is sufficient at this scale.
- **Brute-force / credential-stuffing at scale** → remains relevant but the **blast radius is smaller** (attackers must target known admin emails, not public sign-up endpoints).
- **RBAC granularity** → downgraded. With few operators and a simple admin/member/viewer model, fine-grained permission enforcement is a future need, not a blocker.
- **Cookie SameSite / CSRF / middleware wiring** → severity **unchanged**. These are correctness issues regardless of user count.
- **Session TTL cleanup** → downgraded from High to **Medium**. Low user count means slow document growth; still worth fixing for hygiene.

---

# Executive Summary

| Dimension | Score (0–100) | Verdict |
|---|---|---|
| **Overall Security** | **82** | Strong for an internal app with limited users |
| **Architecture** | **84** | Well-layered (DAL → Service → Repo), clean separation |
| **Production Readiness** | **75** | *(up from 68)* — most gaps are now low-priority given the context |

**Top strengths**
- Argon2id with application-level pepper (`ARGON2_SECRET`) and fail-closed production boot guard.
- Opaque, SHA-256-hashed, rotating refresh tokens with full reuse detection and theft alerts.
- Server-issued, HMAC-signed device identity token (`cws_device_token`) — client UUID correctly treated as correlation-only.
- Defense-in-depth: atomic concurrent-session cap, idle + absolute session expiry, account `securityVersion` invalidation, soft-delete, global/admin revocation.
- Google OAuth: Authorization Code + PKCE with `state`, `nonce`, JWKS signature verification, pre-provisioned linking only (no email-takeover auto-linking).
- Comprehensive CSRF defense on all major Server Actions (`withCsrfGuard` applied to login, verify-2fa, resend-2fa, change-password, session revoke, admin revoke).
- Strong security headers in `next.config.ts`: HSTS, X-Frame-Options: DENY, nosniff, same-origin Referrer-Policy, Permissions-Policy, COOP.
- Nonce-based CSP generation in `proxy.ts` (pending wiring — see C-01).
- Centralized, best-effort, fail-open alerting sink with spike aggregation.
- Comprehensive audit-logging schema with consistent writes across all auth events.

**Top risks (context-adjusted)**
1. **[CRITICAL]** `proxy.ts` is NOT wired as Next.js middleware — route guard + CSP nonce are never executed by the framework.
2. **[CRITICAL]** Google OAuth callback hardcodes all cookies with `SameSite: 'lax'` — pending cookies and refresh cookie should be `'strict'` per the C1 hardening standard applied everywhere else.
3. **[HIGH]** `verifyTotpAction` is missing `withCsrfGuard` + uses wrong cookie-clearing pattern.
4. **[MEDIUM]** WebAuthn `rpID` hardcoded to `'your-domain.com'` — will break passkeys in production.
5. **[LOW]** In-memory alert spike aggregation resets on cold start — acceptable at current scale.

---

# Critical Issues

### C-01 — `proxy.ts` Is Not Wired as Next.js Middleware

**Severity:** 🔴 Critical
**Affected files:** [`proxy.ts`](file:///Users/User/Documents/projects/cws-proj/cws-next-app/src/proxy.ts)

**Explanation:** The file exports `proxy()` and `config`, but Next.js requires a file named `middleware.ts` at the project root or `src/` root. No such file exists. This means:
- The route guard that redirects unauthenticated users away from `/dashboard/*` **never runs** at the edge — every request hits the Server Component, which then redirects via `requireAuth()`. This leaks SSR rendering work and potentially partial page data before the redirect fires.
- The per-request CSP nonce (`script-src 'self' 'nonce-xxx'`) is **never applied**. The security headers in `next.config.ts` (HSTS, X-Frame-Options, nosniff, COOP) still apply, but inline scripts run without nonce enforcement.

**Context note:** Even with limited users, this is critical because the CSP is the primary XSS defense, and the route guard prevents unnecessary server-side work on unauthenticated requests.

**Risk:** No nonce-based XSS protection; unauthenticated SSR rendering of protected pages.

**Fix (15 min):** Create `src/middleware.ts`:
```typescript
export { proxy as middleware, config } from './proxy';
```

---

### C-02 — OAuth Callback Cookies Use `SameSite: 'lax'` Instead of `'strict'`

**Severity:** 🔴 Critical
**Affected files:** [`callback/route.ts`](file:///Users/User/Documents/projects/cws-proj/cws-next-app/src/app/api/auth/google/callback/route.ts) (lines 84–132)

**Explanation:** The login action (`login.ts`) correctly sets `cws_2fa_pending`, `cws_stepup_pending`, `cws_pw_pending`, and `cws_refresh` using `strictCookieOpts()` from the shared cookie module. But the Google OAuth callback **hardcodes** all cookie options inline with `sameSite: 'lax'`. This creates two issues:

1. **Pending cookies (`cws_2fa_pending`, `cws_pw_pending`, `cws_stepup_pending`) set Lax** — a cross-site top-level form POST would send these to the verify-2fa Server Action, potentially allowing an attacker to complete the 2FA step on the user's behalf.
2. **Refresh cookie (`cws_refresh`) set Lax** — contradicts every other code path where it's Strict, expanding the CSRF attack surface on `/api/auth/refresh`.

**Context note:** Even with few users, this is a code-correctness issue. The rest of the codebase carefully maintains the Lax/Strict split; the OAuth callback is the single point of inconsistency.

**Risk:** CSRF attack surface expansion on 2FA completion and token refresh after OAuth login.

**Fix (15 min):** Replace hardcoded cookie options with the shared helpers:
```typescript
// Pending cookies → strictCookieOpts
import { strictCookieOpts, sessionCookieOpts } from '@/auth/lib/cookies';

// For cws_2fa_pending / cws_pw_pending / cws_stepup_pending:
cookieStore.set(TWO_FA_PENDING_COOKIE, pending, {
  ...strictCookieOpts(env),
  maxAge: 5 * 60,
});

// For cws_session → sessionCookieOpts (Lax — correct)
// For cws_refresh → strictCookieOpts with path
cookieStore.set(REFRESH_COOKIE, result.refreshToken, {
  ...strictCookieOpts(env, { path: '/api/auth/refresh' }),
  maxAge: Math.floor(env.REFRESH_TOKEN_TTL_MS / 1000),
});
```

---

# High Priority Issues

### H-01 — `verifyTotpAction` Missing `withCsrfGuard` + Wrong Cookie Clearing

**Severity:** 🟠 High
**Affected files:** [`verify-totp.ts`](file:///Users/User/Documents/projects/cws-proj/cws-next-app/src/auth/actions/verify-totp.ts)

**Explanation:** Two issues in this file:

1. **No `withCsrfGuard` wrapper.** Every other mutating Server Action (`loginAction`, `verify2faAction`, `changePasswordAction`, `revokeSessionAction`, admin actions) is wrapped. `verifyTotpAction` is the only exception, breaking the uniform C1 defense-in-depth.

2. **Pending cookies cleared with `{ maxAge: 0, path: '/' }`** (line 79) — missing `httpOnly`, `secure`, `sameSite`. Some browsers may not match the cookie for clearing because the attributes differ from issuance. Compare with `verify2faAction` which correctly uses `clearingCookieOpts('strict', '/')`.

**Fix (10 min):**
```typescript
// Add CSRF guard
export const verifyTotpAction = withCsrfGuard(verifyTotpActionImpl);

// Fix cookie clearing
for (const name of [TWO_FA_PENDING_COOKIE, STEPUP_PENDING_COOKIE]) {
  cookieStore.set(name, '', clearingCookieOpts('strict', '/'));
}
```

### H-02 — No Rate Limiting on 2FA Code Verification

**Severity:** 🟠 High
**Affected files:** [`verify-2fa.ts`](file:///Users/User/Documents/projects/cws-proj/cws-next-app/src/auth/actions/verify-2fa.ts), [`verify-totp.ts`](file:///Users/User/Documents/projects/cws-proj/cws-next-app/src/auth/actions/verify-totp.ts)

**Explanation:** `RateLimitService` is invoked in `loginWithPassword` but NOT on the 2FA/TOTP verification paths. Email 2FA codes are 6 digits (1M possibilities). An attacker who reaches the pending state (e.g. steals the `cws_2fa_pending` cookie value) could brute-force the code without rate limiting.

**Context note:** With limited users, the attack surface is narrower (attacker needs the admin's pending cookie). But 2FA is a security control that must defend its own integrity.

**Recommendation:** Add per-userId rate limiting on `verify2faAction` and `verifyTotpAction` (e.g. max 5 attempts per pending session; invalidate pending cookie on limit). The `otp_codes` schema already has structure to support attempt tracking.

### H-03 — Remaining Mutating Actions Missing `withCsrfGuard`

**Severity:** 🟠 High (consistency)
**Affected files:** [`device.ts`](file:///Users/User/Documents/projects/cws-proj/cws-next-app/src/auth/actions/device.ts), [`recovery-codes.ts`](file:///Users/User/Documents/projects/cws-proj/cws-next-app/src/auth/actions/recovery-codes.ts), [`password-reset.ts`](file:///Users/User/Documents/projects/cws-proj/cws-next-app/src/auth/actions/password-reset.ts)

**Explanation:** The following mutating actions are NOT wrapped with `withCsrfGuard`:
- `trustDeviceAction` — changes device trust status
- `blockDeviceAction` — blocks a device and revokes its sessions
- `renameDeviceAction` — updates device name
- `generateRecoveryCodesAction` / `regenerateRecoveryCodesAction` — mints new recovery codes
- `requestResetAction` — triggers a password reset email
- `resetPasswordAction` — consumes a reset token

While Next.js provides baseline Server Action CSRF protection, the explicit `assertSameOrigin` check is the documented C1 defense-in-depth. Missing it on these actions creates an inconsistency that future auditors will flag.

**Fix (20 min):** Wrap each with `withCsrfGuard`.

---

# Medium Priority Issues

### M-01 — WebAuthn `rpID` Hardcoded to `'your-domain.com'`

**Severity:** 🟡 Medium *(not yet in active use — schemed but not deployed)*
**Affected files:** MFA service (WebAuthn registration/authentication)

**Explanation:** `rpID` is hardcoded to `'your-domain.com'` in production and `'localhost'` in dev. `origin` is derived from `rpID`. In production, WebAuthn registration/authentication will fail because the `rpID` won't match the actual domain.

**Context note:** If WebAuthn/passkeys are not yet enabled for users, this is dormant. But it should be fixed before enabling passkey MFA.

**Recommendation:** Derive `rpID` from `APP_URL`: `new URL(env.APP_URL).hostname`.

### M-02 — `AccountLockedError` Leaks Lock Expiry Time

**Severity:** 🟡 Medium
**Affected files:** [`auth-errors.ts`](file:///Users/User/Documents/projects/cws-proj/cws-next-app/src/auth/errors/auth-errors.ts) (line 30)

**Explanation:** The public error message includes `lockedUntil.toLocaleTimeString()`, telling an attacker exactly when the lockout expires so they can resume brute-forcing at the optimal moment.

**Context note:** With limited known users, an attacker already knows the target emails. Leaking the lock timer makes their job easier.

**Fix (5 min):** Replace with: `"Account is temporarily locked due to too many failed attempts. Please try again later."` Log the actual expiry server-side.

### M-03 — `resetPassword` Does Not Bump `accountSecurityVersion`

**Severity:** 🟡 Medium
**Affected files:** Password service `resetPassword()` method

**Explanation:** `changePassword` correctly increments `accountSecurityVersion` to invalidate all other sessions, but `resetPassword` does not. If a password reset is triggered due to a suspected compromise, existing sessions from before the reset remain valid.

**Context note:** With few users, the admin can manually revoke sessions. But defense-in-depth says the reset should auto-invalidate all sessions.

**Fix (10 min):** Add `$inc: { 'security.accountSecurityVersion': 1 }` to the `resetPassword` update.

### M-04 — `users.status` Enum Is Large and Partially Unused

**Severity:** 🟡 Medium (maintenance / correctness)
**Affected files:** [`users.schema.ts`](file:///Users/User/Documents/projects/cws-proj/cws-next-app/src/database/schemas/users.schema.ts), login service

**Explanation:** The `status` enum allows `locked`, `pending_password_reset`, `password_expired`, `force_password_change`, `pending_invite`, but the login flow only branches on a subset. `locked` is never set by code (lockout uses `security.lockedUntil` instead). This duality risks inconsistent enforcement if an admin tool sets `status: 'locked'`.

**Recommendation:** Consolidate: drive lockout via `security.lockedUntil` only; either remove `locked` from the enum or explicitly handle it in the login flow.

### M-05 — `recordLastLogin` Does Not Update `lastLoginAt`

**Severity:** 🟡 Medium
**Affected files:** [`user.repository.ts`](file:///Users/User/Documents/projects/cws-proj/cws-next-app/src/auth/repositories/user.repository.ts) (`recordLastLogin`)

**Explanation:** The method only sets `updatedAt`, not a dedicated `lastLoginAt` field. Session documents capture `lastActivityAt`, but there's no user-level last-login for the admin UI / anomaly baselines.

**Recommendation:** Add `security.lastLoginAt` and set it on successful login.

### M-06 — No TTL Index on `sessions` Collection

**Severity:** 🟡 Medium *(downgraded from High — low user count means slow growth)*
**Affected files:** [`sessions.indexes.ts`](file:///Users/User/Documents/projects/cws-proj/cws-next-app/src/database/indexes/sessions.indexes.ts)

**Explanation:** `refresh_tokens` and `verification_tokens` both have TTL indexes (`expireAfterSeconds: 0` on `expiresAt`), but `sessions` does not. Expired session documents accumulate indefinitely.

**Context note:** With ~10 users, this won't be a problem for months/years. Still good hygiene to add.

**Fix (5 min):** Add a TTL index: `{ key: { expiresAt: 1 }, expireAfterSeconds: 2592000, name: 'ttl_cleanup' }` (keep 30 days past expiry for audit, then auto-delete).

### M-07 — 2FA Resend Has No Rate Limit

**Severity:** 🟡 Medium
**Affected files:** [`verify-2fa.ts`](file:///Users/User/Documents/projects/cws-proj/cws-next-app/src/auth/actions/verify-2fa.ts) (`resend2faAction`)

**Explanation:** `resend2faAction` sends a new email code with no throttle, enabling email flooding.

**Context note:** With limited users, abuse is unlikely to be automated at scale, but still worth a simple guard.

**Recommendation:** Rate-limit resends (e.g. 1 per 60s, max 3 per pending session).

---

# Low Priority Improvements

### L-01 — RBAC Is Binary (`role === 'admin'`); `roles`/`permissions` Collections Unused
With only a few operators, the simple admin/member/viewer model is sufficient. The `roleId` → `roles` → `permissions` schema exists but is not enforced. This is fine for now — either adopt it when the team grows, or remove the dead schema to avoid confusion.

### L-02 — Step-Up (`STEP_UP_ENABLED`) Is OFF by Default
Step-up 2FA on new device / country change is detection + alert only. With few users on known devices, this is an acceptable posture. Enable it when geo-IP data quality is validated.

### L-03 — In-Memory Alert Spike Aggregation Resets on Cold Start
The `AlertingService` uses a module-level `Map`. On serverless, this resets on every cold start. With limited users, the worst case is a missed spike notification — the individual failure alerts still fire. Acceptable at current scale. Move to MongoDB aggregation if the user base grows.

### L-04 — TOTP Secrets Stored in Plaintext
TOTP shared secrets are stored unencrypted. A DB compromise exposes them. However, with limited users and TOTP being optional/secondary, this is a future hardening item. Encrypt with AES-256-GCM keyed from a dedicated secret when TOTP is widely adopted.

### L-05 — Duplicate UA Parsing Logic
`SessionService.parseUserAgent()` and `classifyRequest()` in `device.ts` implement the same logic independently with slightly different edge detection. Extract into a shared utility.

### L-06 — `appVersion` Hardcoded to `'0.1.0'`
Every audit log sets `source.appVersion: '0.1.0'`. Derive from `package.json` or a build-time constant.

### L-07 — Logout Route Clears `cws_device_token`
This forces re-registration on re-login from the same device, triggering a "new device" alert and potentially step-up 2FA. Consider preserving the device token across logout/login cycles so the device stays recognized.

### L-08 — `console.warn`/`console.error` for Security Events
Should route through the alerting sink, not just stdout, for production observability. On Vercel, `console.error` appears in the function logs, which is adequate for now.

### L-09 — JWKS Fetched on Every OAuth Callback
`verifyIdToken` fetches Google's JWKS on every callback with no caching. Cache by `kid`/`max-age`. With limited users, latency impact is minimal.

### L-10 — OAuth State Cookie Contains PKCE Secrets in Plaintext JSON
The `cws_oauth_state` cookie stores `{ state, codeVerifier, nonce }` as plaintext JSON. It's `httpOnly` + `secure`, and the 10-minute TTL limits exposure. Encrypting the payload is a future hardening item.

### L-11 — Cookie `secure` Flag Derived from `NODE_ENV`
`secure` is `process.env.NODE_ENV === 'production'`. On Vercel, this is always correct. An explicit `SECURE_COOKIES` env toggle would be more robust but is not currently needed.

### L-12 — Password Policy and History Enforcement
Schema exists (`password_policies`, `password_history`). Confirm the change flow enforces both. If not wired, wire it as part of the next password-related feature.

---

# Missing Enterprise Features (Context-Adjusted Priority)

| Feature | Purpose | Priority (for this app) | Notes |
|---|---|---|---|
| **Next.js Middleware (`middleware.ts`)** | Route guard + CSP nonce | 🔴 **P0** — must fix | Re-export `proxy.ts` |
| **OAuth callback cookie consistency** | CSRF defense parity | 🔴 **P0** — must fix | Use shared helpers |
| **`withCsrfGuard` on all mutating actions** | Uniform CSRF defense | 🟠 **P1** | 20 min work |
| **2FA rate limiting** | Brute-force defense | 🟠 **P1** | Per-userId attempt cap |
| **Session TTL index** | DB hygiene | 🟡 **P2** | Low urgency at current scale |
| **Login history page** | User visibility | 🟡 **P2** | Nice-to-have for admins |
| **Security dashboard (admin)** | Operational visibility | 🟡 **P2** | Worth building as the app matures |
| **Password breach check (HIBP)** | Reject breached passwords | 🟢 **P3** | Future hardening |
| **Redis-backed rate limiting** | Scalable brute-force defense | 🟢 **P3 / Future** | Not needed at current scale |
| **TOTP secret encryption at rest** | DB breach defense | 🟢 **P3 / Future** | When TOTP is widely adopted |
| **Centralized session cache (Redis)** | Cross-instance invalidation | 🟢 **Future** | Not needed — single serverless region |
| **Atomic lockout (shared store)** | Multi-instance correctness | 🟢 **Future** | MongoDB atomics are sufficient |
| **Anomaly ML / risk scoring** | Advanced detection | 🟢 **Future** | Overkill for <10 users |

---

# Security Recommendations

**1. Wire `proxy.ts` as middleware (P0).** This is the single highest-leverage fix. Without it, the CSP nonce and route guard are dead code.

**2. Fix the OAuth callback cookie SameSite (P0).** Use the shared `strictCookieOpts()` / `sessionCookieOpts()` helpers instead of hardcoding. This is a 15-minute fix that restores the integrity of the C1 CSRF defense.

**3. Complete the `withCsrfGuard` coverage (P1).** Add it to `verifyTotpAction`, all device actions, recovery-code actions, and password-reset actions. The pattern is already established — this is pure consistency work.

**4. Rate-limit 2FA verification (P1).** A 6-digit code has 1M possibilities. Add a per-userId attempt counter (5 attempts, then invalidate the pending session). This is the one gap where an attacker who obtains the pending cookie can escalate.

**5. Keep the fail-closed boot guards.** The `env.ts` guards (SESSION_SECRET, ARGON2_SECRET, TRUSTED_PROXY_IP_HEADER in production) are a model of secure defaults. Do not relax them.

**6. Secrets rotation story.** Document how to rotate `SESSION_SECRET` (dual-read during rollover or mass-invalidate via `accountSecurityVersion`) and `ARGON2_SECRET` (requires password re-hash migration). This is documentation, not code.

**7. Keep rate limiting in MongoDB.** At <10 users on serverless, the `login_attempts` collection with TTL indexes is perfectly adequate. Redis is unnecessary complexity. Revisit if the user base grows to hundreds.

**8. Enable step-up after monitoring.** Once geo-IP data quality is trusted, flip `STEP_UP_ENABLED=true` for the strongest new-device / impossible-travel defense.

---

# Architecture Recommendations

**Maintainability**
- Extract the OAuth callback's cookie-setting into calls to the shared helpers from `cookies.ts` — this eliminates C-02 and prevents future drift.
- Consolidate `parseUserAgent` and `classifyRequest` into a single shared utility in `src/auth/lib/`.
- Centralize cookie-name constants (`SESSION_COOKIE`, `REFRESH_COOKIE`, etc.) — they're defined in multiple files.
- Remove dead code (`void getEnv`, unused status enum values).

**Scalability (future)**
- When/if the user base grows beyond ~50 users or the app moves to multi-region, introduce Redis for rate limiting and session caching.
- The `findOneAndUpdate` atomic patterns (H-4 lockout fix, H-4 refresh rotation) are excellent and will continue to work at scale.

**Performance**
- The `validateSession` DAL call does 2 DB reads (session + user) per request. A short-lived in-memory LRU cache (5-15s) keyed by session ID would cut load. The `ACTIVITY_WRITE_INTERVAL_MS` coalescing is already a good pattern — extend it to reads.
- Cache Google JWKS by `kid`/`max-age` to eliminate per-callback latency.

**Developer Experience**
- The `docs/impl/01–11` pattern (one doc per fix with rationale) is excellent; continue it.
- Add integration tests for the OAuth callback, refresh rotation/reuse, and 2FA flow.

---

# Production Readiness Checklist

**✅ Implemented and Working**
- [x] Argon2id + pepper with fail-closed prod guard
- [x] Opaque rotating refresh tokens + reuse detection + atomic swap
- [x] Server-bound device identity token (HMAC-signed)
- [x] CSRF guard (`withCsrfGuard`) on all major auth actions (login, verify-2fa, resend-2fa, change-password, session revoke, admin revoke)
- [x] CSRF origin check on API routes (refresh, logout)
- [x] HttpOnly cookies on all auth tokens
- [x] Secure flag in production
- [x] SameSite Lax for session / Strict for refresh + pending cookies *(except OAuth callback — C-02)*
- [x] Account lockout after N failed attempts (atomic `incrementFailedAndGet`)
- [x] Per-IP + per-identifier rate limiting on login
- [x] Account lifecycle enforcement (active/suspended/deleted/disabled)
- [x] Session revocation on password change + `accountSecurityVersion` bump
- [x] Concurrent session limit (5)
- [x] Google OAuth: PKCE + state + nonce + JWKS signature + pre-provisioned linking
- [x] Email 2FA with code verification
- [x] TOTP MFA support (otplib)
- [x] WebAuthn/passkey support (simplewebauthn) *(needs rpID fix — M-01)*
- [x] Recovery codes (hashed, single-use)
- [x] Password policy (configurable, DB-driven schema)
- [x] Password expiry with force-change
- [x] Password reset via email token (enumeration-resistant)
- [x] Device tracking + new-device alerts
- [x] Suspicious location detection
- [x] Step-up 2FA (flag-gated, fail-open)
- [x] Security headers (HSTS, X-Frame-Options: DENY, nosniff, Referrer-Policy, Permissions-Policy, COOP)
- [x] CSP nonce generation in `proxy.ts` *(not applied — C-01)*
- [x] Audit logging (structured, per-action)
- [x] Security event alerting (email + sink)
- [x] Fail-closed env guards in production
- [x] `.env` gitignored, `.env.example` documents secret-manager policy
- [x] Soft delete + `deletedAt` filtering

**❌ Must Fix Before Production**
- [ ] Wire `proxy.ts` as `middleware.ts` — **C-01** (15 min)
- [ ] Fix OAuth callback cookie SameSite — **C-02** (15 min)

**⚠️ Should Fix Soon**
- [ ] `verifyTotpAction` CSRF guard + cookie clearing — **H-01** (10 min)
- [ ] Rate limiting on 2FA verification — **H-02** (1 hr)
- [ ] `withCsrfGuard` on remaining mutating actions — **H-03** (20 min)
- [ ] Redact lock expiry from public error — **M-02** (5 min)
- [ ] Bump `accountSecurityVersion` on password reset — **M-03** (10 min)

**📋 Nice-to-Have**
- [ ] Session TTL index — **M-06**
- [ ] WebAuthn rpID from env — **M-01**
- [ ] 2FA resend rate limit — **M-07**
- [ ] JWKS caching
- [ ] Password history enforcement confirmation
- [ ] Audit-log retention policy

---

# Final Verdict

### Would I deploy this to production? — **YES, with two critical fixes.**

For an internal application with limited, admin-controlled users and no public registration, this authentication system is **well above average**. The security primitives are strong (Argon2id + pepper, atomic refresh rotation with reuse detection, server-bound device identity, comprehensive CSRF defense, fail-closed boot guards), and the architecture is clean and maintainable.

The **two critical items** are both simple re-wiring tasks:

1. **C-01 — Wire the middleware** (15 minutes, one line of code).
2. **C-02 — Fix OAuth callback cookies** (15 minutes, replace hardcoded options with shared helpers).

With these two fixes, the system is **production-ready for your use case**.

---

### Top 10 Improvements — Prioritized for This Application

| # | Item | Effort | Priority |
|---|---|---|---|
| 1 | Wire `proxy.ts` as `middleware.ts` | 15 min | 🔴 P0 |
| 2 | Fix OAuth callback cookie `SameSite` (pending + refresh) | 15 min | 🔴 P0 |
| 3 | Add `withCsrfGuard` to `verifyTotpAction` + fix cookie clearing | 10 min | 🟠 P1 |
| 4 | Wrap remaining mutating actions with `withCsrfGuard` | 20 min | 🟠 P1 |
| 5 | Rate-limit 2FA verification (5 attempts per pending session) | 1 hr | 🟠 P1 |
| 6 | Redact lock expiry time from `AccountLockedError` public message | 5 min | 🟡 P2 |
| 7 | Bump `accountSecurityVersion` on password reset | 10 min | 🟡 P2 |
| 8 | Add TTL index on `sessions.expiresAt` | 5 min | 🟡 P2 |
| 9 | Derive WebAuthn `rpID`/`origin` from `APP_URL` | 15 min | 🟡 P2 |
| 10 | Rate-limit 2FA resend (1 per 60s) | 30 min | 🟡 P2 |

**Total effort for P0 + P1: ~2 hours.**
**Total effort for all 10 items: ~3.5 hours.**

Items 1–2 are the only blockers. After those, this system is defensible for a production internal enterprise deployment with limited users.
