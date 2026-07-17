# Auth Critical Fixes — Implementation Prompt (C1–C4)

> **Purpose:** A self-contained, copy-paste-ready prompt for an *isolated coding session* to fix the
> four Critical-severity findings from the authentication security audit (C1–C4). It embeds all the
> context an independent agent needs — architecture, file map, current code, required changes, and
> acceptance criteria — so no prior conversation is required.
>
> **Scope of THIS pass:** C1 (secrets/pepper), C2 (refresh defeats session expiry), C3 (OAuth auto-link
> takeover), C4 (spoofable client IP).
>
> **RBAC is DEFERRED** — do NOT implement `requireRole` / `requirePermission` or gate admin pages
> in this pass. Authorization work is a later, separate workstream.

---

## 1. System Context (read fully before editing)

**Stack:** Next.js 16 App Router · TypeScript (strict) · MongoDB driver (no Mongoose/ODM) · React 19 Server Actions.

**Route protection model (Next 16):** `src/proxy.ts` is the renamed "middleware". It does an
**optimistic** HMAC signature check of the `cws_session` cookie and redirects unauthenticated
`/dashboard/*` requests to login. **Full validation (DB lookup, account status) is deferred to the
page/server-action layer** via `src/auth/dal.ts` (`getAuthSession`, `requireAuth`, `requireActiveSession`).

**Auth layering:**
- `src/auth/crypto/` — `password.ts` (argon2id + optional pepper `ARGON2_SECRET`), `token.ts`
  (CSPRG tokens, `hashToken` SHA-256, HMAC `signSessionId`/`verifySessionSignature`).
- `src/auth/config/env.ts` — Zod-validated env (`getEnv()`).
- `src/auth/lib/` — `cookies.ts` (cookie names + setters), `device.ts` (`cws_device` client UUID),
  `request.ts` (`getClientIp`, `assertSameOrigin`).
- `src/auth/services/` — `login`, `session`, `oauth`, `password`, `twoFactor`, `device`, `rateLimit`, `logout`, `mailer`.
- `src/auth/repositories/` — Mongo data access (`loginAttempt`, `session`, `refreshToken`, `device`,
  `verificationToken`, `user`, `auditLog`, `oauthAccount`, `passwordPolicy`, `passwordHistory`).
- `src/auth/actions/` — Server Actions: `login`, `verify-2fa`, `change-password`, `password-reset`, `session`, `device`.
- `src/auth/dal.ts` — session resolution used by pages/actions.

**Session / token model (must be preserved):**
- `cws_session` cookie = `<sessionId>.<HMAC_SHA256(sessionId, SESSION_SECRET)>`. Validated in
  `SessionService.validateSession` (enforces absolute + idle expiry AND re-checks account status + security version).
- `cws_refresh` cookie = opaque random token; **only its SHA-256 hash** is stored in `refresh_tokens`.
  Rotation on use; reuse detection revokes the whole session family + sends a theft alert.
- Intermediate auth states use signed `cws_2fa_pending` / `cws_pw_pending` cookies carrying the userId.

**Key TTLs (`src/auth/config/env.ts`):** `ACCESS_SESSION_TTL_MS` = 15 min (default),
`IDLE_TIMEOUT_MS` = 30 min, `REFRESH_TOKEN_TTL_MS` = 7 days.

**OAuth flow:** `src/app/api/auth/google/route.ts` (start, writes `cws_oauth_state` cookie with
PKCE/state/nonce) → Google → `src/app/api/auth/google/callback/route.ts` →
`OAuthService.handleCallback` in `src/auth/services/oauth.service.ts`.

**Repo root:** `/Users/User/Documents/projects/cws-proj/cws-next-app`

---

## 2. Constraints

- Keep the existing database session + refresh-rotation design. Do NOT replace it.
- Keep audit logging on every security event.
- Preserve cookie `HttpOnly` + `SameSite=lax` (+ `Secure` in production via
  `process.env.NODE_ENV === 'production'`). Keep existing cookie-option semantics unless a fix explicitly changes them.
