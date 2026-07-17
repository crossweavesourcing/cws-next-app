# Item 1 — Refresh must extend `session.expiresAt`  (C-1, launch-blocker)

> Self-contained prompt. Works in a fresh session with no prior context.

## START HERE
File: `src/auth/services/session.service.ts`
Function: `rotateRefreshToken` success branch (≈ lines 300–331, the block after `const session = await this.sessionRepo.findById(existing.sessionId);`).
Begin by reading `createSession` (≈ 33–137) and `validateSession` (≈ 143–199) so you understand the expiry math.

## PROJECT CONTEXT (read first)
- Next.js 16 App Router; `src/proxy.ts` = renamed middleware (optimistic guard only — full auth deferred to DAL).
- TS strict, MongoDB driver (NO Mongoose). Internal app, no public registration.
- **Session model (PRESERVE, do not rewrite):** DB-backed sessions in `sessions`. `cws_session` cookie = `<sessionId>.<HMAC_SHA256(sessionId, SESSION_SECRET)>`. `cws_refresh` = opaque random token; ONLY its SHA-256 hash is stored in `refresh_tokens`. Refresh tokens rotate; reuse detection revokes the whole session family.
- Password: argon2id (memoryCost 65536, timeCost 3, parallelism 1) + optional pepper `ARGON2_SECRET`.
- Layers: `src/auth/dal.ts` (guards) → `src/auth/services/*` → `src/auth/repositories/*`. Cookies in `src/auth/lib/*`. Audit via `AuditLogRepository.log({...})`. Email via `sendMail({to,subject,text})`.
- Env: `src/auth/config/env.ts` `getEnv()` (Zod). `process.env.NODE_ENV==='production'` gates `Secure` cookies. TTLs: `ACCESS_SESSION_TTL_MS` (15m), `IDLE_TIMEOUT_MS` (30m), `REFRESH_TOKEN_TTL_MS` (7d).

## CURRENT BEHAVIOR (the bug)
- `createSession` sets `expiresAt = new Date(now + ACCESS_SESSION_TTL_MS)` (15 min) and `lastFullAuthAt = now`. It NEVER re-touches `expiresAt` later.
- `rotateRefreshToken` (on success) mints a new `cws_session` cookie + new refresh token and chains it, but does **NOT** extend `session.expiresAt` or `lastActivityAt` on the session document.
- `validateSession` treats `session.expiresAt <= now` as absolute expiry and revokes the session.
- Result: every session dies ~15 min after the initial login even if the client keeps refreshing → the entire refresh/rotation design is defeated.

## FIX
In `rotateRefreshToken`, within the success path (after you create the new refresh token doc and before/with the cookie issuance), update the session document so the access session is *rolling*:
```
expiresAt    = new Date(now + env.ACCESS_SESSION_TTL_MS)
lastActivityAt = new Date(now)
```
Keep the FIX-C2 absolute cap intact: `validateSession`/`rotateRefreshToken` already refuse when `lastFullAuthAt + REFRESH_TOKEN_TTL_MS` (7d) has elapsed — do NOT change that. Only the 15-min `expiresAt` should become rolling. Combine this write with the existing session update in the rotation flow where practical.

## ACCEPTANCE
- [ ] A session that refreshes before `expiresAt` survives past the original 15-min mark.
- [ ] `expiresAt` never exceeds `lastFullAuthAt + REFRESH_TOKEN_TTL_MS` (7d hard cap preserved).
- [ ] Idle-timeout, account-security-version, and revoked checks in `validateSession` still function.
- [ ] New test: create session → advance clock 16 min → call `rotateRefreshToken` → `validateSession` returns non-null.

## END HERE
Verification: run `pnpm lint`, `pnpm build` (runs `security-scan.js`), and add/extend the session/refresh test (e.g. in `tests/auth.spec.ts` or a unit test for `SessionService`). Confirm no regression to normal password + Google login. Do not touch other auth files.
