# Comprehensive Authentication Security Audit — CWS Next App

Date: 2026-07-18 (comprehensive pass)
Auditor role: Senior Security Engineer / Authentication Architect / Next.js Full-Stack Engineer
Scope: Next.js App Router authentication, authorization, sessions, JWT/cookie design, Google OAuth, MFA (email/TOTP/WebAuthn), password reset, rate limiting, CSRF, audit logging, and MongoDB persistence.
Method: Full source read of `src/auth/**`, `src/app/api/auth/**`, `src/middleware*`, `src/database/schemas/**`, `src/database/indexes/**`, `netlify.toml`, plus the prior audit (`docs/auth-security-audit-report-2026-07-18.md`) and the 22 remediation items in `docs/impl/`.

> This is an **audit only**. No code was rewritten. All recommendations are incremental.

---

# Executive Summary

The authentication system is **substantially more mature than a typical custom implementation**. The prior audit's six findings have been remediated across 22 tracked items, and the code reflects those fixes (atomic token redemption, TOTP throttle + audit, device-binding enforcement, WebAuthn env config, strict route CSRF, serverless-safe JWKS cache, fail-closed secret boot guards, idle/absolute refresh limits, atomic lockout, reuse detection, step-up MFA, device management, recovery codes, admin forced/global logout).

The remaining risk is concentrated in **production-hardening gaps and a few secondary-flow weaknesses**, not in the core architecture. The single biggest structural gap is the **absence of any `middleware.ts`** (so there is no edge-level auth short-circuit, no security headers, and no unauthenticated-route guard) combined with **no security headers anywhere in the deploy config**.

## Scores

| Dimension | Score | Notes |
|---|---|---|
| Overall Security | **88 / 100** | Strong core; residual gaps in headers, TOTP replay, alerting durability. |
| Architecture | **90 / 100** | Clean layered DAL/service/repo split; role-string RBAC is simple but appropriate for fixed-user app. |
| Production Readiness | **78 / 100** | Missing edge middleware, security headers, audit retention, durable cross-instance alerting. |
| **Weighted Overall** | **~86 / 100** | Deployable after the top-10 pre-deploy items. |

## Top Risks

1. **No `middleware.ts` / no security headers** — clickjacking, MIME-sniffing, and missing HSTS/CSP on the authenticated dashboard; no edge auth gate. (High)
2. **TOTP last-timestep replay not prevented** — a valid TOTP code can be reused within its 30s window if the persisted timestep check is missing. (Medium)
3. **In-memory alerting spike aggregation** — `AlertingService.failureBuckets` resets on restart and is not shared across serverless instances, weakening brute-force detection at scale. (Medium)
4. **OAuth token-exchange outage returns a generic error** while JWKS uses `OAuthProviderUnavailableError` — inconsistent failure handling/alerting. (Low/Medium)
5. **Audit log retention/index TTL unconfigured** — unbounded collection growth at thousands of users. (Medium ops)
6. **`evaluateStepUp` comment says "OFF by default" but env defaults to ON** — documentation drift that can mislead operators. (Low)

## Top Strengths

- Argon2id + application pepper (`ARGON2_SECRET`) with fail-closed production guards.
- Opaque HMAC-signed session cookie; refresh tokens are random opaque values with **only the SHA-256 hash stored**.
- **Refresh-token rotation with atomic `replacedBy: null` conditional write** and full-family reuse detection/revocation.
- Google OAuth uses **Authorization Code + PKCE**, validates `state` (CSRF) and `nonce` (replay), verifies the id_token signature against Google JWKS, and **does not auto-link by verified email** (prevents account takeover).
- Cookie design is deliberate: `cws_session` Lax (needed for top-level nav), high-value tokens (`cws_refresh`, pending MFA/pw/step-up, device token) Strict; `Secure` is fail-closed in prod.
- Explicit same-origin CSRF guard layered on top of Next.js Server Action protections, plus a stricter variant for direct route handlers.
- Account lifecycle (`active/inactive/disabled/suspended/deleted`), atomic lockout, password expiry/force-change, device management (trust/block/rename), step-up MFA, recovery codes, and admin forced/global logout are all implemented.
- `$jsonSchema` validators (`additionalProperties: false`, enums, required fields) on every collection, with a typed index map.

