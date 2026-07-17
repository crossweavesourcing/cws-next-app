# Implementation Prompt 12 — Apply `withCsrfGuard` to ALL mutating auth Server Actions

> This prompt is self-contained and can be executed in isolation in a fresh session.

## Context (read before starting)

This is an internal Next.js (App Router) admin application. Authentication lives under `src/auth/`. State-changing auth logic is implemented as **Server Actions** (`'use server'`) in `src/auth/actions/*.ts`, plus a few Route Handlers under `src/app/api/auth/*`.

A uniform CSRF guard helper already exists:

- `src/auth/lib/request.ts` exports `assertSameOrigin()` — throws `CsrfError` when the `Origin` header is present and does not equal `APP_URL`.
- `src/auth/lib/csrf.ts` exports `withCsrfGuard(action)` — a generic wrapper that calls `assertSameOrigin()` and maps `CsrfError` to a neutral `{ error: 'Request blocked.' }`.

Currently only the JSON API routes (`/api/auth/refresh`, `/api/auth/logout`) call `assertSameOrigin()` directly. Server Actions rely solely on Next.js built-in Server Action CSRF + `SameSite=Lax` cookies. `Lax` still permits cookies on top-level cross-site POST navigations, so logout / session-revocation Server Actions are exploitable via cross-site forms.

**Runtime constraints (IMPORTANT):**
- No Redis. No external cache.
- App runs on a serverless/edge platform (NOT a VPS) — multiple ephemeral instances, no shared process memory.
- Users are limited and fixed (admin/seed provisioned only).

## Goal

Apply `withCsrfGuard` uniformly to **every** mutating auth Server Action so origin checking is explicit, visible, and testable — not dependent on per-action discipline or framework internals.

## Files to modify (wrap the exported action)

- `src/auth/actions/login.ts` → `loginAction` (login form submit creates a session)
- `src/auth/actions/verify-2fa.ts` → `verify2faAction`, `resend2faAction`
- `src/auth/actions/change-password.ts` → `changePasswordAction`
- `src/auth/actions/session.ts` → `revokeSessionAction`, `revokeAllOtherSessionsAction`
- `src/auth/actions/admin.ts` → `adminRevokeUserSessionsAction`, `adminRevokeAllSessionsAction`
- `src/auth/actions/recovery-codes.ts` → `generateRecoveryCodesAction`, `regenerateRecoveryCodesAction`
- `src/auth/actions/password-reset.ts` → all exported mutating actions
- `src/auth/actions/device.ts` → all exported mutating actions (block/trust device, etc.)
- `src/auth/actions/verify-totp.ts` → `verifyTotpAction`
- Any other `'use server'` action under `src/auth/actions/` that mutates auth/session/device state.

Pattern (keep the existing `useActionState` signature intact):

```ts
import { withCsrfGuard } from '../lib/csrf';

async function _loginAction(prev, formData) { /* existing body */ }
export const loginAction = withCsrfGuard(_loginAction);
```

For actions that return `void` (e.g. `resend2faAction`), the wrapper still returns `{ error: 'Request blocked.' }` for a cross-origin call; callers must ignore a returned object on void actions, OR change those actions to return a typed result. Prefer keeping the signature and having callers ignore the object.

## Acceptance criteria

1. Every mutating auth Server Action is wrapped with `withCsrfGuard`.
2. A cross-origin POST (with `Origin: https://evil.example`) to any of these actions returns a neutral error and performs NO state change (verified manually + a unit/integration test).
3. Same-origin requests continue to work exactly as before (no regression in login, 2FA, change-password, revoke, admin revoke, recovery codes).
4. Add at least one test (Vitest) that imports an action wrapper and asserts `CsrfError` is caught and mapped to `{ error: 'Request blocked.' }`.
5. No Redis, no in-memory shared state introduced.

## Notes / non-goals

- Do NOT change cookie `SameSite` values in this task (separate task).
- Do NOT touch the `withCsrfGuard` implementation unless you find a bug — if you do, keep it generic and origin-based.
- Keep `assertSameOrigin()` as the single source of truth for the origin check.
