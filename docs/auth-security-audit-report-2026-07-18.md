# Authentication Security Audit Report

Date: 2026-07-18  
Scope: Next.js App Router authentication, authorization, session, JWT/cookie, OAuth, MFA, password reset, rate limiting, audit logging, and related MongoDB persistence.

## Executive Summary

The authentication system has a strong foundation and does not need a rewrite. Password login, session creation, refresh-token rotation, Google OAuth, cookie security, and production secret validation already include several production-grade controls.

The main remaining risks are concentrated in secondary authentication flows and race conditions:

- Single-use verification tokens are redeemed with a non-atomic read-then-write pattern.
- TOTP verification lacks the same brute-force and audit controls as email 2FA.
- Refresh-token device binding can be bypassed when the device cookie is missing.
- WebAuthn production RP ID/origin are hard-coded placeholders.
- CSRF behavior for route handlers should be stricter when both `Origin` and `Referer` are absent.

## Findings

### High: Single-Use Verification Tokens Are Not Redeemed Atomically

File: `src/auth/repositories/verification-token.repository.ts`

`VerificationTokenRepository.redeem()` performs:

1. `findOne({ tokenHash, used: false, expiresAt: { $gt: now } })`
2. `updateOne({ _id }, { $set: { used: true } })`

Two concurrent requests can both read the same unused token before either update lands. This affects password reset tokens and email 2FA codes.

Impact:

- A password reset link can be redeemed twice under concurrency.
- An email 2FA code can produce duplicate successful verifications.
- Multiple sessions may be issued from one pending verification.

Recommendation:

Replace the read-then-write with a single conditional `findOneAndUpdate`:

```ts
const now = new Date();
const doc = await coll.findOneAndUpdate(
  { tokenHash, used: false, expiresAt: { $gt: now } },
  { $set: { used: true, usedAt: now } },
  { returnDocument: 'before' }
);
```

Add a concurrency unit test proving two parallel redeems produce exactly one success.

### High: TOTP Login Has No Brute-Force Throttle Or Replay Protection

Files:

- `src/auth/actions/verify-totp.ts`
- `src/auth/services/mfa.service.ts`

The TOTP login path verifies the submitted code and immediately issues a session. Unlike `verify-2fa.ts`, it does not enforce a Mongo-backed failed-attempt counter, clear the pending cookie after repeated failures, or audit success/failure.

It also does not persist the last accepted TOTP timestep, so the same valid TOTP code may be accepted repeatedly within the same time window.

Impact:

- Attackers with a pending MFA cookie get unlimited TOTP guesses.
- Successful TOTP codes can potentially be replayed during their validity window.
- Security monitoring lacks TOTP success/failure events.

Recommendation:

- Add the same failed-attempt limiter used by email 2FA.
- Record success and failure attempts in audit logs.
- Store and reject the last accepted TOTP timestep per user.
- Clear `cws_2fa_pending` / `cws_stepup_pending` after too many failures.

### Medium: Refresh-Token Device Binding Can Be Bypassed If Device Cookie Is Missing

File: `src/auth/services/session.service.ts`

Refresh-token device binding is checked only when `clientDeviceCookieValue` is present. If a session has a bound `deviceId` but the request omits the `cws_device_token` cookie, the refresh token can still rotate.

Impact:

- A stolen refresh token may be usable without also possessing the bound device cookie.
- Device binding is reduced to a best-effort signal instead of an enforcement control.

Recommendation:

When `session.deviceId` exists, require a valid matching server device token. Allow legacy fallback only for sessions created before device binding was introduced.

### Medium: WebAuthn Production RP ID And Origin Are Hard-Coded

File: `src/auth/services/mfa.service.ts`

Production WebAuthn settings use:

