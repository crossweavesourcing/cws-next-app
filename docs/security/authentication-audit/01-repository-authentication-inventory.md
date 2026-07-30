# Authentication System Inventory

> Audit Date: 2026-07-27 | Commit: `32af9be` | Branch: `main`

---

## 1. Complete File Inventory

### 1.1 Core Configuration

| File | Purpose |
|---|---|
| `src/auth/config/env.ts` | Zod-validated environment schema; `getEnv()` singleton; `validateSecurityConfig()` fail-closed production boot guards for SESSION_SECRET, ARGON2_SECRET, TRUSTED_PROXY_IP_HEADER, SECURE_COOKIES, WebAuthn origin/RP-ID |
| `src/auth/errors/auth-errors.ts` | Typed error hierarchy: `InvalidCredentialsError`, `AccountLockedError`, `AccountSuspendedError`, `AccountDeletedError`, `AccountDisabledError`, `ForcePasswordChangeError`, `SessionExpiredError`, `RateLimitError`, `InternalAuthError`, `OAuthProviderUnavailableError` |
| `src/proxy.ts` | Next.js route proxy guard for `/dashboard/:path*`; HMAC-verifies `cws_session` cookie; redirects unauthenticated users to login; injects per-request CSP nonce |

### 1.2 Data Access Layer

| File | Purpose |
|---|---|
| `src/auth/dal.ts` | `getAuthSession()` (React `cache`-memoized), `getAuthUser()`, `requireAuth()`, `requireActiveSession()`, `requireRole()`, `requireCmsPermission()`, `requireSuperAdminOnly()`, `getEffectivePermissions()` — central authorization enforcement |

### 1.3 Server Actions

| File | Purpose |
|---|---|
| `src/auth/actions/login.ts` | `loginAction` — email/password login; sets `cws_2fa_pending` or `cws_pw_pending` cookies; wrapped with `withCsrfGuard` |
| `src/auth/actions/verify-2fa.ts` | `verify2faAction`, `resend2faAction` — email 2FA code verification; pending cookie lifecycle; rate-limited resend |
| `src/auth/actions/verify-totp.ts` | `verifyTotpAction` — TOTP authenticator app code verification; issues session on success |
| `src/auth/actions/change-password.ts` | `changePasswordAction` — authenticated or force-change password change; clears `cws_pw_pending` |
| `src/auth/actions/password-reset.ts` | `requestResetAction`, `resetPasswordAction` — email-based password reset; rate-limited per email + IP |
| `src/auth/actions/session.ts` | `revokeSessionAction`, `revokeAllOtherSessionsAction`, `revokeFriendlySessionAction` — session management |
| `src/auth/actions/mfa.ts` | `generateTotpSecretAction`, `verifyAndEnableTotpAction`, `disableTotpAction`, `updateTwoFaPreferencesAction` — TOTP enrollment and MFA preference management |
| `src/auth/actions/passkey.ts` | `renamePasskeyAction`, `removePasskeyAction` — WebAuthn credential management |
| `src/auth/actions/recovery-codes.ts` | `generateRecoveryCodesAction`, `regenerateRecoveryCodesAction`, `getRecoveryCodesStatusAction` — recovery code lifecycle |
| `src/auth/actions/device.ts` | `trustDeviceAction`, `blockDeviceAction`, `renameDeviceAction`, `trustCurrentDeviceAction`, `updateTwoFaPreferenceAction` — device trust/block/rename |
| `src/auth/actions/admin.ts` | `adminRevokeUserSessionsAction`, `adminRevokeAllSessionsAction` — admin-only session revocation |
| `src/auth/actions/user-management.ts` | `createUserAction`, `changeUserRoleAction`, `setManagerPermissionsAction`, `deleteUserAction`, `undoDeleteUserAction` — user CRUD |

### 1.4 Services