- For throttling, use the existing MongoDB `LoginAttemptRepository` — **no Redis**.
- **RBAC / role enforcement is DEFERRED** — do NOT add `requireRole`/`requirePermission`.
- Do NOT introduce a secrets manager, SIEM, or server-issued device tokens in this pass.
- Do NOT rewrite the project. Apply only the four targeted fixes below.

---

## FIX-C1 (Critical) — Weak / default secrets + no pepper

**Severity:** Critical
**Category:** Secrets management / credential leakage

**Affected files (absolute):**
- `/Users/User/Documents/projects/cws-proj/cws-next-app/.env` (and `.env.example` doc patterns)
- `/Users/User/Documents/projects/cws-proj/cws-next-app/src/auth/config/env.ts`
- `/Users/User/Documents/projects/cws-proj/cws-next-app/src/auth/crypto/password.ts`
- `/Users/User/Documents/projects/cws-proj/cws-next-app/scripts/seed-users.ts`

**Problem:**
1. The working `.env` ships a static `SESSION_SECRET=34857aa209984d1b883753dbf3f82dd5ce9ee6065882c414f4883e6dc12a6489` and
   `ADMIN_SEED_PASSWORD=Password123!`. A leaked `SESSION_SECRET` lets an attacker forge `cws_session`,
   `cws_2fa_pending`, and `cws_pw_pending` cookies (all signed with the same HMAC key).
2. `ARGON2_SECRET` is absent, so `hashPassword` stores argon2id hashes **without the application pepper**.
   A DB leak then exposes un-peppered hashes.
3. `ADMIN_SEED_PASSWORD=Password123!` is a trivially weak, well-known pattern.

> Note: `.env` is correctly git-ignored (`git ls-files .env` is empty), so the risk is the *values themselves*
> and the copy-paste pattern — not that they are committed. The fix is operational + a fail-closed guard.

**Required change:**

(a) **Fail-closed guard in `env.ts`** — refuse to boot in production with a default / `too-short` / `example` secret,
and warn loudly when the pepper is missing in production (this guard must NOT break local dev with the example file):

```ts
// src/auth/config/env.ts — inside getEnv()/validateSecurityConfig, AFTER safeParse succeeds:
const isProd = process.env.NODE_ENV === 'production';

const DEFAULT_SESSION_SECRETS = new Set([
  'default_session_secret_must_be_thirty_two_characters_long',
  '34857aa209984d1b883753dbf3f82dd5ce9ee6065882c414f4883e6dc12a6489', // current shipped value
]);
if (isProd && (!env.SESSION_SECRET || env.SESSION_SECRET.length < 32 || DEFAULT_SESSION_SECRETS.has(env.SESSION_SECRET))) {
  throw new Error(
    'FATAL: SESSION_SECRET is missing, too short (<32 chars), or equal to a known default. ' +
    'Generate a unique value per environment with: openssl rand -hex 32'
  );
}
if (isProd && !env.ARGON2_SECRET) {
  console.warn('⚠️ SECURITY: ARGON2_SECRET is not set in production. Password hashes are stored WITHOUT the application pepper.');
}
```

(b) Keep `ARGON2_SECRET` `min(16)` for dev; do NOT make it required in non-prod so local dev keeps working.
The production warning above is the enforcement signal.

(c) **Document the operational fix in `.env.example`** (do not commit real secrets):
```
# Generate a UNIQUE value per environment:
#   openssl rand -hex 32
# Never reuse the dev/default value in production.
SESSION_SECRET=<unique-32+ hex per env>

# Argon2 application pepper (>=16 chars). Adding this AFTER hashes exist
# requires re-hashing existing passwords (see seed script note).
ARGON2_SECRET=<unique-16+ char secret>
```

(d) **Seed script note** (`scripts/seed-users.ts`): add a comment warning that enabling `ARGON2_SECRET`
after users already exist requires a re-hash pass; no code change needed beyond documenting. Also keep
`forcePasswordChange: true` for the seeded admin (already present) so the weak seed password is never long-lived.

**Acceptance criteria:**
- `pnpm build` (runs `node security-scan.js && next build`) still succeeds in dev with `.env.example` values.
- In a production-like run (`NODE_ENV=production` with the default/shipped `SESSION_SECRET`), `getEnv()` THROWS at boot.
- With a real 64-hex `SESSION_SECRET` + a 16+ char `ARGON2_SECRET`, boot succeeds and no warning prints.
- No real secret is written to the repo; `.env` stays git-ignored.

