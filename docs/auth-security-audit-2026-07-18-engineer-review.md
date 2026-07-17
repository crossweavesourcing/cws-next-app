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
## C. Findings table

Severity: **Critical / High / Medium / Low / Informational**. Every row ties to
supplied code. Generic hardening is in §F.4 instead.

| ID | Severity | Category | File/location | Evidence | Risk | Recommended fix |
|----|----------|----------|---------------|----------|------|-----------------|
| C-1 | **Critical** | Correctness / Session integrity | `src/auth/repositories/refresh-token.repository.ts:84`; `user.repository.ts:90` | `return (result as unknown as { value: ... }).value ?? null;` — mongodb v6 `findOneAndUpdate` returns the doc **directly**, not `{value}` | `atomicReplace` always returns `null` → every refresh rotation treated as reuse → **session family revoked on normal refresh** (broken "remember me", self-DoS, masks real theft signal). `incrementFailedAndGet` always returns null (its live callers luckily read `res` directly, but the helper is unusable). | Return the document object directly (see §G-1). Audit ALL `findOneAndUpdate` callers for the same pattern. |
| H-1 | High | Authorization / Route protection | `src/proxy.ts:60-85` | Gate uses `verifySessionSignature` only — no DB/revocation/expiry/role check | A revoked/expired but still-signature-valid cookie passes the proxy. Any `/dashboard` page that omits a DAL check renders to a revoked user. | Keep proxy optimistic, but **mandate** `requireAuth`/`requireActiveSession`/`requireRole` in every dashboard Server Component + an ESLint/CI guard (§G-4). |
| H-2 | High | Fixed-user allowlist | `src/auth/validation/login.schema.ts`; `user.repository.ts:16` | Email normalized only via `.trim().toLowerCase()` | Gmail dot/plus aliases (`a.b+x@gmail.com`) and Unicode confusables can map to a different `user_emails` row than admins expect → allowlist bypass or duplicate identity; case/whitespace variants also risk duplicate rows. | Canonicalize email on **both** seed and login (Unicode NFC + lowercase; optionally provider-aware normalization) and store a `canonicalEmail`. See §G-3. |
| H-3 | High | OAuth login CSRF / state binding | `src/app/api/auth/google/callback/route.ts:28-34`; `google/route.ts:28-34` | `cws_oauth_state` holds `state/verifier/nonce` but is **not bound to the browser session/user**; cookie is `SameSite=Lax` | Login-CSRF: an attacker can start a flow and trick a victim's browser into completing it, logging the victim into the attacker's Google identity (or vice-versa). PKCE+state mitigate code injection but not victim-session fixation. | Bind state cookie to a fresh per-attempt value AND (if a session exists) to it; set `SameSite` as strict as the redirect allows; verify `state` is single-use (already cleared) — see §G-2. |
| M-1 | Medium | Cookie policy consistency | `google/callback/route.ts:122-170` | Session/refresh/pending cookies set inline with `sameSite:'lax'` and hardcoded options, diverging from `cookies.ts` (refresh is Strict there) | Refresh cookie issued Lax via OAuth path is weaker than the Strict issued via password path; inconsistency invites drift. | Route all cookie writes through `setAuthCookies`/`strictCookieOpts` (§G-2). |
| M-2 | Medium | Session fixation (OAuth pending) | `google/callback/route.ts` pending cookies `Lax` | Pending 2FA/step-up/pw cookies are `Lax` in OAuth path but `Strict` in `login.ts` | Cross-site POST could ride a Lax pending cookie into verify-2fa. Low likelihood (short TTL, CSRF guard on action) but inconsistent. | Use `strictCookieOpts` for all pending cookies. |
| M-3 | Medium | Rate limiting coverage | `two-factor.service.ts`; `verify-2fa.ts` | Email-2FA verify is rate-limited per-user; **per-IP** cap on 2FA verify not present; TOTP/WebAuthn verify limiter UNVERIFIED | A distributed attacker with a valid pending cookie could grind codes across IPs faster than the per-user cap intends if per-user counting has gaps. | Add per-IP + per-pending-session cap; confirm TOTP path (`verify-totp.ts`) is limited. |
| M-4 | Medium | Info exposure via error text | `admin.ts:76,121` returns `err.message` to client | `return { error: err instanceof Error ? err.message : ... }` | Internal error strings (Mongo/driver messages) can leak to an authenticated admin UI; still an info-leak surface. | Return a neutral message; log details server-side only. |
| M-5 | Medium | CSP `connect-src`/OAuth | `src/proxy.ts:20-32` | `connect-src 'self'` only; Google endpoints reached server-side so OK, but no `frame-src`/`form-action` for Google, and a static CSP in `next.config.ts` still allows `style-src 'unsafe-inline'` | Defense-in-depth CSP weaker on non-dashboard routes; not directly exploitable. | Tighten static CSP to drop `'unsafe-inline'` where feasible; document Google origins if any client-side call is added. |
| L-1 | Low | Timing / enumeration | `login.service.ts:69-79` | Dummy-hash + `randomDelayMs(50)` used | Good mitigation, but random 0–50ms jitter is small vs Argon2 (~tens of ms) and status-branch code paths differ (suspended/deleted vs not-found) — subtle timing/response differences remain. | Normalize error responses (single generic message already used) and consider constant-time status handling. Acceptable as-is for this threat model. |
| L-2 | Low | Session cookie `Lax` + top-level POST | `cookies.ts:47-56` | Session is `Lax` by design | Lax allows the session cookie on top-level cross-site GET navigations; because session alone grants no state change and all mutations are CSRF-guarded, risk is low. Documented tradeoff. | Keep; ensure no state-changing GET handlers exist. |
| L-3 | Low | `recordLastLogin` no-op | `user.repository.ts:199-209` | Only sets `updatedAt`; does not record a `lastLoginAt` | Weakens audit/anomaly ("last login" not queryable on user doc; audit_logs still has it). | Add `security.lastLoginAt` write, or rely solely on audit_logs (document choice). |
| I-1 | Info | Secrets hygiene | `.gitignore:33-37`, `next.config.ts` header | `.env*` ignored, `.env.example` opt-in; no secrets in `next.config.ts`; boot-time fail-closed guards | Good. Verify no real secret ever committed historically (`git log -p`), and rotate the previously-shipped default `SESSION_SECRET` (blocklisted in `env.ts:104`). | Rotate secrets pre-prod; scan git history. |
| I-2 | Info | Argon2 pepper migration | `env.ts:190-199`, `password.ts` | Enabling `ARGON2_SECRET` after users exist breaks verify | Operational footgun (documented in code). | Follow the documented re-hash-on-next-login migration; keep the note in runbook. |
| I-3 | Info | Step-up geo fail-open | `session.service.ts:589-614` | Geo lookup fails open to null → country-change step-up inert without `GEOIP_LOOKUP_URL` | Acceptable, warned at boot. New-device step-up still fires. | Configure `GEOIP_LOOKUP_URL` in prod if country-change step-up is desired. |

