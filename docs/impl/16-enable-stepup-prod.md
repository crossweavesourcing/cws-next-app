# Implementation Prompt 16 — Enable Step-Up MFA in Production

> Self-contained. Runnable in isolation.

## Context

Internal Next.js (App Router) admin app. Auth under `src/auth/`. New-device and country-change detection already exists:
- `src/auth/services/device.service.ts` (`registerLogin`) returns `isNew` / `countryChanged`.
- `src/auth/services/session.service.ts` (`evaluateStepUp`) decides step-up.

The step-up decision is gated by `STEP_UP_ENABLED` in `src/auth/config/env.ts` (Zod bool, **defaults to `false`**). When false, `evaluateStepUp` always returns false — detection only alerts (email), never blocks. When true, a new device OR a resolvable country change causes the freshly created session to be immediately revoked and the user is sent to `/dashboard/verify-2fa` with a signed `cws_stepup_pending` cookie (email 2FA). The callback/action wiring for `step_up` already exists in `google/callback/route.ts`, `login.ts`, `verify-2fa.ts`.

Geo-IP resolution lives in `src/auth/lib/geoip.ts` (remote `GEOIP_LOOKUP_URL` or offline `geoip-lite`, fail-open to null). A `null` new-country is intentionally NOT treated as a change (avoids false positives).

**Runtime constraints:** No Redis. Serverless/edge (NOT a VPS). Limited fixed users (admin/seed provisioned).

## Goal

Make step-up enforcement the production default (opt-out, not opt-in), while remaining fail-open and safe: only trigger on a *positive* signal (new device, or resolvable country change), exactly as the current `evaluateStepUp` logic already requires.

## Implementation

1. In `src/auth/config/env.ts`:
   - Default `STEP_UP_ENABLED` to `true` (it is internal + fixed users; a weekly re-verify on new device/country is acceptable). Keep it overridable to `false` for调试/emergencies.
   - Strengthen `validateSecurityConfig`: in production, if `STEP_UP_ENABLED` is explicitly `false`, emit a loud `console.warn` (not throw — it is a deliberate relaxation) noting step-up is disabled. If `GEOIP_LOOKUP_URL` is unset AND step-up is on, warn that country-change step-up will be limited to new-device only (since geo is fail-open).

2. No change to `evaluateStepUp` logic (keep the `isNewDevice || (countryChanged && newCountry)` rule). Confirm it still returns false on any failure (fail open).

3. Verify the full `step_up` path end-to-end:
   - `login.ts` / `google/callback/route.ts` set `cws_stepup_pending` and redirect to `/dashboard/verify-2fa`.
   - `verify2faAction` accepts both `cws_2fa_pending` and `cws_stepup_pending` (already does) and issues the real session.
   - On step-up, the device should be marked trusted/known so subsequent logins from the same server device token (`cws_device_token`) are not re-stepped every time (confirm `device.service.registerLogin` flips `isNew` to false after the device record exists; verify no per-login step-up loop).

4. Add a short admin/security note (doc comment or README) explaining step-up is on by default and how to disable in an emergency.

## Acceptance criteria

1. With `STEP_UP_ENABLED` unset in production, step-up is active (new device / resolvable country change → email 2FA required).
2. No step-up is triggered on a known device from a known country (no false-positive lockouts).
3. `step_up` flow completes: pending cookie → verify-2fa → real session issued; no infinite re-step loop on the same device.
4. Fail-open preserved: if geo lookup or step-up evaluation throws, login proceeds without step-up (logged).
5. No Redis; uses existing session/device/geo plumbing.

## Notes

- Do not enable country-change step-up until `GEOIP_LOOKUP_URL` is configured in prod (the warn guard enforces this expectation).
- Keep `cws_stepup_pending` maxAge short (already 5 min).