| File | Purpose |
|---|---|
| `src/auth/services/login.service.ts` | Core login orchestration: credential verification, lockout, risk evaluation, MFA routing, session issuance |
| `src/auth/services/session.service.ts` | Session CRUD, creation with device binding, refresh token rotation with atomic replace, concurrent session limit, idle/absolute expiry, geo-IP resolution |
| `src/auth/services/logout.service.ts` | Session revocation and audit logging |
| `src/auth/services/password.service.ts` | Password lifecycle: change, reset, expiry, history/reuse prevention, strength evaluation |
| `src/auth/services/two-factor.service.ts` | Email-based 2FA: code generation (6-digit from CSRPNG), sending, verification with recovery-code fallback |
| `src/auth/services/mfa.service.ts` | TOTP (otplib) enrollment/verification; WebAuthn registration/authentication (SimpleWebAuthn) |
| `src/auth/services/oauth.service.ts` | Google Authorization Code + PKCE: state/nonce/PKCE, code exchange, id_token verification (JWKS), user linking, session issuance |
| `src/auth/services/mobile-auth.service.ts` | Mobile authentication: password + Google login, MFA challenge/response, session + EdDSA JWT issuance |
| `src/auth/services/mobile-token.service.ts` | EdDSA (Ed25519) JWT issuance and verification via `jose`; JWKS endpoint generation |
| `src/auth/services/rate-limit.service.ts` | Per-IP (20/15min) and per-identifier (10/15min) login rate limiting |
| `src/auth/services/alerting.service.ts` | Security event alerting: reuse detection, new device, suspicious location, password reset, OAuth failure, failure spike aggregation |
| `src/auth/services/mailer.ts` | Nodemailer + Gmail SMTP transport; dev fallback to console |
| `src/auth/services/admin.service.ts` | Admin session revocation (single user, global) |
| `src/auth/services/device.service.ts` | Device registration, login tracking, trust management |
| `src/auth/services/account-security.service.ts` | Aggregated account security view for dashboard |
| `src/auth/services/friendly-security.service.ts` | Friendly device security summary |
| `src/auth/services/user-management.service.ts` | User CRUD operations |

### 1.5 Repositories

| File | Purpose |
|---|---|
| `src/auth/repositories/user.repository.ts` | User CRUD, email lookup, security update, atomic lockout (`recordFailedLoginAndMaybeLock`) |
| `src/auth/repositories/session.repository.ts` | Session CRUD, revocation (single/bulk), concurrent session queries |
| `src/auth/repositories/refresh-token.repository.ts` | Refresh token CRUD, atomic `atomicReplace`, reuse detection, bulk revocation |
| `src/auth/repositories/login-attempt.repository.ts` | Login attempt recording, count queries (IP, identifier, 2FA failures), active lockout lookup |
| `src/auth/repositories/audit-log.repository.ts` | Audit log writes |
| `src/auth/repositories/verification-token.repository.ts` | Verification token CRUD, single-use redeem, invalidation |
| `src/auth/repositories/otp-code.repository.ts` | OTP code storage |
| `src/auth/repositories/recovery-code.repository.ts` | Recovery code generation (hashed), single-use redemption |
| `src/auth/repositories/device.repository.ts` | Device CRUD, trust/block operations, server-device-id lookup |
| `src/auth/repositories/oauth-account.repository.ts` | OAuth account linking and lookup |
| `src/auth/repositories/mfa.repository.ts` | TOTP secret and WebAuthn credential storage |
| `src/auth/repositories/webauthn-challenge.repository.ts` | WebAuthn challenge storage |
| `src/auth/repositories/mobile-challenge.repository.ts` | Mobile MFA challenge storage |
| `src/auth/repositories/pending-authentication.repository.ts` | Pending 2FA/step-up authentication token storage |
| `src/auth/repositories/password-history.repository.ts` | Password history for reuse prevention |
| `src/auth/repositories/password-policy.repository.ts` | Password policy management |

### 1.6 Cryptography

| File | Purpose |
|---|---|
| `src/auth/crypto/password.ts` | Argon2id hashing (64MB, t=3, p=1) with optional pepper via `ARGON2_SECRET` |
| `src/auth/crypto/token.ts` | `generateToken()`, `hashToken()` (SHA-256), `signSessionId()` (HMAC-SHA256), `verifySessionSignature()` (timing-safe), `generateRefreshToken()` |
| `src/auth/crypto/token-edge.ts` | Edge-compatible session signature verification via Web Crypto API |
| `src/auth/crypto/constants.ts` | `DUMMY_HASH` — precomputed Argon2id hash for timing side-channel mitigation |

### 1.7 Libraries