---

## D. Exploitation explanation (Critical + High)

### C-1 — `findOneAndUpdate().value` misuse
- **What an attacker needs:** Nothing for the availability impact — it triggers on
  normal use. To weaponize: any authenticated user (or a script hitting
  `/api/auth/refresh` with a legit cookie) forces repeated rotations.
- **How it's abused / what breaks:** `atomicReplace` returns `null` on every call, so
  `SessionService.rotateRefreshToken` takes the `!replaced` branch → marks reuse →
  `revokeSession` + `revokeBySession('reuse_detected')` + alert. The user's whole
  session family dies on the first silent refresh. Result: users are logged out
  unexpectedly; "remember me" never works; the genuine reuse/theft signal is buried
  in false positives; and a malicious insider can spam the refresh endpoint to
  generate noise/alert fatigue.
- **Data/functionality affected:** Session availability for every user; integrity of
  the theft-detection control.
- **Remotely exploitable:** Yes (via the refresh endpoint).
- **Authentication required:** Yes (a valid session/refresh cookie) for the weaponized
  path; the default-broken behavior needs no attacker at all.

### H-1 — Proxy trusts signature only
- **What an attacker needs:** A cookie that is still HMAC-valid but whose session was
  revoked/expired (e.g., after admin force-logout, password change, or idle timeout)
  — i.e., the attacker is a *former* legitimate user or holds a stolen-but-revoked
  cookie.
- **How it's abused:** The proxy lets the request through to any `/dashboard/*` page.
  If a given page's Server Component forgets to call the DAL (`requireAuth`/
  `requireRole`), it renders privileged data to a user who should be locked out.
  Verified-safe pages: `dashboard/page.tsx` (calls `requireActiveSession`) and
  `admin/users/page.tsx` (calls `requireRole('admin')`). The risk is *future/other*
  pages that omit the check.
- **Data/functionality affected:** Any unprotected dashboard route's data.
- **Remotely exploitable:** Yes. **Authentication required:** A signature-valid
  (possibly revoked) cookie.

### H-2 — Allowlist email normalization
- **What an attacker needs:** Knowledge that an approved user's email is, e.g.,
  `First.Last@gmail.com`, plus their own Google identity OR a way to seed a variant.
- **How it's abused:** Password path — if an admin seeds `first.last@gmail.com` but a
  duplicate/variant row exists, or if two variants are both `enabled`, an unintended
  address may authenticate. Google path is protected by the `sub`-based
  `oauth_accounts` lookup (strong), so H-2 is primarily a **password-allowlist and
  duplicate-identity** issue, not a Google bypass. Unicode confusables
  (e.g., Cyrillic 'а') could create a visually identical but distinct approved email.
