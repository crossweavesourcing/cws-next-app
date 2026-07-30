# Authentication Architecture Map

> Audit Date: 2026-07-27 | Commit: `32af9be` | Branch: `main`

---

## 1. System Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                         BROWSER / FRONTEND                         │
│  React 19 Client Components + useActionState (Server Actions)      │
│  Cookies: cws_session (Lax), cws_refresh (Strict),                 │
│           cws_device (Lax), cws_device_token (Lax),                │
│           cws_2fa_pending (Strict), cws_pw_pending (Strict),        │
│           cws_oauth_state (Lax, 10min)                             │
└──────────┬──────────────────────────────────────────┬──────────────┘
           │ Server Action POST                       │ Route Handler
           ▼                                         ▼
┌─────────────────────────────────────────────────────────────────────┐
│                     NEXT.JS SERVER (16.2.7)                        │
│                                                                     │
│  ┌──────────────┐  ┌──────────────┐  ┌────────────────────────┐    │
│  │  Middleware    │  │  proxy.ts     │  │  Server Actions        │    │
│  │  (Edge)       │  │  (Edge)       │  │  (Node.js)             │    │
│  │  CSP nonce    │  │  HMAC check   │  │  withCsrfGuard wrap    │    │
│  │  injection    │  │  redirect     │  │  assertSameOrigin      │    │
│  └──────────────┘  └──────────────┘  └────────────────────────┘    │
│                                                                     │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │                    Data Access Layer (dal.ts)                 │   │
│  │  getAuthSession() → SessionService.validateSession()         │   │
│  │  requireAuth() → redirect if no session                      │   │
│  │  requireActiveSession() → redirect if forcePasswordChange    │   │
│  │  requireRole() → hierarchical RBAC                           │   │
│  │  requireCmsPermission() → granular CMS perms                 │   │
│  └──────────────────────────────────────────────────────────────┘   │
└──────────┬─────────────────────────────────────────────────────────┘
           │
           ▼
┌─────────────────────────────────────────────────────────────────────┐
│                   SERVICE LAYER (src/auth/services/)                │
│                                                                     │
│  LoginService         SessionService        LogoutService           │
│  OAuthService         TwoFactorService      MfaService              │
│  PasswordService      RateLimitService      AlertingService         │
│  DeviceService        AdminService          UserManagementService   │
│  MobileAuthService    MobileTokenService    MailerService           │
│  AccountSecurityService                      FriendlySecurityService│
└──────────┬─────────────────────────────────────────────────────────┘
           │
           ▼
┌─────────────────────────────────────────────────────────────────────┐
│               CRYPTOGRAPHY LAYER (src/auth/crypto/)                │
│                                                                     │
│  password.ts  — Argon2id (64MB, t=3, p=1) + ARGON2_SECRET pepper  │
│  token.ts     — HMAC-SHA256 session signing, SHA-256 hash,        │
│                 timing-safe comparison, refresh token generation   │
│  token-edge.ts — Web Crypto API edge-compatible HMAC verify        │
│  constants.ts — DUMMY_HASH for timing side-channel mitigation      │
└──────────┬─────────────────────────────────────────────────────────┘
           │
           ▼
┌─────────────────────────────────────────────────────────────────────┐
│             MONGODB 6.16.0 (src/database/)                         │
│                                                                     │
│  22 Collections (auth-critical):                                   │
│  users, user_emails, user_phones, oauth_accounts, devices,         │
│  sessions, refresh_tokens, verification_tokens, otp_codes,         │
│  recovery_codes, pending_authentications, login_attempts,          │
│  audit_logs, totp_credentials, webauthn_credentials,               │
│  webauthn_challenges, mobile_auth_challenges,                      │
│  password_history, password_policies                               │
│                                                                     │
│  CMS collections: categories, products, sections                   │
│  Config: system_settings                                           │
└─────────────────────────────────────────────────────────────────────┘