---

# Critical Issues

**Severity: Critical**

None identified. The core authentication, session, token, and OAuth flows do not contain any critical vulnerability. This is notable for a custom auth system.

---

# High Priority Issues

## H-1 — No Edge Middleware and No Security Headers

**Affected files:** (absent) `src/middleware.ts`; `netlify.toml`; all authenticated routes rely solely on `src/auth/dal.ts` (`requireAuth` / `requireRole`).

**Explanation:**
There is no Next.js `middleware.ts` in the project. Authorization is enforced inside Server Components, Server Actions, and Route Handlers via `getAuthSession` / `requireAuth` / `requireRole`. There is also no mechanism anywhere (middleware, `next.config.ts` headers, or `netlify.toml` `[[headers]]`) that emits `Content-Security-Policy`, `Strict-Transport-Security`, `X-Frame-Options` / `frame-ancestors`, `X-Content-Type-Options`, or `Referrer-Policy`.

**Risk:**
- The authenticated dashboard (`/dashboard/*`) can be framed by a third party (clickjacking), because no `frame-ancestors 'self'` / `X-Frame-Options: DENY` is set. Combined with the Lax `cws_session` cookie, a framed page can ride top-level navigations.
- Missing `X-Content-Type-Options: nosniff` and CSP increases XSS/MIME-sniff exposure surface.
- No edge gate means every protected page and API handler must individually call `requireAuth`; a single missed guard is an unauthenticated endpoint. Public route handlers (`contact`, `chat`) are entirely unguarded (acceptable for those, but there is no centralized policy).
- An unauthenticated request still executes the full React render + DB lookup before redirect, wasting server resources.

**Recommendation:**
Add a `src/middleware.ts` that (a) short-circuits unauthenticated requests to `/dashboard/*` and protected API routes with a 307/401 before rendering, and (b) attaches security headers to all responses. Keep `requireAuth`/`requireRole` as the authoritative in-handler check (defense in depth) — middleware should be a fast gate, not the only control. Add `[[headers]]` to `netlify.toml` as a backup for static responses.

---

# Medium Priority Issues

## M-1 — TOTP Last-Timestep Replay Not Prevented

**Affected files:** `src/auth/actions/verify-totp.ts`; `src/auth/services/mfa.service.ts`; `src/database/schemas/totp-credentials.schema.ts` (if no `lastUsedTimestep` field).

**Explanation:**
The TOTP login path now has failed-attempt throttling and audit logging (good — addresses the prior audit), but it still does not persist and reject the **last accepted TOTP timestep** per user. The prior audit explicitly recommended storing the last accepted timestep; that piece appears incomplete.

**Risk:**
A valid 6-digit TOTP code can be submitted multiple times within its 30-second validity window by an attacker who has the `cws_2fa_pending` / `cws_stepup_pending` cookie. The per-window failure cap limits *wrong* guesses, but does not stop *correct* code replay.

**Recommendation:**
Persist `lastUsedTimestep` on the TOTP credential and reject any code whose timestep ≤ the stored value (allow a small clock-skew window of ±1). This is a small schema + service change.

## M-2 — In-Memory Alerting Spike Aggregation

**Affected files:** `src/auth/services/alerting.service.ts` (`failureBuckets`, `FAILURE_SPIKE_WINDOW_MS`, `FAILURE_SPIKE_THRESHOLD`).

**Explanation:**
Brute-force spike detection uses a module-level `Map` keyed by identifier. The comment acknowledges this resets on restart and does not dedupe across processes. On serverless/Netlify, every cold start loses state and each instance has its own bucket.

**Risk:**
At thousands of users across many serverless instances, `auth.login.failure_spike` alerts will be missed or under-reported, degrading the security monitoring posture the system otherwise invests in.

