# Implementation Prompt 15 — Rate Limit 2FA / Password-Reset / OAuth Callback

> Self-contained. Runnable in isolation.

## Context

Internal Next.js (App Router) admin app. Auth under `src/auth/`. State-changing sub-flows currently lack explicit rate limiting:
- `src/auth/actions/verify-2fa.ts` → `verify2faAction` (email 2FA code check, 6-digit), `resend2faAction` (sends a new code).
- `src/auth/actions/password-reset.ts` → request/reset actions (verify content locally).
- `src/app/api/auth/google/callback/route.ts` → OAuth token exchange (per-IP abuse).

`src/auth/services/rate-limit.service.ts` + `src/auth/repositories/login-attempt.repository.ts` already implement **per-IP** and **per-identifier** windowed counters backed by the `login_attempts` collection (MongoDB). That machinery is reusable — it is already DB-backed (no Redis), which fits the serverless multi-instance runtime.

The `RateLimitService.checkRateLimit(ip, identifier)` throws `RateLimitError` when exceeded. The `login_attempts` repo has `countRecentByIp`, `countRecentByIdentifier`, `getActiveLockout`, and a method to record attempts.

**Runtime constraints:** No Redis. Serverless/edge (NOT a VPS), ephemeral instances. Limited fixed users.

## Goal

Apply rate limiting to the 2FA verify/resend, password-reset request/submit, and OAuth callback paths using the **existing MongoDB-backed** rate-limit repository (no new infra).

## Implementation

1. Add repository helpers as needed in `login-attempt.repository.ts` (or reuse existing counters): a generic `countRecent(collection filter, windowMs)` keyed by `identifier` and `ipAddress`. If `countRecentByIdentifier`/`countRecentByIp` already exist, reuse them.

2. In `verify2faAction`:
   - Before `twoFactor.verify`, call `rateLimitService.checkRateLimit(ip, `2fa:${userId}`)`.
   - On failure, throw/return a generic error. Track the attempt in `login_attempts` (identifier `2fa:${userId}`, ip).
   - After 5 failed verifies for a pending session, invalidate the pending cookie + force re-login (do not just loop).
   - In `resend2faAction`, throttle: allow at most 1 resend per 30s and max 5 per 10min per `userId` (use the same counters).

3. In password-reset actions: apply `checkRateLimit(ip, 'pwreset:'+email)` on request; on submit verify, apply per-attempt limits too.

4. In `src/app/api/auth/google/callback/route.ts`: wrap the handler so that before exchanging the code it calls `checkRateLimit(ipAddress, 'oauth:google')` (per-IP window, e.g. 20/15min). On exceed, redirect to login with `?error=oauth_rate_limited`.

5. Keep all counters in MongoDB (do not introduce module-level maps). Use `getClientIp()` from `src/auth/lib/request.ts` as the IP source (already handles trusted-proxy).

## Acceptance criteria

1. `verify2faAction` blocks after N (5) failed code attempts and forces re-auth.
2. `resend2faAction` is throttled (1/30s, max 5/10min).
3. Password-reset request + submit are rate-limited per email + IP.
4. OAuth callback is rate-limited per IP.
5. Limits are enforced via MongoDB-backed counters (existing repo), correct across serverless instances. No Redis.
6. A test fires >N 2FA attempts and asserts the N+1th is rejected.

## Notes

- Reuse `RateLimitError` and the existing window constants; add new ones only if needed.
- Keep error messages generic (do not disclose remaining attempts to the client beyond a generic "too many attempts").