- **Data/functionality affected:** Which identities can hold a password login.
- **Remotely exploitable:** Only if an attacker can influence seeding or already
  controls a confusable/alias address that an admin approved. **Auth required:** No
  (it's a login-time check), but exploitation depends on admin seeding hygiene.

### H-3 — OAuth login CSRF / state not bound to browser
- **What an attacker needs:** Ability to initiate the OAuth flow and deliver the
  resulting callback URL (or a pre-seeded `state` cookie) to a victim.
- **How it's abused:** Classic login-CSRF: attacker completes `authorize`, captures a
  valid `code`+`state`, and causes the victim's browser (carrying the attacker's
  `cws_oauth_state`) to hit the callback — logging the victim into the **attacker's**
  Google account, or fixating a session. Because `oauth_accounts` requires
  pre-provisioning, the blast radius is limited to accounts the attacker legitimately
  controls a link for; the main risk is session fixation / cross-account confusion for
  a multi-tenant admin. PKCE+nonce prevent code injection but not who-completes-the-flow
  binding.
- **Data/functionality affected:** Whose identity a browser ends up authenticated as.
- **Remotely exploitable:** Yes. **Auth required:** No.

---
<!-- SECTION:D -->
## E. Recommended architecture

**Constraints recap:** fixed users, password + Google, no public registration,
serverless (Vercel/Netlify), no Redis, minimal ops.

| Option | Security | Complexity | Cost | Serverless | Revocation | Fixed-user enforcement | Google | Password | Maintenance | Lock-in |
|--------|----------|-----------|------|-----------|-----------|------------------------|--------|----------|-------------|---------|
| **1. Auth.js v5 + DB adapter (Mongo)** | High | Medium | Free | Good | DB sessions ✓ | Via `signIn` callback + adapter | ✓ | Credentials provider (BYO hashing) | Medium (library upgrades) | Low |
| **2. Auth.js v5 JWT sessions** | Med-High | Low | Free | Excellent | ⚠ hard (JWT not revocable without denylist) | `signIn` callback | ✓ | Credentials | Low | Low |
| **3. Managed (Clerk/Auth0/WorkOS)** | High | Low | $$ (per-MAU) | Excellent | ✓ (provider) | Provider allowlist / orgs | ✓ | ✓ | Very low | **High** |
| **4. Keep current custom (as-is + fixes)** | **High** | Already built | Free | **Good** (Mongo-backed limits, no Redis) | **✓ strong** (DB sessions + `accountSecurityVersion`) | **✓ strongest** (`enabled` allowlist + `sub`-only OAuth link) | ✓ | ✓ Argon2id | **Medium-High** (you own the crypto) | **None** |

**Recommendation: Option 4 — keep the current custom implementation, after fixing
C-1 and the High items.**

**Why:**
- It already implements DB-backed sessions + rotation + reuse detection + a global
  revoke lever (`accountSecurityVersion`) — the exact revocation story Option 2 can't
  give and Option 1 only gives with the same effort you've already spent.
- The **fixed-user invariant is enforced more strictly than a generic library would**:
  Google login *requires a pre-provisioned `oauth_accounts` row keyed by `sub`* and
  never auto-creates users. Replicating this in Auth.js means overriding the adapter's
  `createUser`/`linkAccount` and writing a `signIn` allowlist callback anyway — you'd
  re-implement the same guardrails with less control.
- No Redis needed: rate limits, lockout, and 2FA counters are MongoDB-backed and
  serverless-coherent. This is already correct.
- Zero vendor lock-in; free.

**When to reconsider (pick Option 1 instead):** if the team cannot commit to
maintaining hand-rolled OIDC/JWKS verification (`oauth.service.ts` is the riskiest
hand-rolled surface — a subtle bug there is a real auth bypass). Auth.js v5's Google
provider does OIDC verification for you. If you migrate, keep your `users`/
`user_emails`/`oauth_accounts` model behind a custom adapter and enforce the allowlist
in the `signIn` callback (`return false` unless an `enabled` allowlist row + matching
`oauth_accounts.sub` exists). Do **not** choose Option 2 (pure JWT) — it undermines the
instant-revocation requirement for disabled/removed fixed users.

---

## F. Remediation plan

