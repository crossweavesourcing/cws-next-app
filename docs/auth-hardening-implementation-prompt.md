# Auth Hardening — Implementation Prompt (self-contained)

> **How to use this doc:** Hand it to a fresh implementation session with no
> prior context. It contains all the project facts, file references, current
> behavior, and acceptance criteria needed to implement the 11 hardening items.
> Preserve the existing architecture — do NOT rewrite the auth system.
> Targeted, reviewable changes only.

---

## 0. Project facts (read first)

- **Framework:** Next.js 16 (App Router). `src/proxy.ts` is the renamed "middleware"
  (lightweight optimistic guard only — full auth deferred to the DAL).
- **Language:** TypeScript (strict). No Mongoose; official MongoDB driver only.
- **Auth stack:** email+password AND Google OAuth (Authorization Code + PKCE).
  Internal app, **no public registration**. Users are seed/admin-created.
- **Session model (DO NOT replace):** database-backed sessions in `sessions`
  collection. `cws_session` cookie = `<sessionId>.<HMAC_SHA256(sessionId, SESSION_SECRET)>`.
  `cws_refresh` cookie = opaque random token; only its SHA-256 hash is stored in
  `refresh_tokens`. Refresh tokens rotate; reuse detection revokes the session family.
- **Password:** `argon2` (argon2id, memoryCost 65536, timeCost 3, parallelism 1) with an
  optional application pepper (`ARGON2_SECRET`).
- **Env loading:** `src/auth/config/env.ts` — Zod-validated `getEnv()` singleton.
  `process.env.NODE_ENV === 'production'` gates `Secure` cookies.
- **DB access layers:** `src/auth/dal.ts` (auth guards) -> `src/auth/services/*`
  (orchestration) -> `src/auth/repositories/*` (Mongo). Cookies via `src/auth/lib/cookies.ts`,
  `src/auth/lib/device.ts`, `src/auth/lib/request.ts`. Client device id via
  `cws_device` cookie (currently **client-generated UUID v4** — untrusted).
- **Secrets:** `.env` is gitignored (`git ls-files` confirms untracked). It currently ships
  WITHOUT `ARGON2_SECRET` and with `SESSION_SECRET` equal to a blocklisted default
  (prod boot is correctly refused for that value). `MONGODB_URI` + admin seed creds are
  plaintext in `.env`. `.env.example` documents all vars.
- **Conventions:** server actions live in `src/auth/actions/*.ts` (`'use server'`);
  route handlers in `src/app/api/auth/*`. Keep `server-only` / `use server` directives.
  Audit via `AuditLogRepository.log({...})`. Emails via `sendMail({to,subject,text})`.


---

### Item 10 — Admin forced / global logout  (P1)
**Problem:** Only self-service `revokeSessionAction` / `revokeAllOtherSessionsAction` exist.
No admin capability to force-logout a specific user or every user (breach response).

**Fix (incremental):**
- Add `src/auth/actions/admin.ts` (`'use server'`) with:
  - `adminRevokeUserSessionsAction(formData)` → calls
    `SessionRepository.revokeAllUserSessions(userId, 'admin')` + `RefreshTokenRepository.revokeBySession(s)`
    (family revoke) + audit `auth.session.revoked` (actor `admin`).
  - `adminRevokeAllSessionsAction()` → revokes **all** sessions across all users
    (`sessions.updateMany({revoked:false}, {$set:{revoked:true,...}})`) + refresh families + audit.
- Gate both behind a **new `requireRole('admin')` guard** (add to `src/auth/dal.ts`;
  see "Out of scope" note — RBAC *enforcement* is out of scope, but this item needs the
  guard to exist; implement `requireRole` minimally here as a dependency, applied ONLY to these
  two admin actions).
- Add minimal admin UI pages (`/dashboard/admin/users` or reuse security page) with
  ownership/role checks server-side (never trust client role).

**Acceptance:**
- [ ] Admin can force-logout a single user (all their sessions + refresh families revoked).
- [ ] Admin can force-logout all users (breach button) with a confirm guard.
- [ ] Both are server-side role-gated; non-admins get rejected.
- [ ] Every revocation is audited.

---

### Item 11 — Backup / recovery codes  (P2)
**Problem:** MFA is email-based; if a user loses email access they can be locked out, and
there's no out-of-band recovery.

