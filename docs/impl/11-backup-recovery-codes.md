# Item 11 — Backup / recovery codes  (P2)

> Self-contained prompt. Works in a fresh session with no prior context.

## START HERE
File A (new): `src/database/schemas/recovery-codes.schema.ts` + `src/database/indexes/recovery-codes.indexes.ts` (mirror other schema/index files; register in `src/database/schemas/index.ts` + `src/database/indexes/index.ts`).
File B: `src/auth/services/two-factor.service.ts` → `verify` (accept a recovery code as alt to email 2FA).
File C: new action `src/auth/actions/recovery-codes.ts` (`'use server'`: generate / view / regenerate).
Read `src/auth/crypto/token.ts` (`hashToken`), `src/auth/repositories/verification-token.repository.ts` (hash-store pattern), and an existing schema like `src/database/schemas/otp-codes.schema.ts` for the style.

## PROJECT CONTEXT (read first)
- Next.js 16 App Router; `src/proxy.ts` = renamed middleware.
- TS strict, MongoDB driver (NO Mongoose). Internal app, no public registration.
- Session model (PRESERVE): DB-backed `sessions`. `cws_session` signed HMAC. `cws_refresh` opaque; only SHA-256 hash in `refresh_tokens`.
- Layers: `src/auth/dal.ts` → `src/auth/services/*` → `src/auth/repositories/*`. Cookies in `src/auth/lib/*`.
- **MFA is email-based** (`TwoFactorService`); codes are 6-digit, stored as SHA-256 hash via `hashToken`. Pending state uses signed `cws_2fa_pending` cookie (`signSessionId`).
- Schemas are MongoDB `$jsonSchema` validators (strict). Index files export `IndexDescription[]`.
- Audit via `AuditLogRepository.log`. Email via `sendMail`.

## CURRENT BEHAVIOR (the gap)
- MFA is email-only. If a user loses email access they are locked out — no out-of-band recovery.

## FIX (incremental)
- Add `recovery_codes` collection + schema (`src/database/schemas/recovery-codes.schema.ts`) + index (unique `userId` + hashed codes). Store **hashed** codes (SHA-256, like `hashToken`) — NEVER plaintext.
- On MFA enable (or a dedicated "generate recovery codes" action), create N (e.g. 10) single-use codes; **show them once**; store hashes.
- Accept a recovery code as an alternative to the email 2FA code in `TwoFactorService.verify` (hash-submitted → lookup in `recovery_codes`, redeem on use, audit).
- Add UI to view/regenerate codes (server-side, session-gated) and to consume one at the 2FA step.

## ACCEPTANCE
- [ ] Recovery codes are generated, shown once, stored ONLY as hashes.
- [ ] A recovery code satisfies the 2FA step and is single-use (redeemed/invalidated on use).
- [ ] Regeneration invalidates prior codes.
- [ ] No plaintext code is ever persisted or logged.

## END HERE
Verification: `pnpm lint` + `pnpm build` (runs `security-scan.js`; confirm schema validates). Add a test: generate → consume one → it is single-use; regenerate invalidates old. Keep cookie semantics. Never log plaintext codes.
