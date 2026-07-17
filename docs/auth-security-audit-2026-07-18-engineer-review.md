# Authentication Security Audit — CWS Next App

**Auditor role:** Senior Application Security Engineer / Next.js Authentication Architect
**Date:** 2026-07-18
**Commit:** 4ed22261b70938b9785ef7efadd522f6da5bd39e
**Scope:** Custom authentication system under `src/auth/**`, `src/proxy.ts`, `src/app/api/auth/**`, `src/app/(admin)/dashboard/**`, DB schema.

> Verified findings are drawn directly from the source provided. Where I could not
> verify a file, it is explicitly marked **UNVERIFIED**.

---

## Files reviewed vs. still needed

### Reviewed (verified)
- `package.json`
- `next.config.ts`
- `src/proxy.ts` (Next.js 16 "middleware", renamed `proxy`)
- `src/auth/config/env.ts`
- `src/auth/crypto/password.ts`, `crypto/token.ts`, `crypto/constants.ts`
- `src/auth/dal.ts`
- `src/auth/actions/login.ts`, `actions/verify-2fa.ts`, `actions/admin.ts`
- `src/auth/services/login.service.ts`, `session.service.ts`, `oauth.service.ts`, `two-factor.service.ts`, `rate-limit.service.ts`
- `src/auth/repositories/user.repository.ts`, `refresh-token.repository.ts`
- `src/auth/lib/cookies.ts`, `lib/csrf.ts`, `lib/request.ts`
- `src/auth/validation/login.schema.ts`
- `src/app/api/auth/google/route.ts`, `google/callback/route.ts`, `logout/route.ts`
- `src/app/(admin)/dashboard/page.tsx`, `dashboard/admin/users/page.tsx`
- `docs/mongodb_auth_schema.md`
- `.gitignore`

### Not yet verified (recommend providing / I did not open)
- `src/auth/crypto/token-edge.ts` — **UNVERIFIED** (edge session-signature verify used by proxy?)
- `src/auth/lib/device.ts`, `services/device.service.ts` — device-token HMAC issuance (**UNVERIFIED** — I trust their contracts as described in callers only)
- `src/auth/repositories/session.repository.ts`, `login-attempt.repository.ts`, `oauth-account.repository.ts`, `verification-token.repository.ts` (contracts inferred from callers; the `.value` bug pattern below may also exist here)
- `src/auth/actions/change-password.ts`, `password-reset.ts`, `recovery-codes.ts`, `verify-totp.ts`
- `src/auth/services/password.service.ts`, `mfa.service.ts`, `alerting.service.ts`, `mailer.ts`, `geoip.ts`
- `src/database/schemas/**`, `src/database/collections.ts` (whether `$jsonSchema` from the doc is actually applied)
- `.env` / `.env.example` (actual variable values — not requested, correctly gitignored)
- `netlify.toml` (edge headers / HSTS) — **UNVERIFIED**
- WebAuthn route handlers under `api/auth/webauthn/**` — **UNVERIFIED**
- Deployment env separation on Vercel/Netlify console — cannot verify from repo

---

## A. Executive summary

**Overall security level: High (well above typical custom-auth implementations).**
This is a mature, defense-in-depth custom authentication system built directly on
the MongoDB Node driver, Argon2id, and hand-rolled OIDC verification. It already
implements many controls that most custom stacks miss: Argon2id with an optional
application pepper, HMAC-signed opaque session IDs (no sensitive data in the
cookie), server-side session validation on every request, rotating refresh tokens
with reuse detection, atomic lockout, per-IP + per-identifier rate limiting backed
by MongoDB (serverless-safe, no Redis), CSRF origin guards on every state-changing
action, a nonce-based CSP, fail-closed boot guards for all secrets, and — most
importantly for this app's constraints — **no auto-provisioning of OAuth identities**
(Google login only succeeds against a pre-provisioned `oauth_accounts` row).

**Suitable for production?** Yes, *conditionally*. The architecture is sound and
appropriate for a fixed-user, serverless, no-Redis deployment. However there is
**one Critical functional/security defect** (MongoDB driver v6 `findOneAndUpdate`
return-value misuse) that must be fixed before release, plus a small number of
High/Medium hardening items. None of the findings require re-architecting.

**Most serious risks (ranked):**
1. **C-1 — `findOneAndUpdate().value` misuse (Critical).** Under the installed
   `mongodb@^6.16.0`, `findOneAndUpdate` returns the document directly, not
   `{ value }`. `refresh-token.repository.atomicReplace()` and
   `user.repository.incrementFailedAndGet()` read `.value`, which is always
   `undefined` → always `null`. For refresh rotation this means **every legitimate
   token rotation is misclassified as token reuse/theft**, forcibly revoking the
   whole session family. This breaks "stay logged in" and can be weaponized as a
   self-inflicted session-revocation DoS. It also silently defeats the H-4
   atomic-rotation protection.
2. **H-1 — Proxy (middleware) trusts an unauthenticated cookie signature only.**
   `src/proxy.ts` gates `/dashboard` on `verifySessionSignature` alone (no
   revocation/expiry/DB check). This is *by design* (real check is in the DAL), but
   any page that renders sensitive content must call `requireAuth`/`requireRole` in
   its Server Component. Any page that forgets is exposed. Enforce a lint/review rule.
3. **H-2 — No allowlist normalization guarantee for Unicode/plus-address emails.**
   Login normalizes with `.trim().toLowerCase()`. Gmail dot/plus aliases and
   Unicode confusables are NOT normalized, so allowlist bypass or duplicate identity
   is possible depending on how admins seed emails.