| File | Purpose |
|---|---|
| `src/auth/lib/cookies.ts` | Cookie helpers: `isSecureCookies()`, `sessionCookieOpts()` (Lax), `strictCookieOpts()` (Strict), `setAuthCookies()`, `clearAuthCookies()` |
| `src/auth/lib/csrf.ts` | `withCsrfGuard()` — wraps Server Actions with `assertSameOrigin()` |
| `src/auth/lib/request.ts` | `getClientIp()` — trusted-proxy-first IP resolution; `assertSameOrigin()` / `assertSameOriginStrict()` — CSRF origin/Referer guards |
| `src/auth/lib/ip.ts` | `UNTRUSTED_IP_SENTINEL` constant (`0.0.0.0`) |
| `src/auth/lib/device.ts` | `ensureDeviceId()` — mints/verifies HMAC-signed `cws_device_token` cookie; `DeviceIdentity` resolution |
| `src/auth/lib/geoip.ts` | `lookupGeo()` — pluggable geo-IP: remote endpoint → offline geoip-lite → null (fail-open) |
| `src/auth/lib/mobile.ts` | `authenticateBearerRequest()`, `authenticateCookieOrBearer()`, `mobileCorsHeaders()`, `hasCmsPermission()` — mobile API auth helpers |
| `src/auth/lib/webauthn.ts` | Zod schemas for WebAuthn registration/authentication responses; challenge extraction |

### 1.8 Risk Evaluation

| File | Purpose |
|---|---|
| `src/auth/risk/types.ts` | Risk level types, signal types, 2FA policy types |
| `src/auth/risk/evaluate-login-risk.ts` | Orchestrates: signals → score → policy → audit |
| `src/auth/risk/signals.ts` | Collects device trust, geo, failed attempts, security events |
| `src/auth/risk/score.ts` | Weighted scoring with configurable thresholds (medium: 25, high: 60, critical: 100) |
| `src/auth/risk/policy.ts` | Resolves 2FA policy from risk level, user preference, and trusted-device status |

### 1.9 Validation

| File | Purpose |
|---|---|
| `src/auth/validation/login.schema.ts` | Zod schema for login payload (email, password, rememberMe) |
| `src/auth/validation/password-policy.ts` | Configurable password policy schema (length, character classes) |
| `src/auth/validation/password-strength.ts` | zxcvbn-ts integration for password strength evaluation |
| `src/auth/validation/admin.schema.ts` | Admin-specific validation schemas |
| `src/auth/validation/index.ts` | Barrel export |

### 1.10 Database Layer

| File | Purpose |
|---|---|
| `src/database/constants.ts` | `COLLECTION_NAMES` — 22 named collections; `COLLECTION_ORDER` for initialization |
| `src/database/config.ts` | `getDatabaseConfig()` — validates MONGODB_URI and MONGODB_DB_NAME |
| `src/database/client.ts` | `MongoClient` singleton with connection pooling, observability |
| `src/database/collections.ts` | 11 typed collection accessor functions |
| `src/database/schemas/` | 12 files — `$jsonSchema` validators for all collections with `validationLevel: 'strict'` |
| `src/database/indexes/` | 12 files — 29+ index definitions across all collections |
| `src/database/init.ts` | Idempotent database initialization (create/update collections + indexes) |
| `src/database/health.ts` | Health check (ping, collection count) |
| `src/database/maintenance.ts` | Audit log archival, TTL pruning, collection stats |
| `src/database/retry.ts` | Exponential backoff + jitter for transient MongoDB errors |
| `src/database/shutdown.ts` | Graceful shutdown handlers (SIGTERM/SIGINT) |
| `src/database/observability.ts` | Command monitoring, slow query detection |

---

## 2. Authentication Endpoints

### 2.1 Web Authentication API Routes

| Endpoint | Method | File | Purpose |
|---|---|---|---|
| `/api/auth/login` | POST | `src/app/api/auth/login/route.ts` | Credential login (returns session + refresh cookies) |
| `/api/auth/logout` | POST | `src/app/api/auth/logout/route.ts` | Session termination, cookie clearing |
| `/api/auth/refresh` | POST | `src/app/api/auth/refresh/rate.ts` | Refresh token rotation, session renewal |
| `/api/auth/google` | GET | `src/app/api/auth/google/route.ts` | Initiates Google OAuth (PKCE + state + nonce) |
| `/api/auth/google/callback` | GET | `src/app/api/auth/google/callback/route.ts` | Google OAuth callback, id_token verification, session issuance |
| `/api/auth/webauthn/register-options` | POST | `src/app/api/auth/webauthn/register-options/` | WebAuthn registration ceremony start |
| `/api/auth/webauthn/register-verify` | POST | `src/app/api/auth/webauthn/register-verify/` | WebAuthn registration verification |
| `/api/auth/webauthn/login-options` | POST | `src/app/api/auth/webauthn/login-options/` | WebAuthn authentication ceremony start |
| `/api/auth/webauthn/login-verify` | POST | `src/app/api/auth/webauthn/login-verify/` | WebAuthn authentication verification |
| `/api/auth/test-cookies` | POST | `src/app/api/auth/test-cookies/route.ts` | Cookie testing endpoint |