---
## FIX-C2 (Critical) — Refresh token defeats session idle/absolute expiry

**Severity:** Critical (architectural)
**Category:** Session management / broken authentication (compliance)

**Affected files (absolute):**
- `/Users/User/Documents/projects/cws-proj/cws-next-app/src/auth/services/session.service.ts`
  (`rotateRefreshToken`, and the `createSession` expiry logic / `validateSession` idle-absolute math)
- `/Users/User/Documents/projects/cws-proj/cws-next-app/src/app/api/auth/refresh/route.ts`
- `/Users/User/Documents/projects/cws-proj/cws-next-app/src/database/schemas/sessions.schema.ts`
- `/Users/User/Documents/projects/cws-proj/cws-next-app/src/database/schemas/refresh-tokens.schema.ts`

**Problem:** `validateSession` enforces `ACCESS_SESSION_TTL_MS` (15m) and `IDLE_TIMEOUT_MS` (30m).
But `POST /api/auth/refresh` accepts a 7-day `cws_refresh` cookie and, in `rotateRefreshToken`, mints a
**brand-new** session with a fresh `expiresAt = now + ACCESS_SESSION_TTL_MS`. A user (or a stolen refresh cookie)
who refreshes after a week gets a fully valid new session — the 15-min/30-min policy is silently bypassed.
For an enterprise expecting idle logout / short sessions, this is a hard fail.

**Required change (minimal, no new infra):**

(a) Add a `lastFullAuthAt` field to `sessions` so refresh can enforce an *absolute* "since last real login"
limit independent of the rolling access-session TTL. Add it to the schema (`sessions.schema.ts`) as
`{ bsonType: 'date' }` (optional) and set it in `createSession` to `now`.

(b) In `rotateRefreshToken`, after the existing `existing.revoked` / missing checks and before issuing a new token,
enforce BOTH:
  - **Refresh absolute limit:** `now - session.lastFullAuthAt > env.REFRESH_TOKEN_TTL_MS` → treat as expired (revoke family, return null, clear cookies).
  - **Refresh idle limit:** `now - session.lastActivityAt > env.IDLE_TIMEOUT_MS` → same.

  Reuse the existing `env` already fetched at the top of `rotateRefreshToken`. Mirror the existing
  `validateSession` idle/absolute math so behaviour is consistent.

(c) Emit an audit `WARNING` (`auth.refresh.expired`, `AUTH_REFRESH_EXPIRED`) when a refresh is refused due to
these limits, and ensure `/api/auth/refresh` returns `401 { error: 'Session expired' }` (it already returns
`401 { error: 'Session revoked' }` for the reuse/null case — add a distinct, still-generic message `Session expired`).

(d) **Do NOT** shorten `REFRESH_TOKEN_TTL_MS` globally (that is a product decision); the point is that refresh now
respects the configured idle/absolute window so the stated policy is actually enforced. Keep the refresh-family
revocation + reuse detection exactly as-is.

**Acceptance criteria:**
- A session idle > `IDLE_TIMEOUT_MS` (default 30m) can no longer be "refreshed" into a new valid session; the refresh returns 401 and cookies are cleared.
- A session whose `lastFullAuthAt` is older than `REFRESH_TOKEN_TTL_MS` (default 7d) is refused at refresh.
- Active, recently-used sessions still refresh normally (no regression for normal users).
- A reuse-detected token still revokes the whole family and alerts (unchanged behaviour).
- `sessions` schema validates with the new optional `lastFullAuthAt` field.

---

## FIX-C3 (Critical) — OAuth auto-link by verified email (account takeover)

**Severity:** Critical
**Category:** Broken authentication / account takeover (internal, fixed-account app)

**Affected files (absolute):**
- `/Users/User/Documents/projects/cws-proj/cws-next-app/src/auth/services/oauth.service.ts` (`handleCallback`)
- `/Users/User/Documents/projects/cws-proj/cws-next-app/src/auth/repositories/oauth-account.repository.ts`
- `/Users/User/Documents/projects/cws-proj/cws-next-app/src/app/api/auth/google/callback/route.ts` (no change needed, keep parity)

