# Implementation Plan 22 — Authentication Audit Remediation

> Based on `docs/auth-security-audit-report-2026-07-18.md`.
> Scope is remediation only. Do not redesign the auth system.

## Context

The authentication system already has strong foundations:

- Argon2id password hashing with production pepper guard.
- Opaque HMAC-signed session cookies.
- Hashed refresh tokens with atomic rotation and reuse detection.
- Google OAuth with PKCE, `state`, `nonce`, verified JWKS, and explicit account linking.
- HttpOnly cookies with production `Secure` enforcement.
- CSRF origin checks on auth actions and route handlers.

The audit found the remaining risk concentrated in secondary auth flows:

1. Verification tokens are redeemed with a non-atomic read-then-write.
2. TOTP login lacks failed-attempt throttling, audit parity, and timestep replay protection.
3. Refresh-token device binding is skipped when the device cookie is absent.
4. WebAuthn production RP ID/origin are hard-coded placeholders.
5. Route-handler CSRF allows requests with neither `Origin` nor `Referer`.
6. Google token exchange failures are generic rather than typed provider outage errors.

## Workstream Tracker

| ID | Priority | Remediation | Dependency | Status |
| --- | --- | --- | --- | --- |
| AUTH-22-01 | High | Atomic verification-token redemption | None | Complete |
| AUTH-22-02 | High | TOTP throttling, auditing, and replay prevention | AUTH-22-01 recommended first | Complete |
| AUTH-22-03 | Medium | Enforce refresh-token device binding | None | Complete |
| AUTH-22-04 | Medium | Configure and validate WebAuthn RP settings | Production environment values | Complete |
| AUTH-22-05 | Medium | Require same-origin evidence on auth route handlers | Browser compatibility validation | Complete |
| AUTH-22-06 | Medium | Type Google token-exchange provider failures | None | Complete |

Update each status to `In progress`, `Blocked`, or `Complete` as work proceeds. A phase is complete only after its focused tests and acceptance criteria pass.

## Remediation Principles

- Keep existing architecture and data model shape unless a small field/index is necessary.
- Prefer atomic MongoDB operations over application-level sequencing for one-time tokens.
- Keep user-facing errors generic; log internal detail only to audit/alerting.
- Preserve serverless safety: no in-memory correctness dependency, no Redis requirement.
- Add focused unit tests for each fix before considering it complete.
- Do not weaken password, session, OAuth, cookie, or CSRF checks while patching.

## Phase 1 — Atomic Verification Token Redemption

### Goal

Make password reset tokens and email 2FA codes truly single-use under concurrency.

### Files

- `src/auth/repositories/verification-token.repository.ts`
- `src/auth/services/password.service.ts`
- `src/auth/services/two-factor.service.ts`
- Add/update unit tests near existing auth tests.

### Implementation

1. Replace `VerificationTokenRepository.redeem()` read-then-write with one conditional `findOneAndUpdate`.
2. Match only:
   - `tokenHash`
   - `used: false`
   - `expiresAt: { $gt: now }`
3. Set:
   - `used: true`
   - `usedAt: now`
4. Return the pre-update or post-update document consistently based on MongoDB driver behavior in this repo.
5. Keep the public method contract unchanged: return `{ userId, payload } | null`.

### Tests

- Two parallel `redeem()` calls for the same valid token: exactly one succeeds.
- Expired token returns `null`.
- Already-used token returns `null`.
- Password reset still succeeds once.
- Email 2FA code still succeeds once.

### Acceptance Criteria

- A token cannot be redeemed twice, even under parallel requests.
- No caller needs to perform its own one-time-token locking.
- Existing password reset and email 2FA behavior remains intact.

## Phase 2 — TOTP Login Hardening

### Goal

Bring TOTP login to parity with email 2FA for brute-force resistance, audit logging, and replay protection.

### Files

- `src/auth/actions/verify-totp.ts`
- `src/auth/services/mfa.service.ts`
- `src/auth/repositories/mfa.repository.ts`
- `src/database/schemas/totp-credentials.schema.ts`
- `src/types/auth/mfa.types.ts`
- Tests for TOTP action/service behavior.

### Implementation

1. Add Mongo-backed failed-attempt limiting to `verifyTotpActionImpl`, mirroring `verify-2fa.ts`:
   - identifier: `totp:<userId>`
   - max failures: 5
   - window: 15 minutes
   - clear pending cookies after limit is reached.