### 2.2 Mobile Authentication API Routes

| Endpoint | Method | File | Purpose |
|---|---|---|---|
| `/api/mobile/v1/auth/password/login` | POST | `src/app/api/mobile/v1/auth/password/` | Mobile password login → EdDSA JWT |
| `/api/mobile/v1/auth/google` | POST | `src/app/api/mobile/v1/auth/google/` | Mobile Google login → EdDSA JWT |
| `/api/mobile/v1/auth/mfa/totp` | POST | `src/app/api/mobile/v1/auth/mfa/` | Mobile TOTP verification |
| `/api/mobile/v1/auth/mfa/email` | POST | `src/app/api/mobile/v1/auth/mfa/` | Mobile email 2FA verification |
| `/api/mobile/v1/auth/mfa/resend` | POST | `src/app/api/mobile/v1/auth/mfa/` | Mobile 2FA code resend |
| `/api/mobile/v1/auth/logout` | POST | `src/app/api/mobile/v1/auth/logout/` | Mobile logout |
| `/api/mobile/v1/auth/refresh` | POST | `src/app/api/mobile/v1/auth/refresh/` | Mobile token refresh |
| `/api/mobile/v1/auth/me` | GET | `src/app/api/mobile/v1/auth/me/` | Mobile current user info |
| `/api/mobile/v1/auth/password/change` | POST | `src/app/api/mobile/v1/auth/password/` | Mobile password change |
| `/api/mobile/v1/auth/passkeys/*` | Various | `src/app/api/mobile/v1/auth/passkeys/` | Mobile passkey management |
| `/api/mobile/v1/.well-known/jwks.json` | GET | `src/app/api/mobile/v1/.well-known/jwks.json/` | Public JWKS for mobile JWT verification |
| `/api/mobile/v1/.well-known/jwks` | GET | `src/app/api/mobile/v1/.well-known/jwks/` | Alias JWKS endpoint |

### 2.3 Mobile Admin API Routes (Bearer-authenticated)

| Endpoint | File | Purpose |
|---|---|---|
| `/api/mobile/v1/admin/categories/*` | `src/app/api/mobile/v1/admin/categories/` | CMS category CRUD |
| `/api/mobile/v1/admin/products/*` | `src/app/api/mobile/v1/admin/products/` | CMS product CRUD |
| `/api/mobile/v1/admin/sections/*` | `src/app/api/mobile/v1/admin/sections/` | CMS section CRUD |
| `/api/mobile/v1/admin/sessions/*` | `src/app/api/mobile/v1/admin/sessions/` | Session management |
| `/api/mobile/v1/users/[id]/*` | `src/app/api/mobile/v1/users/[id]/` | User profile management |

---

## 3. Services and Their Roles

| Service | Role | Key Security Responsibility |
|---|---|---|
| `LoginService` | Orchestrates credential login | Timing side-channel mitigation, lockout, risk evaluation, MFA routing |
| `SessionService` | Session lifecycle | HMAC-signed cookies, refresh rotation with atomic replace, device binding, idle/absolute expiry |
| `LogoutService` | Session termination | Revocation + audit |
| `PasswordService` | Password lifecycle | Policy enforcement, strength evaluation, history prevention, reset flow |
| `TwoFactorService` | Email 2FA | Code generation, delivery, verification, rate limiting |
| `MfaService` | TOTP + WebAuthn | TOTP enrollment/verification, WebAuthn registration/authentication ceremony |
| `OAuthService` | Google OAuth | PKCE, state/nonce, JWKS verification, no auto-linking (FIX-C3) |
| `MobileAuthService` | Mobile auth orchestration | Delegates to LoginService/OAuthService, issues EdDSA JWTs |
| `MobileTokenService` | JWT operations | EdDSA signing/verification, JWKS generation |
| `RateLimitService` | Brute-force protection | Per-IP + per-identifier limits with sentinel-skip |
| `AlertingService` | Security event fan-out | Reuse, new device, suspicious location, failure spikes |
| `DeviceService` | Device management | Registration, trust/block, identity verification |
| `AdminService` | Admin operations | Bulk session revocation (requires `super_admin` role) |
| `UserManagementService` | User CRUD | Role-based user operations |
| `AccountSecurityService` | Dashboard view | Aggregated security posture |

