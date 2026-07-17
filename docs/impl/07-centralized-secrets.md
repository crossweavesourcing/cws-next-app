# Item 7 — Centralized secrets manager (M-7)

> Config-only change. No code rewrite. Verified against `src/auth/config/env.ts`.

## Goal

In every non-local environment (staging, preview, production) the six sensitive
variables MUST be sourced from a secret manager / platform env and NEVER committed
or pasted into a checked-in file. Dev boot must continue to work from non-secret
placeholders only.

Sensitive variables (all six are required-from-manager in non-local envs):

- `MONGODB_URI` — embeds the Atlas DB username + password
- `SESSION_SECRET` — HMAC-signs `cws_session` / `cws_2fa_pending` / `cws_pw_pending` cookies
- `ARGON2_SECRET` — password-hash pepper (DB-leak protection)
- `GOOGLE_CLIENT_SECRET` — OAuth client secret
- `EMAIL_PASSWORD` — Gmail SMTP app password
- `ADMIN_SEED_PASSWORD` — initial admin account password

## Changes made

### `.env.example` (docs only — already in place)
- Header block states the secret-manager policy for the six vars and that they
  must never be committed.
- Every sensitive var carries an inline comment: why it is secret, that it MUST
  come from the platform secret store in non-local envs, and that the committed
  value is a non-secret dev placeholder.
- Rotation note: the default `SESSION_SECRET` (and the previously-shipped static
  value) are BLOCKLISTED in `src/auth/config/env.ts`; generate a unique value per
  environment with `openssl rand -hex 32`. Rotate the MongoDB Atlas DB credential.

### `README.md` (already in place)
- "Deployment & Secrets Management" section with a rotate + inject runbook.
- Sensitive-variables table with the why-per-var rationale.
- Platform env injection notes for **Netlify** and **Vercel** (plus Vault /
  AWS Secrets Manager as generic sources).
- "Rotate before any real deployment" subsection referencing the blocklisted
  `SESSION_SECRET` default and the Atlas credential rotation.

### `next.config.ts` (already in place)
- Top comment block: intentionally contains NO secret values; the six vars are
  injected by the deploy platform and read from `process.env` via `getEnv()`;
  never commit real values; rotate the shipped MongoDB credential and
  `SESSION_SECRET` default before any real deployment.

### `netlify.toml` (already in place)
- Comment block enumerates the same six secret vars, states real values MUST
  NEVER be placed in `netlify.toml`, and points to the README runbook.
- Build command (`pnpm install --frozen-lockfile && pnpm build`) exposes platform
  env vars to both build and server functions.

## Why no code change is needed

`src/auth/config/env.ts` `getEnv()` already reads everything from `process.env`.
The deploy pipeline simply injects the values at build/runtime. The file also
already implements the fail-closed boot guards that make this safe:

- `DEFAULT_SESSION_SECRETS` blocklist (includes `default_session_secret_must_be_thirty_two_characters_long`
  and the previously-shipped static value) → app refuses to boot in production.
- Fail-closed pre-flight in production: throws if `MONGODB_URI`, `SESSION_SECRET`,
  `ARGON2_SECRET`, or `ADMIN_SEED_PASSWORD` are missing (and `GOOGLE_CLIENT_SECRET`
  / `EMAIL_PASSWORD` when their feature is enabled). Only the missing variable NAME
  is printed — no secret value is ever logged.
- `ARGON2_SECRET` must be ≥16 chars in production; `TRUSTED_PROXY_IP_HEADER` must
  be set in production (collapse-of-rate-limit DoS guard). Dev is warn-only for all.

## Verification

- `.gitignore` already ignores `.env*` and opts `.env.example` back in. Confirmed
  `.env` is untracked (`git ls-files --error-unmatch .env` → not known to git) and
  only `.env.example` is tracked. No real secret is committed.
- `pnpm lint`: the four target files introduce **no** lint errors. The only lint
  errors in the repo are 8 pre-existing `@typescript-eslint/no-explicit-any`
  violations in unrelated files
  (`src/app/(admin)/dashboard/verify-2fa/VerifyWebAuthnForm.tsx`,
  `src/auth/repositories/user.repository.ts`,
  `src/types/auth/system-setting.types.ts`). They are out of scope for this
  config-only change.
- `pnpm build` runs `node security-scan.js && next build`. The secrets change is
  documentation/config only and adds no scannable code; no real secret is present
  in any checked-in file.

## Acceptance

- [x] `.env.example` documents secret-manager sourcing for all sensitive vars.
- [x] No real secret is required in a checked-in file to boot locally (dev placeholders OK).
- [x] Deployment docs reference platform env injection (Netlify + Vercel, plus Vault / AWS Secrets Manager).

## Remaining follow-ups (out of scope, not blocking)
- Fix the 8 pre-existing `no-explicit-any` lint errors so `pnpm lint` / `pnpm build`
  pass cleanly. These are unrelated to secrets management.
- Rotate the live Atlas DB credential and generate a fresh, unique `SESSION_SECRET`
  before any real deployment (the default is already blocklisted).
