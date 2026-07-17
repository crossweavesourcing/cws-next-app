# Item 5 — Trusted-proxy IP config required/verified in prod  (C-2, launch-blocker)

> Self-contained prompt. Works in a fresh session with no prior context.

## START HERE
File: `src/auth/lib/request.ts` → `getClientIp()` (≈ 25–63).
Also read `src/auth/config/env.ts` (≈ 1–37, the Zod schema + `validateSecurityConfig` ≈ 44–87, esp. the `SESSION_SECRET` fail-closed guard ≈ 57–76).
Also read `src/auth/services/rate-limit.service.ts` → `checkRateLimit` (≈ 18–48).

## PROJECT CONTEXT (read first)
- Next.js 16 App Router; `src/proxy.ts` = renamed middleware.
- TS strict, MongoDB driver (NO Mongoose). Internal app, no public registration.
- Session model (PRESERVE): DB-backed; `cws_session` = `<id>.<HMAC>`. `cws_refresh` opaque; only SHA-256 hash in `refresh_tokens`.
- Env: `src/auth/config/env.ts` `getEnv()` (Zod singleton). `process.env.NODE_ENV==='production'` gates `Secure` cookies.
- `getClientIp()` is the single IP source used by login, OAuth callback, 2FA, refresh, and rate limiting.

## CURRENT BEHAVIOR (the DoS)
- Without `TRUSTED_PROXY_IP_HEADER` set, `getClientIp()` returns the sentinel `'0.0.0.0'` for ALL prod traffic (after a one-time console.warn).
- `checkRateLimit` then runs `countRecentByIp('0.0.0.0', 15m) >= 20` → a **global shared bucket**. ~20 cross-user failures in 15 min lock out *all* logins platform-wide.
- In dev, `x-forwarded-for` first hop is used (acceptable locally).

## FIX (choose A or B; A preferred)
**Option A (preferred):** In `env.ts` `validateSecurityConfig`, **require** `TRUSTED_PROXY_IP_HEADER` to be set in production — fail-closed (throw) exactly like the `SESSION_SECRET` guard (≈ 57–76). Document that the edge must strip inbound `x-forwarded-for` before appending its own hop.
**Option B (if A rejected):** In `getClientIp()` / `checkRateLimit`, **skip the IP dimension entirely** when the resolved IP equals the untrusted sentinel `'0.0.0.0'`; rely on per-identifier + lockout checks. Do NOT key a counter on a constant.
- Either way: keep the sentinel as fail-closed (never spoofable).

## ACCEPTANCE
- [ ] Prod boot fails if trusted-proxy header unset (Option A) — OR — IP rate-limit is bypassed when IP is the sentinel and per-identifier limit still applies (Option B).
- [ ] A burst of failures from distinct *real* IPs no longer triggers a platform-wide lockout.
- [ ] Unit test: 30 failed logins across 30 different emails do NOT block the 31st real user.

## END HERE
Verification: `pnpm lint` + `pnpm build`. Add the unit test above (extend `tests/` or a service unit test). No change to cookie/session/refresh shapes. `.env`/`TRUSTED_PROXY_IP_HEADER` stays config-only.