---

## 4. Database Collections (22 total)

### 4.1 Auth-Primary Collections

| Collection | Document Type | Key Fields |
|---|---|---|
| `users` | `UserDocument` | `_id`, `email`, `password.hash`, `status`, `role`, `permissions[]`, `security.{lockedUntil, forcePasswordChange, accountSecurityVersion, mfaEnabled, totpEnabled, webAuthnEnabled, twoFaPreference, defaultTwoFaMethod, requireTwoFactor, passwordStrengthCategory}` |
| `user_emails` | `UserEmailDocument` | `userId`, `email`, `primary`, `verified`, `enabled` |
| `user_phones` | `UserPhoneDocument` | `userId`, `e164`, `primary`, `verified` |
| `oauth_accounts` | `OAuthAccountDocument` | `userId`, `provider` (google/linkedin), `providerAccountId` |
| `devices` | `DeviceDocument` | `userId`, `deviceId` (UUID), `trusted`, `blocked`, `trustGrantedBy`, `fingerprint.{canvasHash, webglHash, audioHash, fontsHash, stabilityScore}`, `lastSeenLocation` |
| `sessions` | `SessionDocument` | `userId`, `deviceId`, `loginMethod`, `platform`, `ipAddress`, `location`, `expiresAt`, `lastActivityAt`, `lastFullAuthAt`, `accountSecurityVersion`, `revoked` |
| `refresh_tokens` | `RefreshTokenDocument` | `sessionId`, `userId`, `tokenHash`, `rotationNumber`, `rotatedFrom`, `replacedBy`, `reuseDetected`, `expiresAt` |
| `verification_tokens` | `VerificationTokenDocument` | `userId`, `type` (two_factor, password_reset), `tokenHash`, `expiresAt` |
| `otp_codes` | `OtpCodeDocument` | `e164`, `codeHash`, `attempts`, `maxAttempts` |
| `recovery_codes` | Recovery code hashes | `userId`, `codeHash`, `used`, `usedAt` |
| `pending_authentications` | Pending auth tokens | `userId`, `tokenHash`, `requiredAction`, `riskLevel`, `riskScore`, `attemptsRemaining`, `expiresAt`, `consumedAt` |
| `login_attempts` | `LoginAttemptDocument` | `userId`, `identifierType`, `identifier`, `ipAddress`, `success`, `failureReason`, `lockExpiresAt`, `country`, `city` |
| `audit_logs` | `AuditLogDocument` | `userId`, `sessionId`, `action`, `status`, `actor`, `source`, `resource`, `metadata`, `ipAddress` |
| `totp_credentials` | TOTP secrets | `userId`, `secret`, `lastAcceptedTimeStep` |
| `webauthn_credentials` | WebAuthn keys | `userId`, `credentialID`, `credentialPublicKey`, `counter`, `deviceObjectId` |
| `webauthn_challenges` | WebAuthn challenges | Challenge storage for registration/auth ceremonies |
| `mobile_auth_challenges` | Mobile MFA challenges | `tokenHash`, `userId`, `methods[]`, `expiresAt` |
| `password_history` | Historical password hashes | `userId`, `hash`, `algorithm` |
| `password_policies` | Active password policy | `minLength`, `maxLength`, `historyCount`, `expirationDays` |
| `system_settings` | System configuration | General settings |
| `categories` | CMS categories | Content categories |
| `products` | CMS products | Content products |
| `sections` | CMS sections | Content sections |

---

## 5. Dependencies with Versions

### 5.1 Auth-Critical Dependencies