**Recommendation:**
Move spike aggregation to MongoDB (a small counter doc with a TTL, incremented atomically per failure and reset on threshold) or to the external security sink/metrics backend. Keep the audit-log stream as the source of truth; the alerting layer should summarize from durable state.

## M-3 — OAuth Token-Exchange Outage Handling Inconsistent

**Affected files:** `src/auth/services/oauth.service.ts` (`exchangeCode` vs `fetchGoogleJwks`).

**Explanation:**
`fetchGoogleJwks` wraps failures in `OAuthProviderUnavailableError` (clear "provider unavailable" semantics), but `exchangeCode` throws a generic `Error` on network/HTTP/JSON failure for the token endpoint, and only maps `>=500` to `OAuthProviderUnavailableError`. A 4xx from Google (e.g., bad `code`) throws generic.

**Risk:**
User-facing handling and audit categorization are inconsistent; a transient Google token-endpoint outage is harder to distinguish from invalid OAuth input, and the alert payload differs. Low direct security impact but harms operational clarity.

**Recommendation:**
Wrap token-exchange fetch/HTTP/parse failures in `OAuthProviderUnavailableError` with the same generic public message used for JWKS outages; reserve specific errors for genuine input problems (e.g., missing `id_token`).

## M-4 — Audit Log Retention / Index TTL Unconfigured

**Affected files:** `src/database/schemas/audit-logs.schema.ts`; `src/database/indexes/audit-logs.indexes.ts`; `src/database/schemas/login-attempts.schema.ts`.

**Explanation:**
`audit_logs` and `login_attempts` are written on every auth event and never pruned. There is no TTL index and no retention policy in code or deploy config.

**Risk:**
At thousands of users, these collections grow without bound, increasing storage cost and slowing range queries (session/device listings, investigations). GDPR "storage limitation" principle is not demonstrably met.

**Recommendation:**
Add a TTL index (e.g., 365–400 days, or per-policy) on `createdAt` for `audit_logs`/`login_attempts`, and a documented retention policy. Consider a separate long-term/immutable store for a compliance subset (e.g., auth successes, admin actions) if legal hold is required.

## M-5 — Step-Up Country-Change Branch Effectively Inert Without Geo Source

**Affected files:** `src/auth/services/session.service.ts` (`evaluateStepUp`, `coarseLocation`); `src/auth/config/env.ts` (`GEOIP_LOOKUP_URL`).

**Explanation:**
`STEP_UP_ENABLED` defaults to ON, but the country-change branch only fires when `newCountry` is non-null, which requires `GEOIP_LOOKUP_URL` (or offline `geoip-lite`). Without it, only **new-device** step-up triggers. The code warns (good) but the feature is partially inert.

**Risk:**
Operators may believe geo-based step-up is active when it is not. Not a vulnerability by itself, but a coverage gap in the intended defense.

**Recommendation:**
Document that country-change step-up requires `GEOIP_LOOKUP_URL`; consider a deploy-time check that warns (already done) and, if geo is desired, wire the lookup. New-device step-up is sufficient for an internal app as a baseline.

---

# Low Priority Improvements

## L-1 — `evaluateStepUp` Comment Drift
`session.service.ts` comment states step-up is "OFF by default" but `env.ts` defaults `STEP_UP_ENABLED` to `true`. Fix the comment to avoid operator confusion.

## L-2 — Public Route Handler Authorization
`/api/contact` and `/api/chat` are unguarded. This is acceptable for their purpose, but there is no centralized route-policy registry. A future sensitive route could be added without a guard. Consider a documented allow/deny map or middleware matcher so new routes default to "deny unless listed."

## L-3 — `rememberMe` Idle-Timeout Interaction
When `rememberMe` is set, both cookies extend to the TTL, but `IDLE_TIMEOUT_MS` still applies, so a remembered session can still expire on inactivity. This is correct security behavior but should be documented in the UX copy so users are not surprised.