**Problem:** On first Google login, if no `oauth_accounts` row exists but `profile.email` is `email_verified`
and matches a provisioned user's email, the code **automatically links** the Google identity to that account
(`oauthRepo.link(...)`) and logs in. For a fixed internal-user app (no public registration), this lets anyone who
controls a Google account asserting a matching verified email (e.g. `admin@company.com` registered at Google before
the company provisions it, typosquats/lookalikes, or a compromised Google account) **link and then authenticate as that
internal user**, bypassing password/MFA discipline on that link and violating the "no public registration" model.

**Required change (explicit, pre-provisioned linking only):**

In `handleCallback`, **remove the auto-link-by-email branch**. Only authenticate when an `oauth_accounts` row
already exists (i.e., an admin/user explicitly connected Google from an authenticated session). If no link exists,
throw a clear error and do NOT log in.

```ts
// src/auth/services/oauth.service.ts — replace the resolution block:

const oauthAccount = await this.oauthRepo.findByProvider('google', profile.sub);
if (!oauthAccount) {
  // No pre-provisioned link exists. For a fixed internal app we do NOT auto-link
  // by email (account-takeover risk). The user must connect Google from an
  // authenticated session via an explicit, password+MFA-gated flow (later workstream).
  throw new Error('Google sign-in is not enabled for this account. Contact an administrator.');
}
const userId = oauthAccount.userId;
// NOTE: isFirstTimeLink is now always false here (link is provisioned, not created at login).
// Keep the `auth.oauth.linked` audit event for the explicit connect flow only (future);
// remove the isFirstTimeLink emission from this login path.
```

- Delete/neutralize the `isFirstTimeLink` logic that emitted `auth.oauth.linked` on a *login-time* link.
  (An explicit connect flow that emits that event is a later feature; do not emit it from login anymore.)
- Remove the `else if (profile.email && profile.email_verified)` linking branch entirely.
- Keep `oauthRepo.touchLastUsed(...)` for existing links.
- Keep the MFA / force-password-change parity (FIX-03) and the account-status check exactly as-is.

**Acceptance criteria:**
- A Google identity that is NOT already in `oauth_accounts` for this app is **rejected** (user is redirected to
  login with `?error=oauth_invalid`, no session issued) — even if its verified email matches a provisioned user.
- A Google identity that IS already linked (row exists) logs in normally and still respects MFA / force-change.
- No new `oauth_accounts` row is created during the login callback.
- No account can be linked to an internal user solely by controlling a matching verified email.

---

## FIX-C4 (Critical) — Spoofable client IP (rate limiting / geo bypass)

**Severity:** Critical (when deployed behind a proxy/LB without `TRUSTED_PROXY_IP_HEADER`)
**Category:** Broken anti-automation / information reliability

**Affected files (absolute):**
- `/Users/User/Documents/projects/cws-proj/cws-next-app/src/auth/lib/request.ts` (`getClientIp`)
- `/Users/User/Documents/projects/cws-proj/cws-next-app/src/auth/config/env.ts` (already has `TRUSTED_PROXY_IP_HEADER`)
- `/Users/User/Documents/projects/cws-proj/cws-next-app/src/auth/services/rate-limit.service.ts` (consumer)
- `/Users/User/Documents/projects/cws-proj/cws-next-app/src/auth/services/device.service.ts` (geo consumer)

**Problem:** `getClientIp()` trusts the **first hop of `x-forwarded-for`** whenever `TRUSTED_PROXY_IP_HEADER`
is unset. `x-forwarded-for` is fully client-controlled, so an attacker can send
`X-Forwarded-For: 1.2.3.4` on every brute-force attempt, making each appear from a different IP and
**defeating the IP rate limit (20/15m)** and the geo "suspicious location" alerts. This is exploitable on any
deployment where the platform does not overwrite/append a trusted header.

**Required change (fail-closed, no new infra):**

(a) When `TRUSTED_PROXY_IP_HEADER` is configured, use it (already implemented) — keep as-is.

(b) When it is **NOT** configured:
  - In **production** (`NODE_ENV === 'production'`): **refuse to trust client-supplied `x-forwarded-for`**.
    Fall back to `x-real-ip` only if also not spoofable there, otherwise to a sentinel default.
    Log a one-time startup warning that client IP is untrusted.
  - In **development** (no proxy): keep using `x-forwarded-for` first hop so local dev / tooling keeps working.