```ts
const rpID = process.env.NODE_ENV === 'production' ? 'your-domain.com' : 'localhost';
const origin = process.env.NODE_ENV === 'production' ? `https://${rpID}` : `http://${rpID}:3000`;
```

Impact:

- WebAuthn will fail in production unless the real domain happens to match the placeholder.
- A bad deployment can silently ship broken passkey authentication.

Recommendation:

Add validated environment variables such as `WEBAUTHN_RP_ID` and `WEBAUTHN_ORIGIN`, or derive them from `APP_URL`. Fail closed in production if they are missing or inconsistent.

### Medium: CSRF Guard Allows Missing Origin And Referer

File: `src/auth/lib/request.ts`

`assertSameOrigin()` allows a request if both `Origin` and `Referer` are absent. This may be acceptable for some Next.js Server Actions because Next adds its own protections, but it is weaker for direct route handlers such as refresh and logout.

Impact:

- Defense-in-depth is weaker for state-changing route handlers.
- Security posture depends on browser/header behavior and framework assumptions.

Recommendation:

Use a stricter guard for route handlers:

- Require valid `Origin` or valid `Referer`.
- Keep the softer behavior only for Server Actions if needed for compatibility.

### Medium: Google Token Exchange Failures Are Generic

File: `src/auth/services/oauth.service.ts`

JWKS fetch failures are wrapped in `OAuthProviderUnavailableError`, but token exchange failures still throw generic errors on network, HTTP, or JSON failures.

Impact:

- User-facing handling and audit categorization are inconsistent.
- Transient Google token endpoint outages are harder to distinguish from invalid OAuth input.

Recommendation:

Wrap token exchange fetch, HTTP, and parse failures in `OAuthProviderUnavailableError` with the same public message used for JWKS outages.

## Positive Controls Observed

### Password Authentication

Files:

- `src/auth/services/login.service.ts`
- `src/auth/crypto/password.ts`
- `src/auth/config/env.ts`

Strengths:

- Argon2id password hashing.
- Production guard for `ARGON2_SECRET` pepper.
- Dummy password verification for unknown users to reduce timing enumeration.
- Generic invalid credential responses.
- Account lifecycle checks for suspended, deleted, inactive, and disabled users.
- Atomic failed-login lockout logic.
- Password expiry and force-change support.

### Session And Refresh Token Security

Files:

- `src/auth/services/session.service.ts`
- `src/auth/repositories/refresh-token.repository.ts`
- `src/auth/crypto/token.ts`

Strengths:

- Opaque HMAC-signed session cookie values.
- Refresh tokens are random opaque values; only SHA-256 hashes are stored.
- Refresh-token rotation uses atomic replacement.
- Reuse detection revokes the session family.
- Idle and absolute refresh limits are enforced.
- Password change and reset revoke active sessions.

### Google OAuth

File: `src/auth/services/oauth.service.ts`

Strengths:

- Authorization Code + PKCE.
- `state` validation for CSRF.
- `nonce` validation for replay protection.
- ID token signature verification against Google JWKS.
- JWKS cache uses `Cache-Control: max-age` and refreshes on unknown `kid`.
- No accept-without-verification fallback.
- Explicit pre-provisioned OAuth account linking; no login-time email auto-linking.
- Audience, issuer, expiry, algorithm, and subject checks are enforced.

### Cookie Security

File: `src/auth/lib/cookies.ts`

Strengths:

- HttpOnly auth cookies.
- Production fail-closed `Secure` cookie guard.
- Access session cookie is `SameSite=Lax`.
- Refresh, pending MFA, pending password, and device cookies use `SameSite=Strict`.
- Cookie lifetimes are derived from environment TTLs.

### CSRF And Rate Limiting

Files:

- `src/auth/lib/csrf.ts`
- `src/auth/lib/request.ts`
- `src/auth/services/rate-limit.service.ts`

Strengths:

- Server Actions are wrapped with an explicit same-origin guard.
- Refresh and logout route handlers perform same-origin checks.
- Password login has per-IP and per-identifier throttling.
- Password reset and OAuth callback flows have Mongo-backed rate limiting.

### Audit And Alerting

Files:

- `src/auth/services/alerting.service.ts`
- `src/auth/repositories/audit-log.repository.ts`

Strengths:

- Login success/failure events are audited.
- OAuth failure paths notify alerting.
- Refresh-token reuse detection emits audit and alerting signals.
- Password reset success emits alerting.

## Priority Remediation Plan

1. Make verification-token redemption atomic.
2. Add TOTP failed-attempt limits, audit logs, and timestep replay prevention.
3. Enforce device-token presence when refreshing a device-bound session.
4. Move WebAuthn RP ID/origin to validated environment config.
5. Split CSRF guard behavior between Server Actions and route handlers; make route handlers require `Origin` or `Referer`.
6. Wrap Google token exchange outages in `OAuthProviderUnavailableError`.

## Final Assessment

The current authentication implementation is materially stronger than a typical custom auth system. The core architecture is sound: opaque sessions, rotated refresh tokens, server-side persistence, no public registration, provisioned OAuth links, strong password hashing, and layered cookie/CSRF controls.

The system is not yet fully enterprise-production-ready because some secondary flows still lack atomicity, throttling parity, and deployment-time validation. Addressing the six remediation items above would significantly reduce the remaining authentication risk without redesigning the project.