| Package | Version | Purpose |
|---|---|---|
| `argon2` | 0.44.0 | Argon2id password hashing with pepper support |
| `jose` | 6.2.3 | EdDSA JWT signing/verification (mobile API) |
| `otplib` | 13.4.1 | TOTP authenticator app support |
| `@simplewebauthn/server` | 13.3.2 | WebAuthn registration/authentication |
| `@simplewebauthn/browser` | 13.3.0 | WebAuthn client-side helpers |
| `@zxcvbn-ts/core` | 4.1.2 | Password strength evaluation |
| `@zxcvbn-ts/language-common` | 4.1.3 | Password strength dictionaries |
| `nodemailer` | 6.9.16 | Email delivery (2FA codes, reset links) |
| `zod` | 4.4.3 | Input validation |
| `mongodb` | 6.16.0 | Database driver (raw, no ODM) |

### 5.2 Framework Dependencies

| Package | Version |
|---|---|
| `next` | 16.2.7 |
| `react` | 19.2.4 |
| `react-dom` | 19.2.4 |
| `typescript` | 5.9.3 |

---

## 6. Environment Variables

### 6.1 Required Secrets (6 total)

| Variable | Sensitivity | Boot Guard |
|---|---|---|
| `MONGODB_URI` | Contains DB username + password | Fail-closed in production |
| `SESSION_SECRET` | HMAC-signs session cookies | Fail-closed: min 32 chars, blocklisted defaults |
| `ARGON2_SECRET` | Application pepper for Argon2id | Fail-closed: min 16 chars in production |
| `GOOGLE_CLIENT_SECRET` | OAuth client secret | Required when GOOGLE_CLIENT_ID is set |
| `EMAIL_PASSWORD` | Gmail App Password | Required when EMAIL_USER is set |
| `ADMIN_SEED_PASSWORD` | Initial admin password | Fail-closed in production |

### 6.2 Security-Sensitive Non-Secret Variables

| Variable | Default | Purpose |
|---|---|---|
| `APP_URL` | `http://localhost:3000` | Origin for CSRF, WebAuthn, OAuth redirect |
| `SECURE_COOKIES` | `NODE_ENV === 'production'` | Explicit fail-closed cookie Secure flag |
| `TRUSTED_PROXY_IP_HEADER` | unset | Fail-closed: required in production |
| `STEP_UP_ENABLED` | `true` | Step-up MFA opt-out flag |
| `ACCESS_SESSION_TTL_MS` | 900000 (15 min) | Session access token lifetime |
| `IDLE_TIMEOUT_MS` | 1800000 (30 min) | Inactivity logout |
| `REFRESH_TOKEN_TTL_MS` | 604800000 (7 days) | Refresh token lifetime |
| `GEOIP_LOOKUP_URL` | unset | Geo-IP lookup endpoint |
| `WEBAUTHN_RP_ID` | Derived from APP_URL | WebAuthn relying party ID |
| `WEBAUTHN_ORIGIN` | APP_URL | WebAuthn origin |

### 6.3 Mobile API Variables

| Variable | Purpose |
|---|---|
| `MOBILE_JWT_KEY_ID` | Active JWT key identifier |
| `MOBILE_JWT_PRIVATE_KEY_B64` | Ed25519 private key (base64 PKCS8) |
| `MOBILE_JWT_PUBLIC_KEYS_JSON` | JSON map of kid → base64 SPKI public key |
| `MOBILE_JWT_ISSUER` | JWT issuer claim |
| `MOBILE_ACCESS_TOKEN_TTL_MS` | Mobile access token lifetime |
| `MOBILE_REFRESH_TOKEN_TTL_MS` | Mobile refresh token lifetime |
| `MOBILE_GOOGLE_CLIENT_IDS` | Comma-separated mobile Google client IDs |
| `MOBILE_ALLOWED_ORIGINS` | Comma-separated CORS origins |

---

## 7. External Providers

| Provider | Protocol | Status |
|---|---|---|
| Google OAuth | Authorization Code + PKCE | Optional (disabled when env vars unset) |
| Gmail SMTP | Nodemailer transport | Optional (falls back to console logging) |
| Geo-IP Lookup | HTTP endpoint or geoip-lite | Optional (fail-open to null) |

---

## 8. Initial Suspicious Areas

### 8.1 Debug Code Left in Production Path

**File:** `src/auth/actions/verify-2fa.ts:125-138`