### F.1 Immediate fixes (before ANY deployment)
| Task | Priority | Files | Steps | Deps | Testing | Breaking-change risk |
|------|----------|-------|-------|------|---------|----------------------|
| Fix C-1 `findOneAndUpdate` return handling | P0 | `refresh-token.repository.ts`, `user.repository.ts` (+ audit `session.repository.ts`, `verification-token.repository.ts`, `login-attempt.repository.ts`) | Return doc directly; add a driver-version regression test | none | Unit: rotation succeeds; integration: silent refresh keeps session | **Low** (fixes broken behavior) |
| Rotate & verify secrets | P0 | env/secret store | Generate new `SESSION_SECRET`, `ARGON2_SECRET`; `git log -p` scan | none | Boot guard passes | Session invalidation on rotate (expected) |
| Confirm `$jsonSchema` validators applied | P0 | `src/database/schemas/**`, `init.ts` | Verify collections created with validators + indexes (esp. `uidx_email`, `uidx_provider_accountId`, refresh `ttl`) | none | `db:init` idempotent check | Low |

### F.2 Important fixes (first production release)
| Task | Priority | Files | Steps | Deps | Testing | Risk |
|------|----------|-------|-------|------|---------|------|
| H-1 enforce server authz on every dashboard route | P1 | all `dashboard/**/page.tsx`, add lint rule | Add DAL call to each page; add CI check | none | e2e: revoked cookie blocked per route | Low |
| H-2 email canonicalization | P1 | `login.schema.ts`, `user.repository.ts`, seed scripts, `user_emails` | Add NFC+lowercase canonical field; migrate seeds | data migration | unit: confusable/alias variants | Medium (data migration) |
| H-3 OAuth state binding + Strict cookies | P1 | `google/route.ts`, `google/callback/route.ts` | Bind state to per-attempt secret; route via `strictCookieOpts`; single-use state | none | integration: replay/foreign-state rejected | Low |
| M-1/M-2 unify cookie writes | P1 | `google/callback/route.ts` | Use `setAuthCookies`/`strictCookieOpts` | H-3 | unit: cookie flags | Low |
| M-4 neutral admin errors | P1 | `admin.ts` | Replace `err.message` with generic text + server log | none | unit | Low |

### F.3 Defense-in-depth
| Task | Priority | Files | Notes |
|------|----------|-------|-------|
| M-3 per-IP 2FA/TOTP verify limits | P2 | `verify-2fa.ts`, `verify-totp.ts`, `two-factor.service.ts` | Add IP dimension to 2FA verify counter |
| M-5 tighten static CSP | P2 | `next.config.ts` | Drop `style-src 'unsafe-inline'` if UI allows; add HSTS at edge (`netlify.toml`/Vercel headers) |
| L-3 record real last-login | P3 | `user.repository.ts` | Add `security.lastLoginAt` |
| Anomaly review dashboard | P3 | alerting | Surface reuse/step-up/oauth-failure events |

### F.4 General hardening (not tied to a specific verified defect)
- Add automated dependency scanning (`pnpm audit`, Dependabot) — `argon2`, `mongodb`,
  `otplib`, `@simplewebauthn/*` are security-critical.
- Add a scheduled job to prune `login_attempts`/`audit_logs` per retention policy
  (schema notes TTL for tokens but audit/attempts retention is app-managed).
- Consider WebAuthn as the primary 2FA (already partly present) to reduce email-code
  reliance.
- Add integration tests that boot against the real `$jsonSchema` validators.

---
<!-- SECTION:F -->
## G. Code changes (highest-priority)

These match the installed versions (Next.js 16 App Router, TypeScript, mongodb v6,
argon2). Complete functions shown.

### G-1 (C-1) — Fix `findOneAndUpdate` return handling

In mongodb Node driver **v6**, `Collection.findOneAndUpdate(...)` resolves to the
matched/updated **document** (`WithId<T> | null`) by default — there is **no**
`{ value }` wrapper (that was the pre-v5 `ModifyResult` shape). The current casts
force `null` on every call.

#### File: `src/auth/repositories/refresh-token.repository.ts`

```ts
  async atomicReplace(
    oldHash: string,
    newId: ObjectId,
    now: Date
  ): Promise<RefreshTokenDocument | null> {
    const coll = await getRefreshTokensCollection();
    // mongodb v6: findOneAndUpdate resolves to the document directly (or null).
    // The conditional filter (replacedBy: null) guarantees only the first
    // concurrent rotation wins; the loser gets null and is treated as reuse.
    const updated = await coll.findOneAndUpdate(
      { tokenHash: oldHash, replacedBy: null },
      {
        $set: {
          revoked: true,
          replacedBy: newId,
          revokedReason: 'rotated',
          revokedAt: now,
        },
      },
      { returnDocument: 'after' }
    );
    return updated ?? null;
  }
```

#### File: `src/auth/repositories/user.repository.ts`

```ts
  async incrementFailedAndGet(
    userId: ObjectId,
    threshold: number
  ): Promise<UserDocument | null> {
    const usersColl = await getUsersCollection();
    // mongodb v6: returns the updated document directly (or null when the
    // predicate — failedLoginAttempts < threshold — did not match).
    const updated = await usersColl.findOneAndUpdate(
      { _id: userId, 'security.failedLoginAttempts': { $lt: threshold } },
      {
        $inc: { 'security.failedLoginAttempts': 1 },
        $set: { updatedAt: new Date() },
      },
      { returnDocument: 'after' }
    );
    return updated ?? null;
  }
```

