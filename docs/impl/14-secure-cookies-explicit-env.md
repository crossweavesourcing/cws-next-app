# Implementation Prompt 14 — Explicit `SECURE_COOKIES` Env (fail-closed)

> Self-contained. Runnable in isolation.

## Context

Internal Next.js (App Router) admin app, auth under `src/auth/`. All auth cookies are set across many files with `secure: process.env.NODE_ENV === 'production'`:
- `src/auth/lib/cookies.ts` (`setAuthCookies`, `clearAuthCookies`)
- `src/auth/actions/login.ts`, `verify-2fa.ts`, `change-password.ts`, `session.ts`, `admin.ts`, `recovery-codes.ts`
- `src/app/api/auth/refresh/route.ts`, `src/app/api/auth/logout/route.ts`, `src/app/api/auth/google/callback/route.ts`

Cookies set: `cws_session`, `cws_refresh`, `cws_device_token`, `cws_2fa_pending`, `cws_pw_pending`, `cws_stepup_pending`, `cws_oauth_state`.

**Risk:** If production is ever served over plain HTTP (misconfigured proxy, or a non-prod alias reporting `NODE_ENV=production`), `secure` becomes true-but-transported-cleartext OR (worse in staging) stays false and cookies leak over HTTP. There is no explicit, fail-closed cookie-security control.

**Runtime constraints:** No Redis. Serverless/edge platform (NOT a VPS). Limited fixed users.

## Goal

Add an explicit `SECURE_COOKIES` env var. In production it MUST be `'true'` (fail-closed). In non-production default to `'false'` so local dev works. Centralize the decision in one helper so every call site is consistent.

## Implementation

1. In `src/auth/config/env.ts`, extend `envSchema`:
   ```ts
   SECURE_COOKIES: z
     .enum(['true', 'false'])
     .optional()
     .transform((v) => v === 'true'),
   ```
   In `validateSecurityConfig`, under `if (isProd)`, if `SECURE_COOKIES` is not `true`, **throw** a clear fatal error (mirror the SESSION_SECRET guard). Keep dev warn-only if unset (default false).

2. Add a single source-of-truth helper in `src/auth/lib/cookies.ts`:
   ```ts
   import { getEnv } from '../config/env';
   export function isSecureCookies(): boolean {
     return getEnv().SECURE_COOKIES ?? (process.env.NODE_ENV === 'production');
   }
   ```
   (The `?? production` fallback preserves existing behavior where the var is unset, but prod now fails closed if explicitly wrong.)

3. Replace every `secure: process.env.NODE_ENV === 'production'` occurrence with `secure: isSecureCookies()` (import from the cookies lib where already imported, else from `../lib/cookies`).

4. Document `SECURE_COOKIES=true` in `.env.example` / deployment docs for prod.

## Acceptance criteria

1. `SECURE_COOKIES` is a validated env var; prod boot throws if it is not `true`.
2. A single helper `isSecureCookies()` drives every auth cookie's `secure` flag.
3. No remaining `process.env.NODE_ENV === 'production'` literal for cookie `secure`.
4. Local dev (no var) still sets `secure=false` (works over HTTP).
5. Add/adjust a test asserting `isSecureCookies()` returns true when env set, false otherwise.
6. No Redis, no shared state.

## Notes

- Do NOT change `SameSite` here (separate concern). Keep `sameSite: 'lax'` unless another task changes it.
- Ensure `APP_URL` is `https://` in prod; pair with HSTS at the edge.