```ts
// src/auth/lib/request.ts — replace the body of getClientIp():
const env = getEnv();
const trustedHeader = env.TRUSTED_PROXY_IP_HEADER?.trim();

if (trustedHeader) {
  const v = headersList.get(trustedHeader);
  if (v) return v.split(',')[0].trim();
}

const isProd = process.env.NODE_ENV === 'production';
// In production without a trusted-proxy header, client-supplied XFF is spoofable.
// Do NOT trust it — prefer x-real-ip (also edge-set) and never a client header.
if (isProd) {
  const realIp = headersList.get('x-real-ip');
  if (realIp) return realIp.trim();
  return '0.0.0.0'; // untrusted sentinel; rate-limit/geo must treat as "unknown"
}

// Development: behind no real proxy, XFF first-hop is acceptable for local testing.
const forwardedFor = headersList.get('x-forwarded-for');
if (forwardedFor) return forwardedFor.split(',')[0].trim();
const realIp = headersList.get('x-real-ip');
if (realIp) return realIp.trim();
return '127.0.0.1';
```

(c) **Deployment guidance (doc only, in `.env.example` / a comment):** when deploying behind Netlify/Vercel/nginx,
set `TRUSTED_PROXY_IP_HEADER` to the platform's trusted header (e.g. Vercel `x-vercel-proxied-for`) AND
configure the edge to **strip inbound `x-forwarded-for`** before appending its own hop.

(d) Rate-limit/geo consumers need no code change, but note: a `0.0.0.0` sentinel in prod means per-IP limits
effectively collapse — that is acceptable and *safe* (fail-closed) versus the spoofable alternative; the
per-identifier (email) limit in `rate-limit.service.ts` still provides account-level protection.

**Acceptance criteria:**
- In `NODE_ENV=production` with no `TRUSTED_PROXY_IP_HEADER`, a request carrying
  `X-Forwarded-For: 9.9.9.9` does NOT resolve client IP to `9.9.9.9` (it returns `x-real-ip` or `0.0.0.0`).
- In dev (no proxy), `X-Forwarded-For` first-hop resolution still works (no regression for local testing).
- With `TRUSTED_PROXY_IP_HEADER` set, that header is used preferentially (unchanged).
- No build/lint break; `getClientIp` remains the single source of truth for login/OAuth/2FA/refresh.

---

## 3. Out of Scope (explicitly deferred)

- RBAC enforcement (`requireRole`/`requirePermission`, admin-page gating) — **later workstream**.
- MFA enrollment UI / backup codes (only the existing 2FA parity stays).
- Server-issued tamper-resistant device tokens (the `cws_device` client UUID block remains best-effort).
- SIEM / immutable audit export / geo-IP service.
- Refresh-token↔session/user/device binding hardening (note as a follow-up, but do not implement here).
- Secret rotation + versioned cookies.

---

## 4. Execution Order (recommended)

1. **FIX-C1** — secrets guard (lowest risk, unblocks safe deploys).
2. **FIX-C4** — client IP fail-closed (cheap, high impact behind proxies).
3. **FIX-C3** — remove OAuth auto-link (closes takeover; well-contained).
4. **FIX-C2** — enforce expiry at refresh (schema field + service logic).

Each fix is independent; they can be PR'd separately. Run `pnpm lint` and `pnpm build` after each.

---

## 5. Verification (run after all fixes)

```bash
cd /Users/User/Documents/projects/cws-proj/cws-next-app
pnpm lint
pnpm build            # runs node security-scan.js && next build
# Manual:
#  - C1: NODE_ENV=production with default SESSION_SECRET => getEnv() throws at boot.
#  - C2: idle > 30m refresh => 401; recent refresh => 200.
#  - C3: Google login with unlinked (but email-matching) identity => rejected, no session.
#  - C4: prod + XFF spoof => client IP NOT taken from XFF.
```

---

*End of prompt. This document is self-contained: an isolated session can execute C1–C4
without prior conversation, preserving the existing session/refresh design and deferring RBAC.*