```typescript
const fs = await import('fs');
fs.appendFileSync('debug-verify.log', '\n\n[DEBUG] pendingAuth.deviceObjectId: ' + pendingAuth.deviceObjectId + '\n');
// ... more debug writes
```

**Risk:** `fs.appendFileSync` writes to the filesystem on every 2FA verification. This is debug code that:
1. Writes sensitive authentication data (`deviceObjectId`) to a world-readable file
2. Creates a potential disk-fill DoS vector
3. In serverless environments, this is a no-op but indicates incomplete code review
4. Leaks internal device identifiers to the filesystem

**Severity:** Medium

### 8.2 Unreachable Step-Up Redirect

**File:** `src/auth/actions/login.ts:84-86`

```typescript
if (result.status === 'step_up') {
  return { redirect: '/dashboard/verify-step-up' };
}
```

**Severity:** Low — The `LoginService.loginWithPassword` return type does not include `step_up` as a possible status. This is dead code; the risk is confusion during maintenance.

### 8.3 Placeholder Risk Signals Not Implemented

**File:** `src/auth/risk/signals.ts:109-111`

```typescript
isUnusualNetwork: false, // Placeholder for ASN checks
isAnonymizingNetwork: false, // Placeholder for Tor/VPN checks
isMaliciousIp: false, // Placeholder for IP reputation
impossibleTravel: false, // Placeholder for velocity checks
```

**Risk:** Several risk scoring signals are hardcoded to `false`, reducing the effectiveness of the risk evaluation engine. The scoring weights for these signals exist but will never fire.

**Severity:** Medium — reduces risk detection coverage

### 8.4 `@ts-expect-error` in Risk Signals

**File:** `src/auth/risk/signals.ts:99`

```typescript
// @ts-expect-error Password changed at is not yet fully modeled
if (user.security?.passwordChangedAt && ...
```

**Severity:** Low — indicates incomplete type modeling; the field exists on the user document but is not in the type definition.

### 8.5 Session Cookie SameSite=Lax

**File:** `src/auth/lib/cookies.ts:52`

The `cws_session` cookie uses `SameSite=Lax`. This is **intentional and documented** (line 32-43) — Lax allows top-level navigation while high-value tokens use Strict. However:
- The session cookie alone does not grant authorization (HMAC-signed, server-validated)
- CSRF protection is layered via `assertSameOrigin()`
- **NOT VERIFIED:** whether all state-changing operations on authenticated pages correctly use `withCsrfGuard`

### 8.6 Concurrent Session Limit Configurable but Hardcoded

**File:** `src/auth/services/session.service.ts:78`

The concurrent session limit is hardcoded to `5` via `this.enforceConcurrentSessionLimit(userId, 5)` rather than being configurable via environment or database.

**Severity:** Informational

### 8.7 Refresh Token Rotation — Atomic Replace Race Window

**File:** `src/auth/services/session.service.ts:397-419`

The atomic replace pattern is well-implemented (`atomicReplace` + loser detection), but the design relies on MongoDB's atomic `findOneAndUpdate` returning null when `replacedBy` is already set. **NOT VERIFIED** at runtime whether the MongoDB index and operation are truly atomic under concurrent load.

### 8.8 `ensureDeviceId()` Fire-and-Forget in Proxy

**File:** `src/proxy.ts:63`

```typescript
ensureDeviceId().catch(() => {});
```

**Severity:** Low — The `.catch(() => {})` silently swallows errors from device ID resolution. If `ensureDeviceId` fails, the request proceeds without a device token, which is the intended fail-open behavior but should be monitored.

---

## 9. Areas Requiring Dynamic Testing