2. Record every TOTP verification attempt in `LoginAttemptRepository`.
3. Add audit log events:
   - `auth.mfa.totp.verified`
   - `auth.mfa.totp.failed`
4. Add replay prevention:
   - Store last accepted TOTP timestep/counter on the TOTP credential document.
   - Reject a code if it maps to a timestep already accepted for that user.
   - Update the stored timestep atomically on success.
5. Keep pending-cookie verification unchanged.
6. Keep user-facing errors generic.

### Tests

- Invalid TOTP attempts are counted.
- After 5 failures in the window, pending cookies are cleared and verification is blocked.
- Valid TOTP creates a session and clears pending cookies.
- Reusing the same valid TOTP timestep is rejected.
- Success/failure audit logging is called.

### Acceptance Criteria

- TOTP cannot be brute-forced indefinitely from a pending MFA session.
- A valid TOTP code cannot be replayed within the same timestep.
- TOTP has audit parity with email 2FA.

## Phase 3 — Enforce Refresh Device Binding

### Goal

Require possession of the server-issued device token when refreshing a session that is already device-bound.

### Files

- `src/auth/services/session.service.ts`
- `src/app/api/auth/refresh/route.ts`
- `src/auth/lib/device.ts`
- Session service unit tests.

### Implementation

1. In `rotateRefreshToken()`, if `session.deviceId` exists:
   - require `clientDeviceCookieValue`.
   - require `verifyServerDeviceToken(clientDeviceCookieValue)` to return an ObjectId.
   - require the resolved ObjectId to equal `session.deviceId`.
2. On missing/invalid/mismatched device token:
   - mark refresh token reuse/theft signal where appropriate.
   - revoke the session.
   - revoke refresh family.
   - alert via existing reuse/theft alert path.
   - return `null`.
3. For legacy sessions with `session.deviceId === null`, keep current behavior.

### Tests

- Bound session + missing device cookie rejects refresh.
- Bound session + invalid device cookie rejects refresh.
- Bound session + mismatched device cookie rejects refresh and revokes family.
- Bound session + matching device cookie rotates successfully.
- Legacy unbound session remains refreshable.

### Acceptance Criteria

- A stolen refresh token alone is insufficient for a device-bound session.
- Existing unbound sessions are not broken abruptly.

## Phase 4 — WebAuthn Environment Configuration

### Goal

Remove production placeholder WebAuthn RP settings and fail closed on misconfiguration.

### Files

- `src/auth/config/env.ts`
- `src/auth/services/mfa.service.ts`
- `.env.example`
- `README.md` or auth setup docs if present.
- Env/unit tests.

### Implementation

1. Add env variables:
   - `WEBAUTHN_RP_ID`
   - `WEBAUTHN_ORIGIN`
2. In development, default to:
   - RP ID: `localhost`
   - origin: `http://localhost:3000`
3. In production, require explicit values or derive safely from `APP_URL`.
4. Validate:
   - `WEBAUTHN_ORIGIN` is HTTPS in production.
   - `WEBAUTHN_RP_ID` matches the host/domain expected by the origin.
5. Replace module-level hard-coded constants in `mfa.service.ts` with config-backed helpers.

### Tests

- Development defaults work.
- Production without WebAuthn config fails closed if WebAuthn is enabled/available.
- Production placeholder `your-domain.com` is impossible.
- Registration/authentication options use configured RP ID/origin.

### Acceptance Criteria

- No production WebAuthn path depends on a placeholder domain.
- Misconfigured WebAuthn fails at boot/config validation, not during user login.

## Phase 5 — Route Handler CSRF Strict Mode

### Goal

Make state-changing route handlers require an explicit same-origin signal.

### Files

- `src/auth/lib/request.ts`
- `src/app/api/auth/refresh/route.ts`
- `src/app/api/auth/logout/route.ts`
- `src/app/api/auth/google/callback/route.ts` only if applicable; OAuth callback is a top-level navigation and should not be blindly converted.
- CSRF unit tests.

### Implementation

1. Keep current `assertSameOrigin()` for Server Actions if needed.
2. Add a stricter helper, for example:
   - `assertSameOriginStrict()`
3. Strict behavior:
   - valid matching `Origin` passes.
   - if no `Origin`, valid matching `Referer` passes.
   - if both are missing, reject.
   - `Origin: null` rejects.
4. Apply strict helper to direct state-changing route handlers:
   - refresh
   - logout
5. Do not apply strict helper to OAuth callback unless verified safe with real browser redirect behavior.

### Tests