## L-4 — Admin Disable/Delete Semantics Not Exposed
The `users` schema supports `status: disabled`/`deleted` and `deletedAt`, and `login.service.ts` enforces them, but `admin.ts` only revokes sessions — there is no admin action to disable/delete accounts. Add admin actions (and audit) for disable/soft-delete to exercise the lifecycle fully.

## L-5 — `getDeviceId()` vs `ensureDeviceId()` Naming
Minor: `getDeviceId()` returns null when no valid token is present (read-only), while `ensureDeviceId()` mints one. The semantics are correct but the names are close; a brief doc comment on each public export would reduce misuse.

## L-6 — Refresh Route Double DB Lookup
`rotateRefreshToken` calls `sessionRepo.findById` twice (once for expiry, once after reuse check). Minor performance; could be consolidated into one fetch + in-memory reuse of the document.

---

# Missing Enterprise Features

| Feature | Purpose | Importance | Complexity | Priority |
|---|---|---|---|---|
| Security headers (CSP/HSTS/frame-ancestors) | Prevent clickjacking, MIME sniff, downgrade | High | Low | **P0** |
| Edge middleware auth gate | Centralized unauthenticated short-circuit | High | Low | **P0** |
| Durable cross-instance alerting | Reliable brute-force/spike detection at scale | High | Medium | **P1** |
| Audit-log retention/TTL | Storage limit + GDPR | High | Low | **P1** |
| Admin disable / soft-delete account | Full lifecycle management | Medium | Low | **P1** |
| Session management page (already partially present via `/dashboard/sessions`) | Self-service session review | Medium | Low | Done/extend |
| Login history / recent devices (devices collection exists) | User visibility | Medium | Low | P2 |
| Failed-login history view | User awareness | Medium | Low | P2 |
| IP / location tracking (sessions store ip/location) | Investigations | Medium | Low | Done/extend |
| New-device detection (alertNewDevice exists) | Alerting | Medium | Low | Done |
| Suspicious-login detection (alertSuspiciousLocation exists) | Alerting | Medium | Low | Done (needs geo) |
| Email alerts on security events (alerting.service exists) | User notification | Medium | Low | Done |
| Account lockout (atomic, present) | Brute-force | High | Low | Done |
| MFA readiness (email/TOTP/WebAuthn present) | 2nd factor | High | Low | Done |
| Backup/recovery codes (present) | MFA recovery | High | Low | Done |
| Admin forced logout (present) | Compromise response | High | Low | Done |
| Admin session revocation (present) | Compromise response | High | Low | Done |
| Global logout (present) | Breach response | High | Low | Done |
| Refresh-token rotation (present, atomic) | Theft resistance | High | Low | Done |
| Token revocation (present) | Theft response | High | Low | Done |
| Remember Me (present) | UX | Low | Low | Done |
| Password expiration (present) | Hygiene | Medium | Low | Done |
| Password history (collection present) | Reuse prevention | Medium | Medium | P2 (wire enforcement) |
| Account disable (schema present) | Lifecycle | Medium | Low | P1 |
| Soft delete (schema present) | Lifecycle/GDPR | Medium | Low | P1 |
| Security dashboard (audit logs exist) | Ops visibility | Medium | Medium | P2 |
| TOTP timestep replay prevention | 2FA integrity | Medium | Low | **P1** |
| Trusted-devices UI (present) | Reduce step-up friction | Low | Low | Done |
| Device management (present) | Theft response | Medium | Low | Done |
| MFA enrollment self-service | User onboarding | Medium | Medium | P2 |
| WebAuthn/passkey login (present, needs real RP config) | Phishing-resistant 2FA | High | Low | P1 (config) |

---

# Security Recommendations

**Why, not just what:**

1. **Add security headers (CSP, HSTS, frame-ancestors, nosniff, Referrer-Policy).**
   *Why:* The dashboard holds session-bound, admin-capable content. Without `frame-ancestors 'self'`, an attacker page can iframe the app and use the Lax session cookie on top-level navigations to drive actions (clickjacking). CSP reduces XSS blast radius; HSTS prevents SSL-strip on the first visit. These are cheap, high-leverage controls.