**Fix (incremental):**
- Add `recovery_codes` collection + schema (`src/database/schemas/recovery-codes.schema.ts`)
  + index (unique `userId` + hashed codes). Store **hashed** codes (SHA-256, like
  `hashToken`) — never plaintext.
- On MFA enable (or a dedicated "generate recovery codes" action), create N (e.g. 10)
  single-use codes; show them once; store hashes.
- Accept a recovery code as an alternative to the email 2FA code in `TwoFactorService.verify`
  (hash-submitted → lookup in `recovery_codes`, redeem on use, audit).
- Add UI to view/regenerate codes (server-side, session-gated) and to consume one at the
  2FA step.

**Acceptance:**
- [ ] Recovery codes are generated, shown once, stored only as hashes.
- [ ] A recovery code satisfies the 2FA step and is single-use (redeemed/invalidated on use).
- [ ] Regeneration invalidates prior codes.
- [ ] No plaintext code is ever persisted or logged.

---

## 3. Cross-cutting rules (apply to all items)

- **Preserve the DB-session + refresh-rotation design.** Do not introduce in-memory sessions.
- **Keep `server-only` / `'use server'` / HttpOnly+SameSite cookie semantics** unless a fix
  explicitly changes them (Item 4 introduces one new scoped cookie — keep HttpOnly+Secure+SameSite).
- **All security-critical writes must be best-effort + audited** (use `AuditLogRepository.log`).
- **Never block a user request on email/alert/geo latency** — timeouts + fallback to null.
- **Fail closed on secrets/config** (prod boot errors) but fail **open safely** on optional
  external lookups (geo, webhook).
- **Add tests** for each item's acceptance criteria (extend `tests/auth.spec.ts` or add unit tests
  for services/repositories). The repo uses Playwright (`pnpm test:e2e`) + `tsx` for scripts.
- **Run `pnpm lint` and `pnpm build`** (build runs `security-scan.js` first) before declaring done.
- **Update `docs/` / `README.md`** only where behavior changes (e.g., new env vars, new cookie).

## 4. Suggested implementation order (dependencies)

1. Item 2 (pepper boot-guard) — config, independent.
2. Item 5 (trusted-proxy) — config + `getClientIp`, independent, unblocks safe rate-limiting.
3. Item 1 + Item 8 (refresh extends `expiresAt` + `lastActivityAt`) — same code region.
4. Item 3 (atomic rotation + lockout) — `refreshTokenRepo` + `userRepo` changes.
5. Item 6 (alerting) — depends on nothing but pairs with Item 9.
6. Item 4 (server device token) — cookie/lib changes; coordinate with `createSession` block-check.
7. Item 9 (geo + step-up) — depends on Item 6 being observable; flag-gated.
8. Item 10 (admin logout) — needs minimal `requireRole` guard.
9. Item 7 (secrets docs) — doc only, can land anytime.
10. Item 11 (recovery codes) — independent, P2.

## 5. Definition of Done

- [ ] All 11 items implemented with their acceptance checks met.
- [ ] `pnpm lint` clean, `pnpm build` succeeds (security scan passes).
- [ ] New/updated tests pass (`pnpm test:e2e` + any unit tests).
- [ ] No public API / route behavior regresses for the normal password + Google login flows.
- [ ] Docs/README updated for new env vars, cookies, or admin capabilities.
- [ ] No secrets checked into git; `.env` remains gitignored.


---

### Item 7 — Centralized secrets manager  (M-7)
**Problem:** `.env` holds a live Atlas URI (with creds) + `ADMIN_SEED_PASSWORD` in plaintext
on dev machines. Works locally but is fragile for shared/staging/prod.

**Fix (config-only, no code rewrite):**
- Update `.env.example` and `README` to state that `SESSION_SECRET`, `ARGON2_SECRET`,
  `MONGODB_URI`, `GOOGLE_CLIENT_SECRET`, `EMAIL_PASSWORD`, and `ADMIN_SEED_PASSWORD` MUST
  come from a secret manager / platform env (Vercel/Netlify env, Vault, AWS Secrets Manager)
  in all non-local environments.
- Ensure `next.config.ts`/`netlify.toml` deployment pipeline injects these; do not commit real values.
- Add a note: rotate the currently-shipped-looking MongoDB credential and the default
  `SESSION_SECRET` before any real deployment (the default is already blocklisted in `env.ts`).
- (No schema change needed; `getEnv()` already reads `process.env`.)