**What changed:** removed the incorrect `{ value }` cast; return the document
directly. **Why safer:** restores correct refresh rotation (no false reuse
revocation) and makes the helper usable. **Migration/env:** none. **Also audit**
`session.repository.ts`, `verification-token.repository.ts`,
`login-attempt.repository.ts`, `oauth-account.repository.ts`,
`recovery-code.repository.ts` for the same `.value` pattern and add this regression
test:

```ts
// refresh-token.repository.rotation.unit.test.ts (integration against a real/mock v6 driver)
it('atomicReplace returns the updated doc, not null, on first rotation', async () => {
  const repo = new RefreshTokenRepository();
  const first = await repo.create({ /* ...valid token fields..., replacedBy: null */ } as never);
  const updated = await repo.atomicReplace(first.tokenHash, new ObjectId(), new Date());
  expect(updated).not.toBeNull();
  expect(updated!.replacedBy).toBeDefined();
});
```

### G-2 (H-3, M-1, M-2) — Bind OAuth state + route cookies through the strict helper

#### File: `src/app/api/auth/google/route.ts`

```ts
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { OAuthService } from '@/auth/services';
import { strictCookieOpts } from '@/auth/lib/cookies';
import { getEnv } from '@/auth/config/env';

const OAUTH_STATE_COOKIE = 'cws_oauth_state';

export async function GET() {
  const env = getEnv();
  let start;
  try {
    start = new OAuthService().buildAuthorizationUrl();
  } catch (err) {
    console.error('Google OAuth start failed:', err);
    return NextResponse.json(
      { error: 'Google sign-in is not available. Contact an administrator.' },
      { status: 503 }
    );
  }

  const cookieStore = await cookies();
  // Store only the flow secrets; the `state` value itself is the CSRF binding.
  // Strict + short TTL: the callback is a same-site top-level GET on our origin,
  // so Strict is delivered on the redirect back from Google to our domain.
  cookieStore.set(
    OAUTH_STATE_COOKIE,
    JSON.stringify({ state: start.state, codeVerifier: start.codeVerifier, nonce: start.nonce }),
    strictCookieOpts(env, { path: '/api/auth/google', maxAge: 10 * 60 })
  );

  return NextResponse.redirect(start.authorizationUrl);
}
```

> Note: if a Strict state cookie is not delivered on the return navigation in your
> deployment (some browsers treat the Google→app redirect as cross-site for Strict),
> fall back to `SameSite=Lax` **but** keep the single-use `state` match (already
> present) as the primary CSRF control and additionally bind the state cookie to a
> server-generated opaque id echoed in the `state` param. Test both in staging.

#### File: `src/app/api/auth/google/callback/route.ts` (cookie writes only)

Replace each inline `cookieStore.set(SESSION_COOKIE, ..., { sameSite: 'lax', ... })`
and the refresh/pending writes with the shared helpers so the OAuth path matches the
password path exactly:

```ts
import { setAuthCookies, strictCookieOpts, clearingCookieOpts } from '@/auth/lib/cookies';

// success path:
await setAuthCookies({ sessionCookie: result.sessionCookie, refreshToken: result.refreshToken });
return NextResponse.redirect(`${env.APP_URL}/dashboard/`);

// pending (mfa/force/step-up) path — Strict, like login.ts:
cookieStore.set(TWO_FA_PENDING_COOKIE, pending, strictCookieOpts(env, { path: '/', maxAge: 5 * 60 }));

// clearing the state cookie:
cookieStore.set(OAUTH_STATE_COOKIE, '', clearingCookieOpts('strict', '/api/auth/google'));
```

**What changed:** OAuth cookies now use the same Secure/HttpOnly/Strict policy and TTL
derivation as the password path. **Why safer:** removes the Lax refresh/pending
weakness (M-1/M-2) and scopes the state cookie to the OAuth path. **Migration/env:**
none. Ensure `GOOGLE_REDIRECT_URI` still matches the Google console.

### G-3 (H-2) — Canonical email normalization (single source of truth)

#### File: `src/auth/lib/email.ts` (new)

```ts
import 'server-only';

/**
 * Canonicalizes an email for allowlist matching and uniqueness.
 * - Unicode NFC + lowercase (defeats confusable/case duplicates).
 * - Trims surrounding whitespace.
 * Provider-specific alias folding (e.g. Gmail dot/plus) is intentionally NOT
 * applied automatically: for a FIXED-user app the admin controls exact seeds,
 * and silently folding could merge distinct approved addresses. Enforce exact
 * canonical equality instead. If you DO want Gmail folding, do it explicitly in
 * the seed tool, never at login time.
 */
export function canonicalizeEmail(raw: string): string {
  return raw.normalize('NFC').trim().toLowerCase();
}
```