2. **Add a Next.js `middleware.ts` auth gate.**
   *Why:* Centralizing the unauthenticated check at the edge prevents a missed `requireAuth` from becoming an open endpoint, short-circuits expensive renders, and is the natural place to attach headers. Keep handler-level `requireRole` as the authoritative control.

3. **Store and reject the last accepted TOTP timestep.**
   *Why:* TOTP codes are valid for ~30s. Without timestep replay prevention, a captured pending-MFA cookie lets an attacker reuse the *correct* code repeatedly within the window. The failure cap only limits wrong guesses.

4. **Make alerting spike aggregation durable (MongoDB or metrics backend).**
   *Why:* Security monitoring that loses state on every cold start and per-instance is not monitoring at scale. For an app that "will eventually serve thousands of users," brute-force detection must survive instance churn.

5. **Set audit-log/login-attempt retention (TTL index).**
   *Why:* Unbounded growth hurts performance and violates storage-limitation expectations. A TTL index is a one-line, non-breaking change.

6. **Keep the no-email-auto-linking OAuth policy.**
   *Why:* For a fixed-internal-user app, linking by verified email would let anyone controlling a Google identity asserting a matching email authenticate as a provisioned user, bypassing password/MFA — a direct account-takeover vector. The current explicit pre-provisioned linking is correct; do not relax it.

7. **Keep fail-closed secret boot guards; document proxy IP stripping.**
   *Why:* The `TRUSTED_PROXY_IP_HEADER` guard correctly refuses to boot if IP resolution is untrustworthy (avoids a global rate-limit DoS). But it only works if the edge strips inbound `x-forwarded-for` before appending its own hop. Document this as a deploy prerequisite.

8. **Continue opaque sessions + rotated refresh tokens; do not move to stateless JWTs.**
   *Why:* The current design (server-side session doc + hash-only refresh storage + atomic rotation + reuse revocation) gives you instant revocation, idle/absolute limits, device binding, and theft detection — none of which a stateless JWT provides without major trade-offs. This is an architecture strength; preserve it.

9. **Add password-history enforcement.**
   *Why:* The `password-history` collection exists but is not enforced on change. Preventing reuse of the last N passwords is a basic hygiene/compromise-reduction control.

10. **Document the `rememberMe` + idle-timeout interaction in UX.**
    *Why:* Security-correct behavior (idle expiry even when "remembered") can surprise users; clear copy prevents support load and "logout bug" reports.

---

# Architecture Recommendations

**Maintainability**
- The DAL/service/repository layering is clean and testable. Keep it.
- Resolve the `evaluateStepUp` comment drift (L-1) and add short doc comments to `getDeviceId`/`ensureDeviceId` (L-5) to prevent misuse.
- Consider a single `ROUTES` policy map (public vs protected) referenced by both middleware and handlers, so new routes default to "deny."

**Scalability**
- Alerting spike state must move off module memory (M-2).
- Audit/login-attempt collections need TTL + possibly a read replica or separate analytics store for dashboards.
- The `login_attempts` collection is used for many distinct counters (login, 2FA, TOTP, OAuth, pwreset). Ensure each query path has a supporting compound index (identifier + createdAt, ip + createdAt, userId + createdAt) — verify against `login-attempts.indexes.ts`.

**Security**
- Middleware + security headers (H-1) are the highest-leverage additions.
- Keep `requireRole` as the authoritative check; treat middleware as a gate.
- Preserve the opaque-session + rotated-refresh architecture.

**Performance**
- Consolidate the duplicate `sessionRepo.findById` in `rotateRefreshToken` (L-6).
- `validateSession` does session lookup + user lookup + (background) activity write. The user lookup on every request is necessary for lifecycle/version checks; ensure `users._id` and `sessions.userId` are indexed (they are, via schema/index map).
- JWKS cache is per-instance and non-authoritative (correct for serverless) — no shared Redis needed.

**Developer Experience**
- The 22 `docs/impl/*` items are excellent traceability. Continue the pattern: each finding → impl doc → test.
- Add a `middleware.ts` with clear matcher comments so future devs know where auth gating lives.