**Acceptance:**
- [ ] `.env.example` documents secret-manager sourcing for all sensitive vars.
- [ ] No real secret is required in a checked-in file to boot locally (dev placeholders OK).
- [ ] Deployment docs reference platform env injection.

---

### Item 8 — Reconcile idle timeout with refresh activity  (M-2)
**Problem:** `session.lastActivityAt` (drives the 30-min idle check in `validateSession`) is
only advanced by `validateSession` (server-component page loads), NOT by background
`/api/auth/refresh` polls. A client that only background-refreshes can be idle-expired
despite being "active," and idle detection doesn't reflect true client activity.

**Fix:** In `rotateRefreshToken` success path, also set `lastActivityAt = new Date(now)`
(the same write as Item 1 is fine — combine). This makes a background-refreshing client
count as active. Keep the FIX-C2 absolute cap intact.

**Acceptance:**
- [ ] A session that only refreshes in the background is not idle-expired before `IDLE_TIMEOUT_MS`.
- [ ] A truly idle session (no page load AND no refresh) is still expired at `IDLE_TIMEOUT_MS`.
- [ ] Combined with Item 1 in one atomic-ish session update.

---

### Item 9 — Geo-IP + step-up auth  (P1)
**Problem:** `SessionService.coarseLocation` only tags loopback/private vs `'unknown-remote'`
(no real country/city). New-device / suspicious-location detection is **alert-only** and never
steps up.

**Fix (incremental, no rewrite):**
- Add a small geo-IP lookup (pluggable: start with a free offline DB like `@maxmind/geoip2`/
  `geoip-lite`, or a `GEOIP_LOOKUP_URL` env). Replace `coarseLocation` to return real
  `country`/`region`/`city` (or null if lookup unavailable — fail open to `null`, never throw).
  Keep `unknown-remote` semantics only as a fallback.
- Promote `auth.login.suspicious` from alert-only to **step-up**: when a login is from a new
  device OR a country change, after `createSession` set a short-lived signed pending cookie
  (`cws_stepup_pending`, same HMAC pattern as `cws_2fa_pending`) and return an
  `mfa_required`-like state so the user must complete email 2FA before the session is usable.
  Reuse the existing `TwoFactorService` + `verify2faAction` machinery (extend the pending
  cookie consumer to also handle step-up).
- Keep it **non-blocking by default behind a flag** (`STEP_UP_ENABLED` env, default false for
  rollout safety) so it can be enabled after monitoring (Item 6) is live.

**Acceptance:**
- [ ] `coarseLocation` returns real geo when a lookup is configured; falls back to null gracefully.
- [ ] New-device / country-change can trigger step-up 2FA when enabled.
- [ ] Step-up is flag-gated and never breaks the normal login path when disabled.
- [ ] No external geo call blocks request latency on failure (timeout + fallback).


---

### Item 4 — Server-issued device token  (H-6)
**Problem:** `cws_device` is a **client-generated** UUID v4. Device block/trust is bypassable
by clearing the cookie (repo comment at device.repository.ts:188 explicitly acknowledges this).
The client UUID may stay as a *correlation hint* but must not be the security boundary.

**Fix (incremental, no rewrite):**
- Mint a **server-generated** device record id at first login (`devices._id` already exists).
- Issue a new HttpOnly, Secure(prod), SameSite=lax, path-scoped cookie (e.g. `cws_device_token`)
  containing an HMAC-signed server device record id + optional rotation nonce — analogous to
  `signSessionId` in `src/auth/crypto/token.ts`.
- `getDeviceId()` should prefer verifying/presenting this server token; fall back to the existing
  client UUID only for correlation (never for authz).
- `createSession` block-check (`DeviceRepository.isValidDeviceId` + `findByIdForUser` +
  `device.blocked`) must use the **server** device id, so clearing cookies yields a *new*
  server device that has no block — but the block now lives on the server record keyed by
  the signed token, not the client string. (Acceptable v1: block still best-effort, but now
  tied to a server-issued token rather than a client-chosen UUID.)
- Keep `isValidUuidV4` for backward-compat correlation; do not authorize on it alone.

**Acceptance:**
- [ ] Device identity is derived from a server-issued, HMAC-verified cookie, not a client string.
- [ ] Blocking a device prevents reuse of that device's sessions without admin intervention.
- [ ] Existing `cws_device` UUID handling still works as correlation during rollout.

