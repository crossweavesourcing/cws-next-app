# Item 8 — Reconcile idle timeout with refresh activity  (M-2)

> Self-contained prompt. Works in a fresh session with no prior context.

## START HERE
File: `src/auth/services/session.service.ts` → `rotateRefreshToken` success path (≈ 300–331).
Read `createSession` (≈ 33–137) and `validateSession` (≈ 143–199) for the expiry/idle math.
(Do this together with Item 1 — they edit the SAME write.)

## PROJECT CONTEXT (read first)
- Next.js 16 App Router; `src/proxy.ts` = renamed middleware (optimistic guard only).
- TS strict, MongoDB driver (NO Mongoose). Internal app, no public registration.
- Session model (PRESERVE): DB-backed `sessions`; `cws_session` = `<id>.<HMAC_SHA256(id, SESSION_SECRET)>`. `cws_refresh` opaque; only SHA-256 hash in `refresh_tokens`. Rotate + reuse-detect.
- Env TTLs: `ACCESS_SESSION_TTL_MS` (15m), `IDLE_TIMEOUT_MS` (30m), `REFRESH_TOKEN_TTL_MS` (7d).

## CURRENT BEHAVIOR (the gap)
- `session.lastActivityAt` drives the 30-min idle check in `validateSession`.
- It is advanced ONLY by `validateSession` (server-component page loads), NOT by background `/api/auth/refresh` polls.
- So a client that only background-refreshes can be idle-expired despite being "active"; idle detection doesn't reflect true client activity.

## FIX
In `rotateRefreshToken` success path, also set on the session doc (combine with Item 1's `expiresAt` write):
```
lastActivityAt = new Date(now)
```
This makes a background-refreshing client count as active. KEEP the FIX-C2 absolute cap
(`lastFullAuthAt + REFRESH_TOKEN_TTL_MS`, 7d) intact.

## ACCEPTANCE
- [ ] A session that only refreshes in the background is NOT idle-expired before `IDLE_TIMEOUT_MS`.
- [ ] A truly idle session (no page load AND no refresh) is still expired at `IDLE_TIMEOUT_MS`.
- [ ] Combined with Item 1 in one atomic-ish session update.

## END HERE
Verification: `pnpm lint` + `pnpm build`. Add/extend a test: idle session with only refresh polls survives past 30 min; fully idle session still expires. No change to cookie/session shapes.