External Providers:
┌─────────────┐  ┌─────────────┐  ┌─────────────┐
│ Google OAuth │  │ Gmail SMTP  │  │ Geo-IP      │
│ (PKCE+OIDC) │  │ (Nodemailer)│  │ (lookup/DB) │
└─────────────┘  └─────────────┘  └─────────────┘
```

---

## 2. Component Details

### 2.1 Browser and Frontend

| Aspect | Detail |
|---|---|
| Framework | React 19.2.4, Next.js 16.2.7 App Router |
| Auth forms | `useActionState` + Server Actions (`'use server'`) |
| Cookie lifecycle | Browser auto-manages `HttpOnly` cookies; JS never reads values |
| CSRF tokens | None explicit — relies on SameSite cookies + `Origin`/`Referer` header check |
| Session refresh | Client-side timer calls `POST /api/auth/refresh` before access token expiry |
| Trusted device prompt | After 2FA success, client shows trust prompt if device is untrusted/unblocked |

**Cookies issued** (all `HttpOnly`, `Secure` in production):

| Cookie | SameSite | Purpose | Lifetime |
|---|---|---|---|
| `cws_session` | Lax | HMAC-signed session ID | 15 min (rolling) |
| `cws_refresh` | Strict | Opaque refresh token | 7 days |
| `cws_device_token` | Lax | HMAC-signed server device record ID | 1 year |
| `cws_device` | (default) | Legacy client UUID v4 — correlation only | (default) |
| `cws_2fa_pending` | Strict | SHA-256 hashed pending auth token | 5 min |
| `cws_pw_pending` | Strict | HMAC-signed user ID (force-change) | 10 min |
| `cws_oauth_state` | Lax | JSON of state/codeVerifier/nonce | 10 min |

### 2.2 Next.js Server

| Component | File | Role |
|---|---|---|
| Route Proxy Guard | `src/proxy.ts` | Edge middleware for `/dashboard/:path*`; HMAC-verifies `cws_session` (fast, no DB); redirects unauthenticated; injects CSP nonce |
| DAL | `src/auth/dal.ts` | React `cache`-memoized session validation via `SessionService.validateSession()` (DB lookup); role/permission checks |
| Server Actions | `src/auth/actions/*.ts` | State-changing operations wrapped with `withCsrfGuard`; `assertSameOrigin()` check |
| Route Handlers | `src/app/api/auth/*/route.ts` | API endpoints; login route uses `Sec-Fetch-*` headers for CSRF; logout/refresh use `assertSameOriginStrict()` |
| API Routes (mobile) | `src/app/api/mobile/v1/auth/*/route.ts` | Bearer JWT authentication; CORS for mobile origins |

### 2.3 Authentication Library

**No third-party auth library (NextAuth, Lucia, etc.)** — fully custom implementation.

| Concern | Implementation |
|---|---|
| Password hashing | Argon2id via `argon2` npm package (64MB, t=3, p=1) with optional pepper |
| Session tokens | HMAC-SHA256 signed MongoDB ObjectIds (`src/auth/crypto/token.ts`) |
| JWT (mobile) | EdDSA (Ed25519) via `jose` library |
| TOTP | `otplib` with NobleCrypto plugin |
| WebAuthn | `@simplewebauthn/server` 13.3.2 |
| Password strength | `@zxcvbn-ts/core` 4.1.2 |
| Input validation | `zod` 4.4.3 |
| Email | `nodemailer` 6.9.16 (Gmail SMTP) |

### 2.4 Database (MongoDB)

**Connection**: `MongoClient` singleton (`src/database/client.ts`) with connection pooling, retry with exponential backoff + jitter, observability.

**Auth-critical collections** (18):

| Collection | Purpose | Key Indexes |
|---|---|---|
| `users` | User accounts, credentials, security flags | `email` (unique), `status` |
| `user_emails` | Email addresses per user | `userId+email` |
| `oauth_accounts` | Google OAuth linking | `provider+providerAccountId` (unique), `userId` |
| `devices` | Device records (server-side) | `userId+deviceId`, `serverDeviceId` |
| `sessions` | Active sessions | `userId`, `expiresAt` (TTL), `revoked` |
| `refresh_tokens` | Refresh token chain | `tokenHash` (unique), `sessionId`, `replacedBy` |
| `verification_tokens` | 2FA codes, password reset tokens | `tokenHash`, `userId+type` |
| `pending_authentications` | Intermediate 2FA state | `tokenHash` |
| `login_attempts` | Brute-force tracking | `identifier+createdAt`, `ipAddress+createdAt` |
| `audit_logs` | Security audit trail | `userId`, `action`, `createdAt` |
| `totp_credentials` | TOTP secrets | `userId` |
| `webauthn_credentials` | WebAuthn passkeys | `userId`, `credentialID` |
| `recovery_codes` | Backup recovery codes (hashed) | `userId+codeHash` |
| `password_history` | Reuse prevention | `userId` |

**Schema enforcement**: JSON Schema validators on all collections (`validationLevel: 'strict'`).

### 2.5 Session Storage

Sessions are **server-side MongoDB documents** with an HMAC-signed cookie carrying only the session ID.

**Session lifecycle**:
1. Creation: `SessionService.createSession()` → `sessions` + `refresh_tokens` docs
2. Validation: `SessionService.validateSession()` → HMAC verify → DB lookup → check revocation, user status, security version, expiry
3. Renewal: `SessionService.rotateRefreshToken()` → atomic replace → new session `expiresAt`
4. Termination: `SessionService.terminateSession()` → `sessions.revoked = true` + `refresh_tokens` revoked

**Expiry enforcement**:
- **Access session**: 15 min rolling (`ACCESS_SESSION_TTL_MS`), renewed on refresh
- **Idle timeout**: 30 min inactivity (`IDLE_TIMEOUT_MS`), checked on every request
- **Refresh token absolute**: 7 days since last full auth (`REFRESH_TOKEN_TTL_MS`), checked at refresh time
- **Account security version**: bumped on password change; session invalidated if mismatch

### 2.6 Google Identity Provider

| Aspect | Detail |
|---|---|
| Protocol | Authorization Code + PKCE (S256) |
| Flow | `GET /api/auth/google` → redirect → `GET /api/auth/google/callback` |
| State/CSRF | Random 32-byte state stored in `cws_oauth_state` cookie (httpOnly, SameSite=Lax) |
| Nonce replay | Random 24-byte nonce verified in id_token |
| PKCE | Random 48-byte verifier → SHA-256 code challenge |
| Token verification | Custom JWRS lookup (cached per instance), RSA-SHA256 signature verify, issuer/audience/expiry/nonce checks |
| Account linking | **Pre-provisioned only** (FIX-C3): no auto-linking by verified email |
| MFA parity | OAuth login routes through same risk engine → may require 2FA or force-change |

### 2.7 Email Provider

| Aspect | Detail |
|---|---|
| Transport | Nodemailer + Gmail SMTP (`EMAIL_USER` / `EMAIL_PASSWORD` app password) |
| Fallback | Console logging when `EMAIL_USER` is not configured |
| Uses | 2FA codes (6-digit), password reset links, password change confirmations |
| 2FA code format | 6-digit numeric, derived from CSRPNG via SHA-256 |
| 2FA code lifetime | 5 minutes |
| Reset link lifetime | 30 minutes |
| Rate limits | 5 resends/user/10min + 30s cooldown; 5 resets/email/15min |

### 2.8 Rate-Limit Storage

All rate limiting is **MongoDB-backed** (no in-memory state):

| Scope | Window | Limit | Collection Field |
|---|---|---|---|
| Login per IP | 15 min | 20 attempts | `login_attempts.ipAddress` |
| Login per email | 15 min | 10 attempts | `login_attempts.identifier` |
| 2FA failures | 15 min | 5 attempts | `login_attempts` with `userId` |
| 2FA resend per user | 10 min | 5 resends | `login_attempts.identifier` = `2fa_resend:<userId>` |
| 2FA resend cooldown | 30 sec | 1 resend | Same as above |
| Password reset request per email | 15 min | 5 requests | `login_attempts.identifier` = `pwreset:request:<email>` |
| Password reset request per IP | 15 min | 20 requests | `login_attempts.ipAddress` |
| Password reset submit per token | 15 min | 10 attempts | `login_attempts.identifier` = `pwreset:submit:<prefix>` |
| OAuth callback per IP | 15 min | 20 attempts | `login_attempts.ipAddress` |
| Account lockout | 15 min | 5 failures | `users.security.lockedUntil` (atomic conditional write) |

### 2.9 Logging and Monitoring

| System | File | Purpose |
|---|---|---|
| Audit logs | `audit_logs` collection | Every auth event: login success/failure, MFA, password change, session revocation, device trust, risk evaluation |
| Security alerting | `src/auth/services/alerting.service.ts` | Reuse detection, new device, suspicious location, failure spikes, OAuth failures, password resets |
| Console logging | Throughout | Error logging, rate-limit warnings, security config warnings |

---

## 3. Trust Boundaries

```
┌──────────────────────────────────────────────────────────────────┐
│                     TRUST BOUNDARY MAP                          │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌─── UNTRUSTED ZONE ───────────────────────────────────────┐   │
│  │                                                           │   │
│  │  Browser / Mobile App                                     │   │
│  │  • All HTTP headers (Origin, Referer, User-Agent, IP)    │   │
│  │  • Form data / request body                               │   │
│  │  • Cookie values (read-only — cannot set server cookies)  │   │
│  │  • URL parameters                                         │   │
│  │                                                           │   │
│  └──────────────────────────────┬────────────────────────────┘   │
│                                 │                                │
│  ┌──── TRANSITION POINT ────────┼────────────────────────────┐   │
│  │                               │                            │   │
│  │  CSRF: assertSameOrigin()     │  IP: getClientIp()         │   │
│  │  Sec-Fetch-* header check     │  Trusted proxy header      │   │
│  │  SameSite cookie enforcement  │  Input: Zod validation     │   │
│  │                               │                            │   │
│  └───────────────────────────────┼────────────────────────────┘   │
│                                 │                                │
│  ┌─── TRUSTED ZONE (Server) ────┼────────────────────────────┐   │
│  │                               │                            │   │
│  │  proxy.ts: HMAC session       │                            │   │
│  │  verification (fast path)     │                            │   │
│  │                               ▼                            │   │
│  │  DAL: Full session validation │                            │   │
│  │  (DB lookup, revocation,      │                            │   │
│  │   user status, security ver)  │                            │   │
│  │                               │                            │   │
│  │  Services: Business logic     │                            │   │
│  │  Repos: Data access           │                            │   │
│  │  Crypto: Argon2, HMAC, JWT   │                            │   │
│  │                               │                            │   │
│  │  MongoDB: Authoritative state │                            │   │
│  │  (sessions, tokens, users)    │                            │   │
│  │                               │                            │   │
│  └───────────────────────────────┼────────────────────────────┘   │
│                                 │                                │
│  ┌─── EXTERNAL PROVIDERS ───────┼────────────────────────────┐   │
│  │                               │                            │   │
│  │  Google OAuth: Trusted for    │                            │   │
│  │  identity assertion only      │                            │   │
│  │                               │                            │   │
│  │  Gmail SMTP: Trusted for      │                            │   │
│  │  email delivery only          │                            │   │
│  │                               │                            │   │
│  │  Geo-IP: Untrusted, fail-open │                            │   │
│  │                               │                            │   │
│  └───────────────────────────────────────────────────────────┘   │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

---

## 4. Authentication States

### 4.1 User Document Status

| Status | Login Allowed | Description |
|---|---|---|
| `active` | Yes | Normal operating state |
| `inactive` | No | Account disabled (throws `AccountDisabledError`) |
| `disabled` | No | Account disabled (throws `AccountDisabledError`) |
| `suspended` | No | Account suspended (throws `AccountSuspendedError`) |
| `deleted` | No | Soft-deleted (throws `AccountDeletedError`) |

### 4.2 Security Flags

| Flag | Effect |
|---|---|
| `security.lockedUntil` | Login blocked until timestamp passes |
| `security.forcePasswordChange` | Redirect to `/dashboard/change-password` on every session validation |
| `security.accountSecurityVersion` | Mismatch with session → session invalidated |
| `security.mfaEnabled` | At least one MFA method active |
| `security.totpEnabled` | TOTP authenticator app enrolled |
| `security.webAuthnEnabled` | At least one WebAuthn credential |
| `security.twoFaPreference` | `'always'` / `'new_device_only'` / `'off'` |
| `security.defaultTwoFaMethod` | `'email'` / `'totp'` |
| `security.requireTwoFactor` | Account-level forced 2FA (admin restriction) |

### 4.3 Session States

| State | Duration | Description |
|---|---|---|
| `pending_2fa` | 5 min | Password verified but 2FA incomplete (`cws_2fa_pending` cookie) |
| `pending_password_change` | 10 min | Authenticated but must change password (`cws_pw_pending` cookie) |
| `active` | 15 min rolling | Fully authenticated session |
| `refreshing` | During POST `/api/auth/refresh` | Token rotation in progress |
| `expired` | After idle/absolute timeout | Session invalidated |
| `revoked` | Immediate | Explicitly terminated by user/admin/system |

---

## 5. Sensitive Tokens and Secrets

### 5.1 Tokens in Transit

| Token | Storage | Secret? | Purpose |
|---|---|---|---|
| `cws_session` | Cookie (HttpOnly) | No — HMAC-signed session ID | Identifies session |
| `cws_refresh` | Cookie (HttpOnly) | Yes — opaque random, hash-only in DB | Rotates access token |
| `cws_device_token` | Cookie (HttpOnly) | No — HMAC-signed device record ID | Binds session to device |
| `cws_2fa_pending` | Cookie (HttpOnly) | Yes — random 32-byte, hash-only in DB | Intermediate 2FA state |
| `cws_pw_pending` | Cookie (HttpOnly) | No — HMAC-signed user ID | Force-change identity |
| `cws_oauth_state` | Cookie (HttpOnly) | Yes — state/verifier/nonce for OAuth | CSRF + PKCE protection |
| Google `id_token` | Server-only (exchanged) | N/A — JWT from Google | Identity verification |
| Mobile JWT | Bearer header | Yes — EdDSA-signed, server-issued | Mobile API authentication |

### 5.2 Server Secrets

| Secret | Length | Purpose | Boot Guard |
|---|---|---|---|
| `SESSION_SECRET` | ≥32 chars | HMAC-signs session + device tokens | Fail-closed in prod |
| `ARGON2_SECRET` | ≥16 chars | Pepper for Argon2id hashing | Fail-closed in prod |
| `GOOGLE_CLIENT_SECRET` | Variable | OAuth code exchange | Required when `GOOGLE_CLIENT_ID` set |
| `EMAIL_PASSWORD` | Variable | Gmail SMTP app password | Required when `EMAIL_USER` set |
| `ADMIN_SEED_PASSWORD` | ≥12 chars | Initial admin password | Fail-closed in prod |
| `MONGODB_URI` | URL | Database connection | Fail-closed in prod |

### 5.3 Cryptographic Operations

| Operation | Algorithm | Parameters |
|---|---|---|
| Password hashing | Argon2id | m=65536 (64MB), t=3, p=1, optional pepper |
| Session signing | HMAC-SHA256 | `SESSION_SECRET` key |
| Session verification | HMAC-SHA256 + timing-safe compare | Constant-time comparison |
| Token storage | SHA-256 | No salt needed (random tokens) |
| Refresh token | `crypto.randomBytes(48)` | 96 hex chars, only hash stored |
| 2FA code | CSRPNG → SHA-256 → `% 1000000` | 6-digit numeric |
| TOTP | otplib (RFC 6238) | 30s period, SHA-1 |
| WebAuthn | FIDO2/WebAuthn | SimpleWebAuthn library |
| OAuth id_token | RSA-SHA256 | JWKS verification against Google keys |
| Mobile JWT | EdDSA (Ed25519) | `jose` library, JWKS endpoint |

---

## 6. Security Controls Map

### 6.1 Authentication Controls

| Control | Implementation | ASVS |
|---|---|---|
| Timing side-channel mitigation | `DUMMY_HASH` + random delay for unknown emails | V2.1.1 |
| Account lockout | 5 failures → 15 min (atomic conditional write) | V2.2.1 |
| Rate limiting | Per-IP + per-identifier, MongoDB-backed | V2.2.1 |
| Password strength | zxcvbn-ts + configurable policy | V2.1.1 |
| Password reuse prevention | History-based Argon2id verification | V2.1.1 |
| Password expiry | Configurable days, forced change | V2.1.1 |

### 6.2 Session Controls

| Control | Implementation | ASVS |
|---|---|---|
| Session signing | HMAC-SHA256 | V3.2.1 |
| Absolute expiry | 15 min access, 7 day refresh | V3.3.1 |
| Idle timeout | 30 min inactivity | V3.3.1 |
| Refresh rotation | Atomic replace + reuse detection | V3.3.2 |
| Device binding | HMAC-signed device token matched to session | V3.4.1 |
| Concurrent limit | 5 sessions per user (hardcoded) | V3.3.1 |
| Account security version | Bumped on password change, invalidates all sessions | V3.3.2 |

### 6.3 CSRF / Origin Controls

| Control | Implementation | ASVS |
|---|---|---|
| Server Action CSRF | `withCsrfGuard` → `assertSameOrigin()` | V4.1.1 |
| Route Handler CSRF | `assertSameOriginStrict()` | V4.1.1 |
| Login Route CSRF | `Sec-Fetch-Site: same-origin` check | V4.1.1 |
| Cookie SameSite | Session=Lax, Refresh=Strict, Pending=Strict | V3.5.1 |

### 6.4 Access Control

| Control | Implementation | ASVS |
|---|---|---|
| Role hierarchy | super_admin > admin > manager | V4.1.2 |
| CMS permissions | Granular per-manager | V4.1.2 |
| Ownership checks | Session/device ownership verified before mutation | V4.1.2 |
| OAuth auto-linking | Disabled (FIX-C3) — pre-provisioned only | V2.6.2 |

### 6.5 Crypto Controls

| Control | Implementation | ASVS |
|---|---|---|
| Cookie Secure flag | `SECURE_COOKIES` env, fail-closed prod | V3.5.1 |
| Cookie HttpOnly | All auth cookies | V3.5.1 |
| Password pepper | `ARGON2_SECRET`, fail-closed prod | V2.4.1 |
| Timing-safe compare | `crypto.timingSafeEqual` for HMAC | V2.1.1 |
| CSP nonce | Per-request, no unsafe-inline | V14.4.3 |

---

## 7. Potential Bypass Points and Risks

### 7.1 Identified Risks

| Risk | Severity | Location | Description |
|---|---|---|---|
| **R-1: Debug filesystem writes** | Medium | `verify-2fa.ts:125-138` | `fs.appendFileSync` writes auth data to filesystem on every 2FA verification |
| **R-2: Proxy HMAC-only check** | Low | `proxy.ts:78` | Edge guard verifies HMAC but not DB state; stale/revoked sessions pass until DAL validates |
| **R-3: ensureDeviceId fire-and-forget** | Low | `proxy.ts:63` | `.catch(() => {})` silently swallows device ID errors; request proceeds without device token |
| **R-4: Geo-IP fail-open** | Low | `geoip.ts` | No geo data → no country-change detection → step-up MFA skipped for country changes |
| **R-5: Concurrent session limit hardcoded** | Info | `session.service.ts:78` | Limit of 5 sessions is not configurable |
| **R-6: `cws_session` SameSite=Lax** | Info | `cookies.ts:52` | Intentional design, but Lax allows cross-site top-level GET to carry session cookie |
| **R-7: Unimplemented risk signals** | Medium | `signals.ts:109-114` | `isUnusualNetwork`, `isAnonymizingNetwork`, `isMaliciousIp`, `impossibleTravel` always `false` |
| **R-8: `@ts-expect-error` in risk signals** | Low | `signals.ts:99` | `passwordChangedAt` not modeled in types |
| **R-9: Dead code** | Low | `login.ts:84-86` | `step_up` return status never produced by `LoginService` |
| **R-10: `cws_2fa_pending` SameSite mismatch** | Low | `google/callback:123` | OAuth callback sets 2FA pending cookie with Lax, but login action sets it with Strict |
| **R-11: No WebAuthn passwordless login** | Info | `mfa.service.ts` | Passwordless login options exist but are not exposed via a public login route |
| **R-12: TOTP replay window** | Low | `mfa.service.ts:106` | `afterTimeStep` prevents immediate replay but the window is not bounded (otplib default) |

### 7.2 Architectural Observations

1. **No third-party auth library**: The entire authentication stack is custom-built. This provides maximum control but increases maintenance burden and the risk of subtle bugs.

2. **MongoDB as single state store**: All rate limiting, session management, and token storage use MongoDB. This provides consistency across serverless instances but couples auth availability to database availability.

3. **Two-path session validation**: `proxy.ts` (edge, HMAC-only) and `dal.ts` (server, full DB) create a two-tier auth check. The proxy is fast but allows revoked sessions through to the DAL layer.

4. **Pending cookie pattern**: The `cws_2fa_pending` and `cws_pw_pending` cookies create intermediate authentication states. These are short-lived (5-10 min) and HMAC-signed, but they represent a window where a user is partially authenticated.

5. **Risk engine with incomplete signals**: The risk evaluation pipeline is well-architected but several signal sources (IP reputation, Tor/VPN detection, impossible travel) are placeholders, reducing effectiveness.

6. **No explicit reauthentication**: There is no step-up reauthentication for sensitive actions (email change, account deletion). The `forcePasswordChange` flag is the only mechanism.

7. **Mobile API uses JWT**: The mobile API uses EdDSA JWTs instead of cookies, with a separate JWKS endpoint. The `MOBILE_JWT_*` env vars are commented out, indicating this is not yet deployed.

---

## 8. Source File Map

### Core Auth Files

| File | Lines | Purpose |
|---|---|---|
| `src/proxy.ts` | 119 | Edge route guard + CSP nonce |
| `src/auth/dal.ts` | 171 | Data access layer (session/role checks) |
| `src/auth/config/env.ts` | 435 | Environment schema + security config |
| `src/auth/crypto/token.ts` | 65 | Token generation, HMAC signing, timing-safe verify |
| `src/auth/crypto/password.ts` | 33 | Argon2id hash/verify |
| `src/auth/crypto/constants.ts` | 6 | DUMMY_HASH for timing mitigation |
| `src/auth/lib/cookies.ts` | 120 | Cookie option factories |
| `src/auth/lib/csrf.ts` | 37 | CSRF guard wrapper |
| `src/auth/lib/request.ts` | 166 | IP resolution, origin/CSRF checks |
| `src/auth/lib/device.ts` | 214 | Device identity (HMAC-signed tokens) |
| `src/auth/lib/geoip.ts` | 137 | Geo-IP lookup (fail-open) |
| `src/auth/lib/mobile.ts` | 86 | Bearer JWT auth for mobile APIs |
| `src/auth/errors/auth-errors.ts` | 119 | Error hierarchy |

### Services

| File | Lines | Purpose |
|---|---|---|
| `src/auth/services/login.service.ts` | 401 | Login orchestration |
| `src/auth/services/session.service.ts` | 592 | Session lifecycle + refresh rotation |
| `src/auth/services/logout.service.ts` | 38 | Logout |
| `src/auth/services/password.service.ts` | 309 | Password change/reset/policy |
| `src/auth/services/two-factor.service.ts` | 152 | Email 2FA codes |
| `src/auth/services/mfa.service.ts` | 348 | TOTP + WebAuthn |
| `src/auth/services/oauth.service.ts` | 600 | Google OAuth PKCE |
| `src/auth/services/rate-limit.service.ts` | 59 | Brute-force protection |
| `src/auth/services/admin.service.ts` | 82 | Admin session revocation |
| `src/auth/services/device.service.ts` | — | Device management |
| `src/auth/services/alerting.service.ts` | — | Security event alerting |
| `src/auth/services/mailer.ts` | — | Email transport |

### Actions

| File | Lines | Purpose |
|---|---|---|
| `src/auth/actions/login.ts` | 109 | Login Server Action |
| `src/auth/actions/verify-2fa.ts` | 212 | Email 2FA verification |
| `src/auth/actions/verify-totp.ts` | 171 | TOTP verification |
| `src/auth/actions/change-password.ts` | 96 | Password change |
| `src/auth/actions/password-reset.ts` | 151 | Password reset request + completion |
| `src/auth/actions/session.ts` | 163 | Session revocation (single, all) |
| `src/auth/actions/mfa.ts` | 89 | TOTP enrollment/disable |
| `src/auth/actions/device.ts` | 246 | Device trust/block/rename |
| `src/auth/actions/recovery-codes.ts` | 91 | Recovery code lifecycle |
| `src/auth/actions/admin.ts` | 50 | Admin session revocation |
| `src/auth/actions/user-management.ts` | 117 | User CRUD |

### Risk Evaluation

| File | Lines | Purpose |
|---|---|---|
| `src/auth/risk/types.ts` | 65 | Type definitions |
| `src/auth/risk/evaluate-login-risk.ts` | 77 | Orchestration pipeline |
| `src/auth/risk/signals.ts` | 120 | Signal collection |
| `src/auth/risk/score.ts` | 128 | Weighted scoring |
| `src/auth/risk/policy.ts` | 82 | 2FA policy resolution |

### API Routes

| File | Lines | Purpose |
|---|---|---|
| `src/app/api/auth/login/route.ts` | 40 | Login endpoint (Sec-Fetch CSRF) |
| `src/app/api/auth/logout/route.ts` | 53 | Logout endpoint |
| `src/app/api/auth/refresh/route.ts` | 106 | Token refresh endpoint |
| `src/app/api/auth/google/route.ts` | 37 | OAuth start |
| `src/app/api/auth/google/callback/route.ts` | 187 | OAuth callback |
| `src/app/api/auth/webauthn/*/route.ts` | — | WebAuthn ceremony endpoints |
