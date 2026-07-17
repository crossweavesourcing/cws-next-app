# Item 2 — Enable + require `ARGON2_SECRET` in prod  (H-2)

> Self-contained prompt. Works in a fresh session with no prior context.

## START HERE
File: `src/auth/config/env.ts`
Function: the `validateSecurityConfig` block that handles `ARGON2_SECRET` (≈ lines 78–86, currently only `console.warn` when missing in prod).
Also read `src/auth/crypto/password.ts` (≈ 1–33) to confirm pepper is applied only `if (env.ARGON2_SECRET)`.

## PROJECT CONTEXT (read first)
- Next.js 16 App Router; `src/proxy.ts` = renamed middleware (optimistic guard only).
- TS strict, MongoDB driver (NO Mongoose). Internal app, no public registration.
- **Session model (PRESERVE):** DB-backed sessions; `cws_session` = `<id>.<HMAC_SHA256(id, SESSION_SECRET)>`. `cws_refresh` opaque; only SHA-256 hash in `refresh_tokens`. Rotate + reuse-detect.
- Password: `argon2` argon2id (memCost 65536, timeCost 3, par 1). Pepper = `ARGON2_SECRET` (optional app-side secret added to the hash).
- Env: `src/auth/config/env.ts` `getEnv()` (Zod-validated singleton). `SESSION_SECRET` already **fails closed** in prod (throws) at lines 57–76.
- `.env` is gitignored; it currently ships WITHOUT `ARGON2_SECRET`. `.env.example` documents vars.

## CURRENT BEHAVIOR (the gap)
- `password.ts` applies the pepper only `if (env.ARGON2_SECRET)`.
- `env.ts` only **warns** (does not throw) when `ARGON2_SECRET` is missing in production.
- Therefore password hashes are stored WITHOUT the application pepper → a stolen DB is immediately crackable without the secret.

## FIX
Make the missing/short pepper a **boot failure in production**, mirroring the existing `SESSION_SECRET` fail-closed guard:
- In `validateSecurityConfig`, when `process.env.NODE_ENV === 'production'` and (`!env.ARGON2_SECRET || env.ARGON2_SECRET.length < 16`), `throw new Error(...)` instructing to set a ≥16-char `ARGON2_SECRET` via the secret manager.
- Keep dev behavior as warn-only (no throw) so local boot still works.
- Update `.env.example` to include a real `ARGON2_SECRET` placeholder guidance AND a migration note: enabling the pepper AFTER users exist requires re-hashing existing passwords (old hashes were computed without it and will fail `verifyPassword`).

## ACCEPTANCE
- [ ] `getEnv()` throws in production when `ARGON2_SECRET` is absent or <16 chars.
- [ ] Dev (`NODE_ENV !== 'production'`) still boots without it (warning only).
- [ ] A password hashed with the pepper verifies correctly.
- [ ] `.env.example` documents the pepper + the re-hash migration caveat.

## END HERE
Verification: run `pnpm lint` + `pnpm build`. Manually confirm prod boot path (simulate by setting `NODE_ENV=production` with/without the var). No schema or other auth-code changes needed. Do not commit real secrets; `.env` stays gitignored.
