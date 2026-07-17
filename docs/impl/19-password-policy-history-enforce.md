# Implementation Prompt 19 — Wire Password Policy + History Enforcement

> Self-contained. Runnable in isolation.

## Context

Internal Next.js (App Router) admin app. Auth under `src/auth/`. Password change/reset lives in `src/auth/services/password.service.ts` and the actions `src/auth/actions/change-password.ts`, `src/auth/actions/password-reset.ts`.

Schemas already exist for policy + history:
- `src/database/schemas/password-policies.schema.ts` (e.g. minLength, complexity, history count, expiry).
- `src/database/schemas/password-history.schema.ts` (hashes of previous passwords).
- Repos: `src/auth/repositories/password-policy.repository.ts`, `src/auth/repositories/password-history.repository.ts`.

The audit noted the **enforcement** of these in the change/reset flow is unconfirmed — the password service may only verify the new password matches confirmation and updates it, without (a) checking against the active policy, or (b) rejecting reuse of recent passwords via `password-history`.

Password hashing uses Argon2id with a pepper (`src/auth/crypto/password.ts` → `hashPassword`/`verifyPassword`). History must store the **same peppered Argon2 hash** (never plaintext).

**Runtime constraints:** No Redis. Serverless/edge (NOT a VPS). Limited fixed users.

## Goal

Ensure the password change/reset flow enforces (1) the active password policy and (2) password-history reuse prevention. Do not downgrade the existing Argon2id+pepper hashing.

## Implementation

1. In `password.service.ts` (or a new `evaluateNewPassword(userId, newPassword)` used by both actions):
   - Load the active policy via `passwordPolicyRepo.getActive()` (create a sane default if none exists: minLength 12, require upper/lower/digit, historySize 5, no expiry).
   - Validate `newPassword` against policy (length, character classes). Return a generic error message (do not enumerate exactly which rule failed beyond "does not meet requirements").
   - Load the user's last `historySize` password hashes via `passwordHistoryRepo.getRecent(userId, historySize)` and verify `newPassword` does **not** match any (`verifyPassword(newPassword, oldHash)`). Reject on match.
   - On success: `hashPassword(newPassword)`, persist the new hash to `password-history` (cap stored entries to `historySize`), and update the user's `password` + `security.lastPasswordChangeAt` + clear `force_password_change` if set.

2. Wire `evaluateNewPassword` into `changePasswordAction` and `passwordReset` submit path **before** the write. Keep the existing "old password required for change-password" check.

3. Add/adjust a unit test: setting a password equal to a recent one is rejected; a policy-violating password (too short) is rejected; a fresh valid password succeeds and is recorded in history.

## Acceptance criteria

1. Password change/reset rejects passwords violating the active policy.
2. Password change/reset rejects reuse of any of the last N (policy.historySize) passwords.
3. History stores peppered Argon2 hashes only; no plaintext anywhere.
4. Successful change records the new hash in history (capped at policy size).
5. `force_password_change` flag is cleared on success (if your model uses it).
6. No Redis; uses existing repos/services.

## Notes

- If `password-policies` has no row seeded, create a default-active policy on first read (or via `scripts/db-seed.ts`).
- Keep the change-password action requiring the current password (don't weaken authn).
- Do not change the Argon2 params here.