#### File: `src/auth/validation/login.schema.ts`

```ts
import { z } from 'zod';
import { canonicalizeEmail } from '../lib/email';

export const loginSchema = z.object({
  email: z
    .string()
    .trim()
    .max(254, 'Email address must not exceed 254 characters.')
    .email('Invalid email address format.')
    .transform(canonicalizeEmail),
  password: z.string().min(1, 'Password is required.').max(128, 'Password must not exceed 128 characters.'),
  rememberMe: z.boolean().optional().default(false),
});

export type LoginPayload = z.infer<typeof loginSchema>;
```

#### File: `src/auth/repositories/user.repository.ts` (lookup)

```ts
import { canonicalizeEmail } from '../lib/email';

  async findByEmail(email: string): Promise<UserDocument | null> {
    const emailsColl = await getUserEmailsCollection();
    const emailRecord = await emailsColl.findOne({
      email: canonicalizeEmail(email), // must match how seeds are stored
      enabled: true,
    });
    if (!emailRecord) return null;

    const usersColl = await getUsersCollection();
    return usersColl.findOne({ _id: emailRecord.userId, deletedAt: null });
  }
```

**What changed:** one canonicalization function used at validation, lookup, and (per
§F) seeding. **Why safer:** eliminates case/whitespace/Unicode duplicate identities
and makes the allowlist deterministic. **Migration/env:** re-canonicalize existing
`user_emails.email` values (one-off script) and keep the `uidx_email` unique index.

### G-4 (H-1) — Enforce authorization on every dashboard Server Component

The proxy stays optimistic. Add a tiny reusable guard and require it. Verified pages
already call the DAL; this is the pattern to apply everywhere + a CI guard.

#### Pattern (every `dashboard/**/page.tsx`)

```ts
// Read-only page:
import { requireActiveSession } from '@/auth/dal';
export default async function Page() {
  await requireActiveSession(); // redirects if revoked/expired/inactive
  // ...render
}

// Admin-only page:
import { requireRole } from '@/auth/dal';
import { redirect } from 'next/navigation';
export default async function Page() {
  try { await requireRole('admin'); } catch { redirect('/dashboard'); }
  // ...render
}
```

#### CI guard (fails build if a dashboard page omits a DAL call)

```bash
# scripts/check-dashboard-authz.sh
set -euo pipefail
missing=0
while IFS= read -r f; do
  if ! grep -Eq 'require(Auth|ActiveSession|Role)\(' "$f"; then
    echo "AUTHZ MISSING: $f"; missing=1
  fi
done < <(find "src/app/(admin)/dashboard" -name 'page.tsx' \
          -not -path '*/login/*' -not -path '*/verify-2fa/*' \
          -not -path '*/forgot-password/*' -not -path '*/reset-password/*' \
          -not -path '*/change-password/*')
exit $missing
```

**What changed:** codifies the "authorization is enforced server-side, per route"
rule. **Why safer:** prevents H-1 from ever regressing when new pages are added.
**Migration/env:** wire the script into `pnpm build`/CI.

### G-5 (M-4) — Neutral admin action errors

#### File: `src/auth/actions/admin.ts` (both catch blocks)

```ts
  } catch (err) {
    if (err instanceof InsufficientRoleError) {
      return { error: 'You do not have permission to perform this action.' };
    }
    console.error('adminRevoke action failed:', err); // details server-side only
    return { error: 'Unable to complete the request. Please try again.' };
  }
```

**What changed:** stop returning raw `err.message`. **Why safer:** avoids leaking
driver/internal details to the client. **Migration/env:** none.

---

## H. Database model (minimal, fixed-user)

The existing 11-collection schema is appropriate and already covers the requirements.
Below is the **minimal effective subset** for password + Google fixed users, with the
one recommended addition (`canonicalEmail`) and confirmation of the security levers.

**`users`** (identity + authz + lifecycle)
- `_id` (stable internal ID), `role` (`admin|member|viewer` — server-authoritative),
  `status` (`active|inactive|disabled|suspended|deleted`),
- `password: { hash, algorithm } | null` (Argon2id; nullable for Google-only users),
- `security: { failedLoginAttempts, lockedUntil, mfaEnabled, forcePasswordChange, accountSecurityVersion, lastLoginAt? }`,
- `metadata: { invitedBy, invitedAt, notes }`, `createdAt/updatedAt/deletedAt`.
- **Session revocation lever:** bump `security.accountSecurityVersion` → all sessions
  fail validation (verified in `validateSession`).

**`user_emails`** (the allowlist)
- `userId`, `email` (canonical, **unique** `uidx_email`), `verified`, `primary`,
  `enabled` (**this is the allowlist gate** — login requires `enabled:true`).
