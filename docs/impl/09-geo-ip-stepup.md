# Item 9 — Geo-IP + step-up auth  (P1)

> Self-contained prompt. Works in a fresh session with no prior context.

## START HERE
File A: `src/auth/services/session.service.ts` → `coarseLocation(ip)` (≈ 438–456) + the device register/alert calls in `createSession` (≈ 56–78).
File B: `src/auth/services/device.service.ts` (`registerLogin` alert-only path ≈ 50–89).
File C: `src/auth/actions/verify-2fa.ts` (pending-cookie consumer) + `src/app/api/auth/google/callback/route.ts` (mfa_required handling).
Read `src/auth/services/two-factor.service.ts` + `src/auth/crypto/token.ts` (`signSessionId`) first.

## PROJECT CONTEXT (read first)
- Next.js 16 App Router; `src/proxy.ts` = renamed middleware (optimistic guard only).
- TS strict, MongoDB driver (NO Mongoose). Internal app, no public registration.
- Session model (PRESERVE): DB-backed `sessions`. `cws_session` signed HMAC. `cws_refresh` opaque; only SHA-256 hash in `refresh_tokens`.
- Layers: `src/auth/dal.ts` → `src/auth/services/*` → `src/auth/repositories/*`. Cookies in `src/auth/lib/*`.
- 2FA is email-based (`TwoFactorService`); pending state uses a signed `cws_2fa_pending` cookie (HMAC, `signSessionId`).
- Audit via `AuditLogRepository.log`. Email via `sendMail`.

## CURRENT BEHAVIOR (the gap)
- `coarseLocation` only tags loopback/private vs `'unknown-remote'` — NO real geo.
- New-device / suspicious-location detection is **alert-only** (logs + emails) and never steps up.

## FIX (incremental, no rewrite)
- Add a small geo-IP lookup (pluggable: start with a free offline DB like `@maxmind/geoip2`/
  `geoip-lite`, or a `GEOIP_LOOKUP_URL` env). Replace `coarseLocation` to return real
  `country`/`region`/`city` (or null if lookup unavailable — FAIL OPEN to `null`, never throw).
  Keep `unknown-remote` only as a fallback.
- Promote `auth.login.suspicious` from alert-only to **step-up**: when a login is from a new
  device OR a country change, after `createSession` set a short-lived signed pending cookie
  (`cws_stepup_pending`, same HMAC pattern as `cws_2fa_pending`) and return an
  `mfa_required`-like state so the user must complete email 2FA before the session is usable.
  Reuse the existing `TwoFactorService` + `verify2faAction` machinery (extend the pending
  cookie consumer to also handle step-up).
- Keep it **non-blocking by default behind a flag** (`STEP_UP_ENABLED` env, default false) so it
  can be enabled after monitoring (Item 6) is live.

## ACCEPTANCE
- [ ] `coarseLocation` returns real geo when a lookup is configured; falls back to null gracefully.
- [ ] New-device / country-change can trigger step-up 2FA when enabled.
- [ ] Step-up is flag-gated and never breaks the normal login path when disabled.
- [ ] No external geo call blocks request latency on failure (timeout + fallback).

## END HERE
Verification: `pnpm lint` + `pnpm build`. Add a unit test for `coarseLocation` fallback + step-up trigger flag. Keep cookie semantics HttpOnly+Secure+SameSite. Never block the request on geo latency.