- Route handler guard rejects missing `Origin` and missing `Referer`.
- Matching `Origin` passes.
- Matching `Referer` passes when `Origin` is absent.
- Mismatched `Origin` rejects.
- `Origin: null` rejects.

### Acceptance Criteria

- Refresh/logout cannot be invoked without a same-origin signal.
- Server Action compatibility is preserved.
- OAuth callback behavior is not broken.

## Phase 6 — Typed Google Token Exchange Outages

### Goal

Make Google token endpoint failures behave like JWKS outages: clear, safe, typed, and non-crashing.

### Files

- `src/auth/services/oauth.service.ts`
- `src/auth/errors/auth-errors.ts`
- `src/auth/services/oauth.service.unit.test.ts`

### Implementation

1. Wrap `exchangeCode()` network fetch in `try/catch`.
2. On network failure, throw `OAuthProviderUnavailableError`.
3. On HTTP 5xx, throw `OAuthProviderUnavailableError`.
4. On malformed/unparseable JSON, throw `OAuthProviderUnavailableError`.
5. For OAuth-invalid responses that represent bad user/code input, keep a generic OAuth failure, but do not expose provider details to the user.
6. Keep `id_token` required.

### Tests

- Network failure throws `OAuthProviderUnavailableError`.
- HTTP 503 throws `OAuthProviderUnavailableError`.
- Malformed JSON throws `OAuthProviderUnavailableError`.
- Missing `id_token` fails safe.
- Existing callback error path still redirects to the login error page.

### Acceptance Criteria

- Transient Google token endpoint outage does not crash the callback route.
- No path accepts login without a verified ID token.
- User-facing message remains clear and generic.

## Suggested Execution Order

1. Phase 1: atomic verification token redemption.
2. Phase 2: TOTP hardening.
3. Phase 3: refresh device binding enforcement.
4. Phase 6: OAuth token exchange typed failures.
5. Phase 4: WebAuthn config.
6. Phase 5: strict route-handler CSRF.

Reasoning:

- Phase 1 and Phase 2 address the highest authentication bypass/brute-force risks.
- Phase 3 reduces refresh-token theft blast radius.
- Phase 6 is low-risk consistency hardening.
- Phase 4 may need deployment config decisions.
- Phase 5 needs careful compatibility testing with browser/framework behavior.

## Regression Test Checklist

Run focused tests after each phase, then run the full unit suite after all phases:

```bash
npm run test:unit -- src/auth/repositories/verification-token.repository.unit.test.ts
npm run test:unit -- src/auth/actions/verify-2fa.unit.test.ts
npm run test:unit -- src/auth/actions/verify-totp.unit.test.ts
npm run test:unit -- src/auth/services/session.service.unit.test.ts
npm run test:unit -- src/auth/services/oauth.service.unit.test.ts
npm run test:unit
npx eslint src/auth
```

If a listed unit test file does not exist yet, create the narrowest test file needed for that phase.

## Production Rollout Notes

- Deploy Phase 1 and Phase 2 together if possible; both harden second-factor and reset-token handling.
- Monitor audit logs for increased MFA failures after Phase 2.
- For Phase 3, confirm existing active sessions with `deviceId: null` are expected and temporary.
- For Phase 4, set WebAuthn env vars before deployment.
- For Phase 5, validate refresh/logout behavior in real browsers before production rollout.

## Release Gates

Before production deployment:

- Configure and validate `WEBAUTHN_RP_ID` and `WEBAUTHN_ORIGIN` in the target environment.
- Confirm legacy sessions without `deviceId` are intentionally supported during the transition.
- Verify password reset, email 2FA, TOTP, refresh, logout, Google OAuth, and WebAuthn in a staging deployment.
- Confirm new audit events are ingested without exposing tokens, TOTP values, secrets, or provider payloads.
- Confirm alerting distinguishes invalid user input from provider unavailability and refresh-token theft signals.
- Require the focused unit tests, full unit suite, lint, and production build to pass.

Rollback should be phase-specific. Do not roll back database fields or indexes while deployed code may still read or write them; prefer reverting behavior first and cleaning schema changes in a later controlled deployment.

## Done Definition

This remediation workstream is complete when:

- All six audit findings have code-level fixes.
- Each fix has focused tests.
- Full unit suite passes.
- ESLint passes on touched auth files.
- No auth flow accepts credentials, OAuth tokens, refresh tokens, reset tokens, or MFA codes without the intended verification.
- No new shared cache or VPS-only dependency is introduced.