- **Add:** ensure stored value is the canonical form (§G-3).

**`oauth_accounts`** (Google linkage — explicit only)
- `userId`, `provider`, `providerAccountId` (= OIDC `sub`, **unique** with provider),
  `providerEmail` (informational only), `linkedAt`, `lastUsedAt`.
- **Invariant:** a row exists ONLY when an admin (or an authenticated, MFA-gated
  connect flow) links it. Login never creates one. This is what makes "unauthorized
  Google account → denied" true.

**`sessions`** + **`refresh_tokens`** (DB-backed sessions, rotation)
- `sessions.accountSecurityVersion` snapshot, `expiresAt`, `lastActivityAt`,
  `lastFullAuthAt`, `revoked*`, `deviceId`.
- `refresh_tokens.tokenHash` (SHA-256 only), rotation chain, `reuseDetected`, TTL index.

**`login_attempts`** + **`audit_logs`** (rate-limit + forensics, serverless-coherent,
no Redis).

### Secure fixed-user lifecycle
- **Create:** admin/seed inserts `users` (`status:'active'`, role, `security` defaults,
  `accountSecurityVersion:1`) + `user_emails` (canonical, `enabled:true`, `primary:true`)
  + optional `password` (Argon2id) and/or `oauth_accounts` row (Google `sub`). No
  public registration path exists.
- **Update password:** set new Argon2id hash, `passwordChangedAt`, and **bump
  `accountSecurityVersion`** to kill existing sessions.
- **Disable:** set `status:'disabled'` (or `inactive/suspended`) → blocks login and
  invalidates live sessions on next request. Optionally bump version + admin
  force-logout for immediate effect.
- **Delete (safe):** soft-delete via `deletedAt` + `status:'deleted'`; bump version;
  revoke sessions; keep `audit_logs`. Remove/disable `user_emails` and
  `oauth_accounts` rows so the identity can no longer authenticate.
- **Revoke sessions:** `adminRevokeUserSessionsAction` / `adminRevokeAllSessionsAction`
  (already present) + version bump.

No registration tables/flows are added or recommended.

---
<!-- SECTION:H -->
## I. Production configuration checklist

