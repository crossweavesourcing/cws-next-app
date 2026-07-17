# Item 4 — Server-issued device token  (H-6)

> Self-contained prompt. Works in a fresh session with no prior context.

## START HERE
Files: `src/auth/lib/device.ts` (`ensureDeviceId`/`getDeviceId`), `src/auth/services/session.service.ts` (`createSession` block-check ≈ 43–48), `src/auth/repositories/device.repository.ts` (`isValidDeviceId`), `src/auth/crypto/token.ts` (`signSessionId`).
Read `createSession` (≈ 33–137) and the device block-check (≈ 43–48) first.

## PROJECT CONTEXT (read first)
- Next.js 16 App Router; `src/proxy.ts` = renamed middleware (optimistic guard only).
- TS strict, MongoDB driver (NO Mongoose). Internal app, no public registration.
- Session model (PRESERVE): DB-backed `sessions`; `cws_session` = `<id>.<HMAC_SHA256(id, SESSION_SECRET)>`. `cws_refresh` opaque; only SHA-256 hash in `refresh_tokens`. Rotate + reuse-detect.
- Layers: `src/auth/dal.ts` → `src/auth/services/*` → `src/auth/repositories/*`. Cookies in `src/auth/lib/*`.
- Audit via `AuditLogRepository.log`. Email via `sendMail`.

## CURRENT BEHAVIOR (the gap)
- `cws_device` is a **client-generated UUID v4** (validated by `isValidUuidV4`). Cookie 1-year, HttpOnly, SameSite=lax.
- Device block/trust is therefore bypassable by clearing the cookie. `device.repository.ts` (≈ 188) explicitly documents this as best-effort.
- The client UUID may stay as a *correlation hint* but must NOT be the security boundary.

## FIX (incremental, no rewrite)
- Mint a **server-generated** device record id at first login (`devices._id` already exists).
- Issue a new HttpOnly, Secure(prod), SameSite=lax, path-scoped cookie (e.g. `cws_device_token`) containing an HMAC-signed server device record id + optional rotation nonce — reuse `signSessionId` in `src/auth/crypto/token.ts`.
- `getDeviceId()` should prefer verifying/presenting this server token; fall back to the existing client UUID only for correlation (never for authz).
- `createSession` block-check (`DeviceRepository.isValidDeviceId` + `findByIdForUser` + `device.blocked`) must use the **server** device id, so clearing cookies yields a *new* server device that has no block — but the block now lives on the server record keyed by the signed token, not the client string. (Acceptable v1: block still best-effort, but tied to a server-issued token rather than a client-chosen UUID.)
- Keep `isValidUuidV4` for backward-compat correlation; do NOT authorize on it alone.

## ACCEPTANCE
- [ ] Device identity derived from a server-issued, HMAC-verified cookie, not a client string.
- [ ] Blocking a device prevents reuse of that device's sessions without admin intervention.
- [ ] Existing `cws_device` UUID handling still works as correlation during rollout.

## END HERE
Verification: `pnpm lint` + `pnpm build`. Add a test asserting a blocked device cannot silently re-login after clearing cookies. Keep cookie semantics HttpOnly+Secure+SameSite. Do not change session/refresh token shapes.