---

### Item 5 — Trusted-proxy IP config required/verified in prod  (C-2)
**Problem:** Without `TRUSTED_PROXY_IP_HEADER`, `getClientIp()` returns `'0.0.0.0'` for all
prod traffic → `countRecentByIp('0.0.0.0', 15m) >= 20` becomes a **global shared bucket**,
so ~20 cross-user failures in 15 min lock out *all* logins (availability DoS).

**Fix:**
- Option A (preferred): in `src/auth/config/env.ts`, **require** `TRUSTED_PROXY_IP_HEADER`
  to be set in production (fail-closed at boot, like `SESSION_SECRET`/`ARGON2_SECRET`), and
  document that the edge must strip inbound `x-forwarded-for` before appending its own hop.
- Option B (if A rejected): in `getClientIp()` / `checkRateLimit`, **skip the IP dimension**
  entirely when the resolved IP equals the untrusted sentinel `'0.0.0.0'` (rely on
  per-identifier + lockout checks). Do NOT key a counter on a constant.
- Either way: keep the sentinel as fail-closed (not spoofable).

**Acceptance:**
- [ ] Prod boot fails if trusted-proxy header is unset (Option A) — OR — IP rate-limit is
  bypassed when IP is the sentinel and per-identifier limit still applies (Option B).
- [ ] A burst of failures from distinct *real* IPs no longer triggers a platform-wide lockout.
- [ ] Unit test: 30 failed logins across 30 different emails do not block the 31st real user.

---

### Item 6 — Monitoring + alerting on security events  (M-7)
**Problem:** Audit logs are written to Mongo but nobody watches them; `observability.ts`
only `console.*`s slow queries/errors. No alerts on reuse, failure spikes, or suspicious logins.

**Fix (incremental):**
- Extend `setupDatabaseObservability` (or add a sibling `setupSecurityAlerting`) to accept
  callbacks that forward key `AuditLog` actions to an external sink: `auth.refresh.reuse_detected`,
  `auth.login.failure` (aggregate spikes), `auth.login.suspicious`, `auth.oauth.failed`,
  `auth.password.reset.success` anomalies. Make the sink pluggable: default = structured
  `console.warn` JSON (keeps current behavior) but allow `process.env.SECURITY_WEBHOOK_URL`
  (or a `SecurityAlertSink` interface) to POST a compact event.
- Add a thin `src/auth/services/alerting.service.ts` (or function) that the existing
  `alertReuseDetected` / `alertNewDevice` / `alertSuspiciousLocation` calls route through, so
  alerts are centralized and testable. Keep calls best-effort (never block the request).
- Wire the sink in `src/database/client.ts` (or wherever the `MongoClient` is created,
  next to `setupDatabaseObservability`).

**Acceptance:**
- [ ] Security events emit to a configurable sink (webhook) when configured, else console.
- [ ] Reuse-detection and suspicious-login events are forwarded, not just stored.
- [ ] Failure spikes can be aggregated; a smoke test confirms an event reaches the sink.


---

## 2. Per-item implementation guidance + acceptance criteria

### Item 1 — Refresh must extend `session.expiresAt`  (C-1)
**Problem:** `rotateRefreshToken` re-mints the `cws_session` cookie but never advances
`session.expiresAt` (set once at `createSession` to `now + 15m`). `validateSession`
therefore revokes the session ~15 min after login regardless of active refreshing → defeats
the whole refresh design and the FIX-C2 absolute-cap intent.

**Fix:** In `rotateRefreshToken` (session.service.ts, success branch ≈ lines 300–331),
after creating the new refresh token, update the session doc:
```
expiresAt = new Date(now + env.ACCESS_SESSION_TTL_MS)
lastActivityAt = new Date(now)
```
Mirror the FIX-C2 absolute check which already uses `lastFullAuthAt + REFRESH_TOKEN_TTL_MS`
(7d) — that 7-day hard cap stays; the 15-min `expiresAt` is what must be *rolling*.

**Acceptance:**
- [ ] A session that refreshes before `expiresAt` survives past the original 15-min mark.
- [ ] `expiresAt` never exceeds `lastFullAuthAt + REFRESH_TOKEN_TTL_MS`.
- [ ] Idle/`accountSecurityVersion`/revoked checks still function.
- [ ] New test: create session → advance clock 16 min → call rotate → `validateSession` returns non-null.