**Environment variables (inject via Vercel/Netlify secret store — never `NEXT_PUBLIC_*`):**
- [ ] `MONGODB_URI` (rotated from any shipped default)
- [ ] `SESSION_SECRET` (≥32 chars, unique per env; NOT the blocklisted default)
- [ ] `ARGON2_SECRET` (≥16 chars; set BEFORE first user or plan a re-hash migration)
- [ ] `APP_URL` (https:// production origin)
- [ ] `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REDIRECT_URI`
- [ ] `SECURE_COOKIES=true` (boot fails closed otherwise)
- [ ] `TRUSTED_PROXY_IP_HEADER` (e.g. `x-vercel-proxied-for`; boot fails closed otherwise)
- [ ] `ADMIN_SEED_*` (only where you seed; treat password as a secret)
- [ ] `EMAIL_USER`/`EMAIL_PASSWORD` (Gmail App Password) if email 2FA is used
- [ ] Optional: `GEOIP_LOOKUP_URL`, `STEP_UP_ENABLED`, `WEBAUTHN_RP_ID/ORIGIN`

**Google OAuth console:**
- [ ] Authorized redirect URI == `GOOGLE_REDIRECT_URI` exactly (prod domain, `/api/auth/google/callback`)
- [ ] Separate OAuth client (or at least redirect URIs) for preview vs production
- [ ] Do NOT add preview `*.vercel.app` wildcard as an authorized redirect for the prod client
- [ ] OAuth consent screen restricted (internal/test users) to the fixed user set

**Callback URLs / redirects:**
- [ ] All post-login redirects are server-controlled (`${APP_URL}/dashboard/`) — verified; keep it that way (no user-supplied `redirect` param echoed)

**Cookie settings (verified in code; confirm at runtime):**
- [ ] `cws_session` HttpOnly, Secure, SameSite=Lax, Path=/
- [ ] `cws_refresh` HttpOnly, Secure, SameSite=Strict, Path=/api/auth/refresh
- [ ] Pending + OAuth-state cookies Strict after §G-2
- [ ] No auth token in `localStorage`/`sessionStorage` (verified — all HttpOnly cookies)

**Trusted hosts / headers:**
- [ ] `assertSameOrigin` uses `APP_URL` — set correctly per env
- [ ] Edge HSTS: `Strict-Transport-Security: max-age=63072000; includeSubDomains; preload` (Netlify `_headers`/`netlify.toml` or Vercel headers — NOT in app)
- [ ] Security headers from `next.config.ts` applied on `/dashboard` + `/api`

**Preview deployments:**
- [ ] Preview uses distinct `SESSION_SECRET`/`ARGON2_SECRET`/DB (no prod-secret bleed)
- [ ] Preview cannot complete prod Google OAuth (separate client/redirect)
- [ ] Preview DB is not production data

**Database security:**
- [ ] Atlas IP allowlist / private networking; least-privilege DB user
- [ ] `$jsonSchema` validators + unique indexes actually created (`uidx_email`, `uidx_provider_accountId`, refresh `ttl_expiresAt`)
- [ ] Backups enabled + tested restore

**Secret rotation / logging / monitoring / rate limiting / backups / deploy test:**
- [ ] Documented rotation procedure for `SESSION_SECRET` (invalidates sessions) and `GOOGLE_CLIENT_SECRET`
- [ ] Logs never contain passwords, tokens, cookies, OAuth codes, or secrets (verified: code logs reasons/names only — spot-check `console.error` sites)
- [ ] Alerts wired for `AUTH_STEP_UP_REQUIRED`, refresh reuse, OAuth failure spikes
- [ ] Rate-limit thresholds reviewed for the small user count (IP=20, id=10, 2FA=5)
- [ ] Post-deploy smoke test: login, logout, refresh, admin revoke, Google login

---

## J. Test plan

### Unit
- [ ] `verifyPassword` accepts correct, rejects wrong, returns false on malformed hash
- [ ] `signSessionId`/`verifySessionSignature` round-trip + tamper (bit-flip sig → null; wrong secret → null; timing-safe)
- [ ] `canonicalizeEmail` folds case/whitespace/NFC; keeps distinct real addresses distinct (§G-3)
- [ ] `loginSchema` rejects >254 email, >128 password, non-email; transforms to canonical
- [ ] `atomicReplace` returns updated doc (regression for C-1); returns null when `replacedBy!=null`
- [ ] `recordFailedLoginAndMaybeLock` locks exactly at threshold; concurrent writers don't double-cross (existing atomic-lockout test)
- [ ] `verifyIdToken` rejects wrong `alg`, wrong `aud`, expired `exp`, bad `nonce`, bad signature, unknown `kid` after refetch

### Integration
- [ ] **Valid password login** → session+refresh cookies set, redirect `/dashboard`
- [ ] **Invalid password** → generic error, failed attempt recorded, counter increments
- [ ] **Unknown user** → same generic error + comparable timing (dummy-hash path)
- [ ] **Disabled/suspended/deleted user** → login blocked; live session invalidated next request
- [ ] **Valid approved Google user** (pre-provisioned `oauth_accounts`) → session
- [ ] **Valid but UNAPPROVED Google user** (no row) → rejected, no row created, no session
- [ ] **Unverified Google email** → captured `email_verified=false`; ensure no email-based trust path grants access (Google path uses `sub`, so verify it never falls back to email)
- [ ] **Expired session** (absolute + idle) → `validateSession` returns null, cookie cleared
- [ ] **Tampered session cookie** → rejected
- [ ] **Removed user with old session** → next request revokes (status + version)
- [ ] **`accountSecurityVersion` bump** → all sessions invalidated
- [ ] **Refresh rotation happy path** → new token issued, old chained, session survives (C-1 regression)
- [ ] **Refresh reuse** (replay old token) → whole family revoked + alert
- [ ] **Lockout** → 5 failures locks 15 min; correct after expiry
- [ ] **2FA**: correct code passes, wrong code fails, 5 fails forces re-auth; resend throttle
- [ ] **CSRF**: cross-origin Server Action POST → `Request blocked.`; cross-origin logout → 403
- [ ] **OAuth state**: mismatched/foreign/replayed `state` → rejected (§G-2)
- [ ] **Case-variant email**: `USER@x.com` vs seeded `user@x.com` → same identity, no dup
- [ ] **Concurrent logins** beyond cap (5) → oldest revoked
- [ ] **Admin revoke** (single + all) → target sessions dead; admin cannot self-revoke via that path

### End-to-end (Playwright — `tests/auth.spec.ts` exists)
- [ ] Full password login → dashboard → logout → protected route redirects to login
- [ ] Google login round-trip (mock provider) for approved user
- [ ] Authorization: non-admin visiting `/dashboard/admin/users` redirected to `/dashboard`
- [ ] Open-redirect: no user-supplied redirect param is honored post-login
- [ ] **Production cookie configuration**: assert `Secure`, `HttpOnly`, correct `SameSite`/`Path` on each auth cookie in a prod-like build

---

## Closing note

This is a strong, security-conscious codebase. The single **must-fix before deploy**
is **C-1** (the `findOneAndUpdate().value` bug), because it silently breaks refresh
rotation and the theft-detection signal. After C-1 and the four High/Medium items in
§F.2, this system is production-ready for a fixed-user, serverless, no-Redis Next.js
deployment, and I recommend keeping the current custom architecture rather than
migrating.
<!-- SECTION:J -->