| Area | Test Type | What to Verify |
|---|---|---|
| **Brute-force resistance** | Penetration test | Verify IP + identifier rate limits enforce correctly; verify lockout after 5 failures |
| **Timing side-channel** | Timing analysis | Verify `DUMMY_HASH` + random delay makes unknown-email and wrong-password responses statistically indistinguishable |
| **Session forgery** | Token manipulation | Attempt to forge `cws_session` cookie with known session IDs; verify HMAC rejection |
| **Refresh token theft** | Replay testing | Replay a previously-used refresh token; verify reuse detection + session family revocation |
| **CSRF protection** | Cross-origin requests | Send cross-origin POST to Server Actions; verify `assertSameOrigin` blocks them |
| **CSP enforcement** | Browser testing | Verify CSP nonce is applied and blocks inline scripts |
| **WebAuthn ceremony** | FIDO2 testing | Full registration + authentication flow with real authenticator |
| **TOTP clock skew** | Time manipulation | Test TOTP verification with time-skewed tokens |
| **Email 2FA delivery** | Integration test | Verify code delivery, expiry (5 min), and max attempts (5) |
| **Password reset flow** | End-to-end test | Verify token single-use, 30-min expiry, rate limiting |
| **OAuth PKCE flow** | End-to-end test | Verify state/nonce/verifier replay rejection |
| **Mobile JWT verification** | Token testing | Verify EdDSA JWT validation, issuer/audience checks |
| **Device blocking** | Session binding | Verify blocked device cannot authenticate; verify session revocation on block |
| **Concurrent refresh** | Race condition test | Simultaneous refresh token presentations; verify only one succeeds |
| **Cookie security flags** | HTTP header inspection | Verify `Secure`, `HttpOnly`, `SameSite` on all auth cookies in production |
| **Account lockout atomicity** | Concurrency test | Verify H-5 atomic lockout under concurrent failures |

---

## 10. Security Controls Summary

| Control | Implementation | ASVS Reference | Verified |
|---|---|---|---|
| Password hashing | Argon2id (64MB, t=3, p=1) with pepper | V2.4.1 | Source reviewed |
| Session signing | HMAC-SHA256 with timing-safe comparison | V3.2.1 | Source reviewed |
| Session expiry | Absolute (15min access) + idle (30min) + refresh (7d) | V3.3.1 | Source reviewed |
| Refresh token rotation | Atomic replace + reuse detection + session family revocation | V3.3.2 | Source reviewed |
| CSRF protection | Origin/Referer check + Next.js built-in Action protection | V4.1.1 | Source reviewed |
| CSP | Nonce-based, no unsafe-inline | V14.4.3 | Source reviewed |
| Rate limiting | Per-IP (20/15min) + per-identifier (10/15min) | V2.2.1 | Source reviewed |
| Account lockout | 5 failures → 15 min lock (atomic conditional write) | V2.2.1 | Source reviewed |
| Timing side-channel mitigation | Dummy hash + random delay for unknown users | V2.1.1 | Source reviewed |
| Multi-factor auth | Email 2FA + TOTP + WebAuthn passkeys | V2.8.1 | Source reviewed |
| Step-up MFA | New device / country change → email 2FA | V2.8.2 | Source reviewed |
| Device trust/block | HMAC-signed device tokens, user-managed trust/block | V3.4.1 | Source reviewed |
| Role-based access | Hierarchical: super_admin > admin > manager | V4.1.2 | Source reviewed |
| CMS permissions | Granular permission-based access for managers | V4.1.2 | Source reviewed |
| Audit logging | Comprehensive auth event logging | V7.1 | Source reviewed |
| Cookie security | HttpOnly, Secure, SameSite (Lax/Strict), explicit config | V3.5.1 | Source reviewed |
| Input validation | Zod schemas for all untrusted input | V5.1.1 | Source reviewed |
| Error handling | Generic public messages, detailed internal logging | V7.4.1 | Source reviewed |
| OAuth PKCE | S256 code challenge + state + nonce replay protection | V2.6.1 | Source reviewed |
| No auto-linking | Pre-provisioned OAuth accounts only (FIX-C3) | V2.6.2 | Source reviewed |
| Fail-closed boot | SESSION_SECRET, ARGON2_SECRET, TRUSTED_PROXY, SECURE_COOKIES | V14.1.1 | Source reviewed |
| Secrets management | 6 secrets required via secret manager; blocklisted defaults | V6.4.1 | Source reviewed |
| Password policy | Configurable length/character classes, strength evaluation (zxcvbn) | V2.1.1 | Source reviewed |
| Password reuse prevention | History-based rejection (Argon2id verification) | V2.1.1 | Source reviewed |
| Recovery codes | Hashed, single-use, regenerable | V2.8.1 | Source reviewed |
| Geo-IP step-up | Country-change detection → email 2FA | V2.8.2 | Source reviewed |
| Account security version | Bumped on password change; session invalidation | V3.3.2 | Source reviewed |
| Security alerting | Reuse, new device, suspicious location, failure spikes | V7.1 | Source reviewed |