---

### Item 2 — Enable + require `ARGON2_SECRET` in prod  (H-2)
**Problem:** `.env` omits `ARGON2_SECRET`, so password hashes are stored without the
application pepper. `env.ts` only warns (does not fail) when it's missing in prod.

**Fix:**
- In `src/auth/config/env.ts`, change the `ARGON2_SECRET` handling so that, in
  `process.env.NODE_ENV === 'production'`, a missing/short (<16 char) pepper **throws at boot**
  (same fail-closed pattern as `SESSION_SECRET`, lines 57–76).
- Set a real `ARGON2_SECRET` (≥16 chars) in `.env.example` guidance and ensure deployment
  injects it. Document the migration caveat: enabling the pepper later requires re-hashing
  existing passwords (existing hashes were computed without it and will fail `verify`).

**Acceptance:**
- [ ] `getEnv()` throws in production when `ARGON2_SECRET` absent or <16 chars.
- [ ] Dev still boots without it (warning only).
- [ ] A password set with the pepper verifies; document the re-hash migration note in `.env.example`.

---

### Item 3 — Atomic refresh rotation + lockout counter  (H-4 / H-5)
**Problem A (H-4):** `rotateRefreshToken` reads `existing`, then later `markReplaced(old)` —
two concurrent requests presenting the same still-valid token can both pass and mint two
live refresh tokens (split chain).

**Fix A:** Use an atomic conditional update for the old token:
```
const res = await refreshTokenRepo.atomicReplace(oldHash, newDoc._id, now);
if (!res.matched) { /* someone else already rotated → treat as reuse */ }
```
i.e. `findOneAndUpdate({ _id: existing._id, replacedBy: null }, { $set: { revoked:true, replacedBy:newId, revokedAt:now, revokedReason:'rotated' } })`
and only continue minting the new token + session cookie if `matchedCount === 1`.

**Problem B (H-5):** Login failure does `$inc` then a separate `findById` reload to compare
threshold — concurrent failures can miscount, delaying lockout.

**Fix B:** Make the failed-count increment atomic and derive the lockout decision from the
post-update value:
```
const r = await userRepo.incrementFailedAndGet(userId);
if (r.failedLoginAttempts >= THRESHOLD) { lock + throw }
```
Implement `incrementFailedAndGet` using `findOneAndUpdate({_id, failedLoginAttempts:{$lt:THRESHOLD}},{$inc:{failedLoginAttempts:1}})` (return `value`/upserted). Keep `recordFailure` audit logging.

**Acceptance:**
- [ ] Concurrent identical refresh presentations cannot produce two live tokens (reuse path triggers on the loser).
- [ ] Exactly 5 failures (concurrent OK) → 6th attempt is rejected with lockout.
- [ ] No lost-update under a load test of simultaneous logins/refreshes.


---

## 1. Scope — implement these 11 items ONLY

1. **Fix: refresh extends `session.expiresAt`**  (launch-blocker C-1)
2. **Enable + require `ARGON2_SECRET` in prod**  (H-2)
3. **Atomic refresh rotation + lockout counter**  (H-4 / H-5)
4. **Server-issued device token**  (H-6)
5. **Trusted-proxy IP config required/verified in prod**  (C-2)
6. **Monitoring + alerting on security events**  (M-7)
7. **Centralized secrets manager**  (M-7)
8. **Reconcile idle timeout with refresh activity**  (M-2)
9. **Geo-IP + step-up auth**  (P1)
10. **Admin forced / global logout**  (P1)
11. **Backup / recovery codes**  (P2)

> Out of scope (do NOT implement): RBAC enforcement (`requireRole` beyond what
> Item 10 needs), OAuth→2FA `loginMethod` correction, password reset for OAuth-only
> users, RBAC UI. Those are tracked separately.


### Key files & current behavior (anchor snippets)