4. **M-tier — pending-cookie & OAuth-state cookies use `SameSite=Lax`** in the
   OAuth callback route (acceptable but weaker than the Strict used elsewhere), and
   **OAuth state cookie is not bound to the initiating user/session** (login-CSRF
   surface is small but present).

**Recommended target architecture:** *Keep the current custom implementation* — it
already exceeds what a quick Auth.js migration would give for this specific
fixed-user use case, and it correctly enforces the "no public registration" and
"explicit OAuth linking only" invariants that are hard to guarantee with a generic
adapter. Fix C-1, close the High items, and add the operational checklist in §I.
(If the team's appetite for maintaining hand-rolled OIDC verification is low, the
fallback is Auth.js v5 with a database adapter + a `signIn` allowlist callback — see
§E for the full tradeoff comparison.)

---

## B. Current architecture (observed)

**Stack (verified from `package.json`):**
- Next.js **16.2.7**, React **19.2.4** — **App Router** (`src/app/**`, Server
  Components + Server Actions + Route Handlers).
- Auth library: **custom** (no NextAuth/Auth.js/Clerk/Supabase). Crypto via Node
  `crypto`, `argon2@^0.44.0`, `otplib`, `@simplewebauthn/*`.
- Data: **MongoDB `^6.16.0`** (official driver, no ODM).
- Middleware is `src/proxy.ts` (Next.js 16 renamed `middleware` → `proxy`;
  `export const config.matcher = ['/dashboard/:path*']`).

**Session model:** *Server-side (database-backed) sessions* with an **opaque,
HMAC-SHA256-signed session id** stored in the `cws_session` cookie
(`<sessionId>.<b64url_sig>`). No JWT is used for the app session; no user data lives
in the cookie. A **rotating opaque refresh token** (`cws_refresh`, only its SHA-256
hash persisted) supports silent re-auth with reuse detection. This is the correct
choice for revocation and for serverless.

**Identity model (from `docs/mongodb_auth_schema.md` + repos):**
- `users` — thin identity; `role` (`admin|member|viewer`) is the single RBAC source
  of truth; `status` lifecycle (`active|inactive|disabled|suspended|deleted`);
  `security.{failedLoginAttempts,lockedUntil,mfaEnabled,forcePasswordChange,accountSecurityVersion}`.
- `user_emails` — normalized, unique (`uidx_email`), `enabled` flag = the fixed-user
  **allowlist** for password login (`findByEmail` requires `enabled:true`).
- `oauth_accounts` — `(provider, providerAccountId=sub)` unique; Google login only
  succeeds if a row already exists (explicit pre-provisioning; **no auto-link**).
- `sessions`, `refresh_tokens`, `devices`, `verification_tokens`, `audit_logs`,
  `login_attempts`.

**Authentication flows (traced):**
1. **Password login** — `loginAction` (CSRF-guarded) → `LoginService.loginWithPassword`:
   Zod validate → rate-limit (IP + identifier + active lockout) → `findByEmail`
   (allowlist) → status checks → lockout check → Argon2 verify (dummy-hash + random
   delay on unknown user for timing) → atomic lockout on failure → MFA / force-change
   / step-up branch → `SessionService.createSession` → set Lax session + Strict
   refresh cookies.
2. **Google login** — `GET /api/auth/google` builds Auth Code + PKCE (S256) URL with
   `state` + `nonce`, stores them in a Lax httpOnly `cws_oauth_state` cookie →
   Google → `GET /api/auth/google/callback`: per-IP rate limit, `state` match, code
   exchange, **id_token signature verified against Google JWKS**, `iss/aud/exp/nonce/sub`
   validated, `email_verified` captured → look up `oauth_accounts` by `sub`
   (**reject if not pre-provisioned**) → status check → same MFA/force/step-up gates
   → session.
3. **Session creation** — device binding (server-issued HMAC device token), concurrent
   session cap (5), geo/step-up evaluation, `accountSecurityVersion` snapshot, refresh
   token minted.
4. **Session validation** — `dal.getAuthSession` → `SessionService.validateSession`:
   verify signature → load session → reject if revoked → **re-check `user.status==='active'`
   every request** → **reject on `accountSecurityVersion` mismatch** → absolute + idle
   expiry → background `lastActivityAt` coalesced write.
5. **Route protection** — `proxy.ts` optimistic signature-only gate on `/dashboard`;
   **authoritative** gate in Server Components via `requireAuth`/`requireActiveSession`/`requireRole`.
6. **API authorization** — route handlers call the same DAL/service checks; admin
   actions call `requireRole('admin')`.
7. **Logout** — `POST /api/auth/logout` (strict origin guard) revokes refresh family +
   session, clears cookies.
8. **Expired/revoked sessions** — enforced in `validateSession` and at refresh time
   (absolute/idle caps anchored at `lastFullAuthAt`).
9. **Unauthorized Google accounts** — rejected (no `oauth_accounts` row → no login,
   no row created).
10. **Disabled/removed users** — `status !== 'active'` blocks login AND invalidates
    live sessions on next request; `accountSecurityVersion` bump provides global revoke.

**Trust decisions are made server-side** in the DAL, services, and repositories.
The client is never trusted for role, identity, or session validity. The one
optimistic client-cookie trust point (`proxy.ts`) is explicitly non-authoritative.

---
<!-- SECTION:B -->
<!-- SECTION:C -->
<!-- SECTION:D -->
<!-- SECTION:E -->
<!-- SECTION:F -->
<!-- SECTION:G -->
<!-- SECTION:H -->
<!-- SECTION:I -->
<!-- SECTION:J -->