---

# Production Readiness Checklist

- [ ] **Security headers** (CSP, HSTS, X-Frame-Options / frame-ancestors, X-Content-Type-Options, Referrer-Policy)
- [ ] **Edge `middleware.ts`** auth gate for `/dashboard/*` + protected API routes
- [ ] **TOTP last-timestep replay prevention**
- [ ] **Durable cross-instance alerting** spike aggregation
- [ ] **Audit-log / login-attempt TTL + retention policy**
- [x] Refresh-token rotation (atomic)
- [x] Refresh-token reuse detection + family revocation
- [x] CSRF guard (Server Actions + strict route handler variant)
- [x] Secure/HttpOnly/SameSite cookie design
- [x] Fail-closed secret boot guards (SESSION_SECRET, ARGON2_SECRET, SECURE_COOKIES, TRUSTED_PROXY_IP_HEADER)
- [x] Argon2id + pepper
- [x] Google OAuth Auth Code + PKCE + state + nonce + JWKS verify
- [x] No OAuth email auto-linking (account-takeover prevention)
- [x] Atomic account lockout
- [x] Idle + absolute refresh/session limits
- [x] Device management (trust/block/rename) + server-device-token binding
- [x] Step-up MFA (new-device; country-change needs GEOIP_LOOKUP_URL)
- [x] Recovery codes
- [x] Admin forced logout + global logout
- [ ] **Proxy IP stripping documented + enforced** at the edge (prereq for TRUSTED_PROXY_IP_HEADER)
- [ ] **Password-history enforcement** wired
- [ ] **Admin disable / soft-delete account actions** (schema already supports)
- [ ] **WebAuthn real RP ID / origin** confirmed for production domain
- [ ] Centralized error/audit logging + monitoring dashboard / alert sink wired to a real backend (e.g., SIEM/webhook)

---

# Final Verdict

**Would you deploy this authentication system to production?**

**NO — not unconditionally. Conditional GO after the top-10 pre-deploy items below.**

This is one of the stronger custom authentication implementations reviewed: the cryptographic foundations, token model, OAuth flow, CSRF/cookie design, and account-lifecycle handling are all production-grade and correctly fail-closed. There is **no critical vulnerability**. However, the system is not yet fully enterprise-production-ready because of missing edge-level controls (middleware + security headers), a TOTP replay gap, non-durable alerting at scale, and unbounded audit storage. These are incremental, low-to-medium effort fixes — not a rewrite.

## Top 10 improvements before deployment

1. **Add security headers** (CSP, HSTS, `frame-ancestors 'self'`, `X-Content-Type-Options: nosniff`, `Referrer-Policy`) via middleware and/or `netlify.toml`.
2. **Add `src/middleware.ts`** as an edge auth gate for `/dashboard/*` and protected API routes (keep `requireAuth`/`requireRole` as authoritative in-handler checks).
3. **Prevent TOTP timestep replay** — persist and reject `lastUsedTimestep` per credential.
4. **Make alerting spike aggregation durable** (MongoDB counter or metrics backend) so brute-force detection survives serverless churn.
5. **Configure audit-log / login-attempt retention** (TTL index + documented policy) for performance and GDPR storage limitation.
6. **Document + enforce edge proxy IP stripping** as a hard deploy prerequisite for `TRUSTED_PROXY_IP_HEADER` (otherwise the fail-closed guard's protection is moot).
7. **Wire password-history enforcement** on password change (collection already exists).
8. **Add admin disable / soft-delete account actions** (schema already supports `disabled`/`deleted`/`deletedAt`).
9. **Confirm WebAuthn `WEBAUTHN_RP_ID` / `WEBAUTHN_ORIGIN`** for the real production domain (env config exists; verify values).
10. **Wire the security alert sink to a real backend** (SIEM/webhook) and add a minimal security/ops dashboard over the existing audit logs.

Once items 1–6 are complete, this system is safe to deploy for an internal, fixed-user enterprise application.