- **Session create + validate + rotate:** `src/auth/services/session.service.ts`
    - `createSession` (≈ lines 33–137): sets `expiresAt = new Date(now + ACCESS_SESSION_TTL_MS)`
      (15 min) and `lastFullAuthAt = now`. Never re-touches `expiresAt` later.
    - `validateSession` (≈ lines 143–199): treats `session.expiresAt <= now` as absolute
      expiry and revokes. Also checks `user.status !== 'active'`, idle timeout
      (`lastActivityAt + IDLE_TIMEOUT_MS`), and account-security-version mismatch.
    - `rotateRefreshToken` (≈ lines 221–332): on success mints a new `cws_session` cookie
      + new refresh token and chains it, but does **NOT** extend `session.expiresAt` or
      `lastActivityAt` on the session doc.
    - The FIX-C2 block (≈ lines 258–297) re-checks idle/absolute expiry **at refresh time**
      using `lastFullAuthAt + REFRESH_TOKEN_TTL_MS` (7d).
    - Concurrent-session cap (5) at ≈ line 383 (`enforceConcurrentSessionLimit`) uses batched
      `revokeManyByIds` + `revokeBySessions`.
    - `coarseLocation(ip)` (≈ lines 438–456) only classifies loopback/private vs
      `'unknown-remote'` — no real geo-IP.
- **`src/auth/lib/request.ts` `getClientIp()` (≈ lines 25–63):** if `TRUSTED_PROXY_IP_HEADER` is
  unset in prod → returns sentinel `'0.0.0.0'` for all traffic (after a one-time warn).
  In dev uses `x-forwarded-for` first hop.
- **`src/auth/services/rate-limit.service.ts` `checkRateLimit` (lines 18–48):** calls
  `loginAttemptRepo.getActiveLockout(identifier)`, `countRecentByIp(ip, 15m) >= 20`,
  `countRecentByIdentifier(identifier, 15m) >= 10`.
- **`src/auth/services/login.service.ts` (≈ lines 113–134):** failure path does
  `$inc failedLoginAttempts`, then `findById` reload, then compares to `LOCKOUT_THRESHOLD=5`.
- **`src/auth/config/env.ts`:** `SESSION_SECRET` fail-closed in prod (lines 57–76).
  `ARGON2_SECRET` only **warns** if missing in prod (lines 78–86). `TRUSTED_PROXY_IP_HEADER`
  optional string.
- **`src/auth/crypto/password.ts`:** applies pepper only `if (env.ARGON2_SECRET)`.
- **`src/auth/services/oauth.service.ts`:** links by `providerAccountId` (`sub`) only (good —
  prevents verified-email account takeover). `verifyIdToken` re-fetches Google JWKS on every call.
- **`src/auth/repositories/audit-log.repository.ts`:** `log()` best-effort, retried, never throws.
- **`src/database/observability.ts`:** has `setupDatabaseObservability(client, { onSlowQuery, onCommandError })`
  hooks that currently only `emitLog` to console. No external sink wired.
- **`src/auth/lib/device.ts` `ensureDeviceId`/`getDeviceId`:** client-generated UUID v4,
  validated by `isValidUuidV4`. Cookie `cws_device`, 1-year, HttpOnly, SameSite=lax.
- **`src/auth/actions/device.ts`:** trust/block/rename actions, all ownership-checked via
  `resolveOwnedDevice` (requires `requireActiveSession` + `DeviceRepository.findByIdForUser`).
- **`src/auth/actions/session.ts`:** `revokeSessionAction` (self, ownership checked),
  `revokeAllOtherSessionsAction` (keeps current). There is **no admin-global logout** action.
- **`src/auth/dal.ts`:** `getAuthSession`, `requireAuth`, `requireActiveSession`.
  **No `requireRole` exists** — `/dashboard/*` is gated only by valid active session.
- **`src/auth/services/password.service.ts`:** `changePassword` requires `currentPassword`;
  `resetPassword(token, newPassword)`; `isExpired`; `rejectIfReused`. Policy via
  `PasswordPolicyRepository.getActivePolicy()` defaulting to `DEFAULT_PASSWORD_POLICY`.
- **`src/app/api/chat/route.ts` & `contact/route.ts`:** chat requires auth; contact is public.
- **Schemas:** `src/database/schemas/users.schema.ts` (`role` enum admin/member/viewer, `roleId`),
  `sessions.schema.ts`, `refresh-tokens.schema.ts`, `devices.schema.ts` (fingerprint hashes,
  `trusted`/`blocked`), `audit-logs.schema.ts` (90-day TTL), `user-emails.schema.ts`,
  `login-attempts.schema.ts`. Indexes under `src/database/indexes/*`.
- **Security headers:** `next.config.ts` (X-Frame-Options, nosniff, Referrer-Policy,
  Permissions-Policy, HSTS, COOP) + per-request nonce CSP in `src/proxy.ts`. Keep these.
