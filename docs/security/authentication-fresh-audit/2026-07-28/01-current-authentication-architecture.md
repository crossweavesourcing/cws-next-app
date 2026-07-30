# Current Authentication Architecture

## System Overview

The CWS Next App uses a custom-built authentication system with no third-party auth framework (no NextAuth/Auth.js). The architecture follows a layered pattern with clear separation between HTTP handling, business logic, and data persistence.

### Component Layers

```
┌─────────────────────────────────────────────────────────────────────┐
│                         Browser / Mobile App                        │
│  (cws_session, cws_refresh, cws_device, cws_device_token cookies)  │
└──────────────────────────────────┬──────────────────────────────────┘
                                   │ HTTPS
┌──────────────────────────────────▼──────────────────────────────────┐
│                    Next.js Middleware (proxy.ts)                     │
│  - Edge-executed session presence check (HMAC verify, no DB lookup) │
│  - CSP nonce generation (per-request, crypto.randomBytes(16))       │
│  - Public auth page whitelist bypass                                │
└──────────────────────────────────┬──────────────────────────────────┘
                                   │
┌──────────────────────────────────▼──────────────────────────────────┐
│              Route Handlers / Server Actions (App Router)           │
│  /api/auth/login        — Email/password login                     │
│  /api/auth/logout       — Session termination                      │
│  /api/auth/refresh      — Refresh token rotation                   │
│  /api/auth/google       — OAuth start (GET → redirect)             │
│  /api/auth/google/callback — OAuth callback (GET → redirect)       │
│  /api/auth/webauthn/*   — WebAuthn registration/authentication     │
│  Server Actions (src/auth/actions/*) — Form-driven auth flows      │
│                                                                     │
│  All endpoints: input validation → auth check → CSRF guard →       │
│                 business logic → audit log                          │
└──────────────────────────────────┬──────────────────────────────────┘
                                   │
┌──────────────────────────────────▼──────────────────────────────────┐
│                       Service Layer (src/auth/services/)            │
│  LoginService, SessionService, PasswordService, OAuthService,      │
│  TwoFactorService, MfaService, LogoutService, RateLimitService,    │
│  AlertingService, DeviceService, AccountSecurityService,           │
│  FriendlySecurityService                                           │
│                                                                     │
│  Owns: business rules, risk evaluation, token generation,          │
│  cryptographic operations, rate-limiting logic                      │
└──────────────────────────────────┬──────────────────────────────────┘
                                   │
┌──────────────────────────────────▼──────────────────────────────────┐
│              Repository Layer (src/auth/repositories/)              │
│  UserRepository, SessionRepository, RefreshTokenRepository,        │
│  LoginAttemptRepository, AuditLogRepository, VerificationTokenRepo,│
│  DeviceRepository, MfaRepository, OAuthAccountRepository,          │
│  RecoveryCodeRepository, PendingAuthenticationRepository,          │
│  PasswordPolicyRepository, PasswordHistoryRepository,              │
│  WebAuthnChallengeRepository, MobileChallengeRepository            │
│                                                                     │
│  Owns: MongoDB collection access, atomic operations, queries       │
└──────────────────────────────────┬──────────────────────────────────┘
                                   │
┌──────────────────────────────────▼──────────────────────────────────┐
│                   MongoDB (mongodb 6.16.0, raw driver)              │
│  Collections: users, sessions, refresh_tokens, login_attempts,     │
│  audit_logs, verification_tokens, devices, mfa_credentials,        │
│  oauth_accounts, recovery_codes, pending_authentications,          │
│  password_policies, password_history, webauthn_challenges,         │
│  mobile_challenges                                                  │
└─────────────────────────────────────────────────────────────────────┘
```

### External Dependencies

| Service | Purpose | Trust Level |
|---|---|---|
| Google OAuth (accounts.google.com) | Identity assertion via OIDC id_token | Trusted (identity only) |
| Gmail SMTP (Nodemailer) | 2FA code delivery, password reset links, alerts | Delivery only |
| Geo-IP endpoint (GEOIP_LOOKUP_URL) | Country/region/city for risk evaluation | Untrusted, fail-open |
| geoip-lite (offline) | Fallback geo lookup | Local data, best-effort |
| Google JWKS (googleapis.com/oauth2/v3/certs) | id_token signature verification | Trusted |
| Cloudinary | Image upload (non-auth) | Out of scope |

## Trust Boundaries

### Boundary 1: Untrusted Zone → Application

**Boundary:** All client-supplied data crosses from untrusted to semi-trusted.

| Input | Validation Point | Controls |
|---|---|---|
| HTTP headers (User-Agent, Referer) | `getClientIp()`, `SessionService.parseUserAgent()` | Read-only, not trusted for authz |
| Cookies (read) | `proxy.ts` signature check, `ensureDeviceId()` | HMAC-signed cookies are verified before trust |
| POST body / query params | `loginSchema.safeParse()`, `passwordChangeSchema.safeParse()`, Zod | Schema validation at every entry point |
| Google OAuth callback params | `route.ts` parameter extraction | State verified against signed cookie |

### Boundary 2: CSRF/Origin Guard

**Boundary:** All state-changing endpoints require same-origin verification.

| Control | Implementation | Scope |
|---|---|---|
| `assertSameOrigin()` | `src/auth/lib/request.ts:108` | Server Actions (via `withCsrfGuard`) |
| `assertSameOriginStrict()` | `src/auth/lib/request.ts:143` | Route Handlers (refresh, logout) |
| Next.js built-in | Encrypted action IDs + POST-only | Server Actions baseline |
| SameSite cookie policy | `src/auth/lib/cookies.ts:30-43` | Session=Lax, Refresh=Strict, Pending=Strict |

### Boundary 3: Application → Trusted Zone

**Boundary:** Server-side code accessing secrets, crypto, and database.

| Resource | Access Control |
|---|---|
| `SESSION_SECRET` | `getEnv()` — validated at boot, fail-closed in production |
| `ARGON2_SECRET` (pepper) | `getEnv()` — fail-closed in production if missing/short |
| `TOTP_ENCRYPTION_KEY` | `getEnv()` — fail-closed in production if missing |
| MongoDB | Singleton client, typed collections, no ODM |
| `crypto.*` | Node.js built-in — CSPRNG for all token generation |

### Boundary 4: External Identity (Google OAuth)

**Boundary:** Google OAuth tokens are verified but not fully trusted.

| Control | Implementation |
|---|---|
| JWKS-based signature verification | `oauth.service.ts:428-504` — RSA-SHA256 |
| Issuer validation | `iss === 'https://accounts.google.com' \|\| 'accounts.google.com'` |
| Audience validation | `aud` must match `GOOGLE_CLIENT_ID` |
| Nonce replay protection | `nonce` in id_token must match cookie value |
| PKCE (S256) | `code_challenge_method: 'S256'` — prevents code interception |
| Pre-provisioned linking only | No auto-link by verified email (FIX-C3) |

## Authentication States

```
                    ┌──────────────────┐
                    │   unauthenticated │
                    └────────┬─────────┘
                             │ loginWithPassword / loginWithPasskey / handleCallback
                             │
                    ┌────────▼─────────┐    risk === 'block'    ┌────────┐
                    │  first_factor_    │ ──────────────────────► │ locked │
                    │  verified         │                         └────────┘
                    └────────┬─────────┘
                             │
              ┌──────────────┼──────────────┐
              │              │              │
    ┌─────────▼──┐  ┌───────▼─────┐  ┌─────▼──────────┐
    │  fully_     │  │  mfa_       │  │  pending_      │
    │  authenti-  │  │  required   │  │  password_     │
    │  cated      │  │  (2FA pend) │  │  change        │
    └─────┬──────┘  └──────┬──────┘  └───────┬────────┘
          │                │                  │
          │         verify 2FA code     change password
          │                │                  │
          │         ┌──────▼──────┐           │
          │         │  fully_     │◄──────────┘
          │         │  authenti-  │
          │         │  cated      │
          │         └──────┬──────┘
          │                │
    ┌─────▼────────────────▼─────┐
    │  session management        │
    │  - rolling access window   │
    │  - refresh token rotation  │
    │  - idle timeout (30min)    │
    │  - absolute timeout (7d)   │
    │  - concurrent cap (5)      │
    └────────────────────────────┘
```

### State Definitions

| State | Cookie(s) | Description |
|---|---|---|
| `unauthenticated` | None | No valid session |
| `first_factor_verified` | None (transient) | Password/passkey verified, awaiting 2FA decision |
| `second_factor_pending` | `cws_2fa_pending` (5min) | 2FA code sent, awaiting verification |
| `pending_password_change` | `cws_pw_pending` (10min) | Password expired/forced, awaiting change |
| `fully_authenticated` | `cws_session` + `cws_refresh` | Active session with valid tokens |
| `reauthentication_required` | None (transient) | Sudo-mode re-auth for sensitive ops |
| `locked` | None | Account locked (5 failed attempts → 15min) |
| `disabled` | None | Account inactive/suspended/deleted |
| `session_expired` | Cleared | Idle or absolute timeout exceeded |

## Cookie Inventory

| Cookie | Purpose | HttpOnly | Secure | SameSite | MaxAge | Path | Signing |
|---|---|---|---|---|---|---|---|
| `cws_session` | HMAC-signed session ID | Yes | Yes (prod) | Lax | Rolling (15min) | `/` | HMAC-SHA256 |
| `cws_refresh` | Opaque refresh token | Yes | Yes (prod) | Strict | 7 days | `/api/auth/refresh` | None (SHA-256 stored) |
| `cws_device_token` | HMAC-signed device record ID | Yes | Yes (prod) | Lax | 1 year | `/` | HMAC-SHA256 |
| `cws_device` | Client UUID v4 (correlation only) | No | Yes (prod) | Default | 1 year | `/` | None |
| `cws_2fa_pending` | SHA-256 hashed pending auth token | Yes | Yes (prod) | Strict | 5 min | `/` | SHA-256 hash |
| `cws_pw_pending` | HMAC-signed user ID | Yes | Yes (prod) | Strict | 10 min | `/` | HMAC-SHA256 |
| `cws_oauth_state` | JSON (state/codeVerifier/nonce) | Yes | Yes (prod) | Lax | 10 min | `/` | None (state verified separately) |

### Cookie Security Notes

- **`cws_session` is Lax** by design: it must ride top-level same-site navigations for page loads to work. The session cookie alone grants no authorization — it is an opaque HMAC-signed ID validated server-side.
- **`cws_refresh` is Strict**: high-value token only read on same-site XHR/fetch POSTs. Strict blocks cross-site form POST sends (the Lax CSRF hole).
- **`cws_2fa_pending` and `cws_pw_pending` are Strict**: short-lived, high-value, only consumed on same-site POST.
- **`cws_oauth_state` is Lax**: must survive the cross-origin redirect to Google and back. The state is a one-time nonce stored in the cookie; it is not a security token itself — CSRF protection comes from the state parameter in the OAuth redirect.
- **`cws_device_token` is Lax**: must be sent on navigation for the proxy to verify device identity.

## Cryptographic Operations

### Password Hashing

| Parameter | Value | Source |
|---|---|---|
| Algorithm | Argon2id | `argon2` 0.44.0 |
| Memory cost | 65536 (64 MB) | `src/auth/crypto/password.ts:11` |
| Time cost (iterations) | 3 | `src/auth/crypto/password.ts:12` |
| Parallelism | 1 | `src/auth/crypto/password.ts:13` |
| Pepper | `ARGON2_SECRET` (optional, required in prod ≥16 chars) | `src/auth/crypto/password.ts:15` |
| Timing-safe verify | Yes — Argon2.verify is constant-time | `src/auth/crypto/password.ts:26` |

**Dummy hash for timing mitigation:** `src/auth/crypto/constants.ts:5-6` — a precomputed Argon2id hash matching the same parameters, used to pad unknown-email responses to match the known-user verification time.

### Session Signing

| Operation | Implementation |
|---|---|
| Sign | `HMAC-SHA256(sessionId, SESSION_SECRET)` → base64url |
| Format | `<sessionId>.<base64url_signature>` |
| Verify | `crypto.timingSafeEqual()` on signature buffers |
| Source | `src/auth/crypto/token.ts:21-55` |

### Token Generation

| Token | Length | Source | Storage |
|---|---|---|---|
| Session ID | MongoDB ObjectId (12 bytes) | Auto-generated | DB + HMAC-signed cookie |
| Refresh token | 48 bytes (96 hex chars) | `crypto.randomBytes(48)` | SHA-256 hash only in DB |
| Reset token | 32 bytes (64 hex chars) | `crypto.randomBytes(32)` | SHA-256 hash only in DB |
| 2FA pending token | 32 bytes (64 hex chars) | `crypto.randomBytes(32)` | SHA-256 hash only in cookie |
| 2FA code | 6-digit numeric | CSRPNG → SHA-256 → `% 1000000` | SHA-256 hash in DB |
| OAuth state | 32 bytes (64 hex chars) | `crypto.randomBytes(32)` | Signed cookie (JSON) |
| PKCE code_verifier | 48 bytes (96 hex chars) | `crypto.randomBytes(48)` | Signed cookie (JSON) |
| OAuth nonce | 24 bytes (48 hex chars) | `crypto.randomBytes(24)` | Signed cookie (JSON) |
| Device token | HMAC-signed ObjectId + optional nonce | `signSessionId()` | Signed cookie |

### TOTP

| Parameter | Value |
|---|---|
| Library | otplib 13.4.1 |
| Algorithm | RFC 6238 (TOTP) |
| Period | 30 seconds |
| Secret generation | `totp.generateSecret()` |
| Encryption | `TOTP_ENCRYPTION_KEY` (AES-256-GCM via `MfaRepository`) |
| Replay prevention | `afterTimeStep` tracking — each accepted time step is recorded |

### WebAuthn

| Parameter | Value |
|---|---|
| Library | @simplewebauthn/server 13.3.2 |
| RP Name | "CWS Next App" |
| RP ID | Derived from `APP_URL` hostname or `WEBAUTHN_RP_ID` |
| Origin | Derived from `APP_URL` or `WEBAUTHN_ORIGIN` |
| Resident key | Required (discoverable credentials) |
| User verification | Preferred (registration), Required (passwordless) |
| Counter enforcement | Yes — `verifyAuthenticationResponse` checks counter |

### OAuth id_token Verification

| Step | Implementation |
|---|---|
| Algorithm check | `header.alg === 'RS256'` |
| JWKS fetch | Google JWKS endpoint, local cache with `Cache-Control: max-age` |
| Cache miss | Re-fetch on `kid` mismatch (key rotation) |
| Signature | `crypto.verify('RSA-SHA256', data, key, signature)` |
| Issuer | `https://accounts.google.com` or `accounts.google.com` |
| Audience | Must match `GOOGLE_CLIENT_ID` |
| Expiry | `exp + 60s tolerance >= now` |
| Issued-at | `iat - 60s tolerance <= now` |
| Nonce | Verified against stored nonce (replay protection) |
| Source | `src/auth/services/oauth.service.ts:428-504` |

### Device Token

| Operation | Implementation |
|---|---|
| Sign | `signSessionId(recordId, SESSION_SECRET)` — same HMAC as session |
| Format | `<deviceId>.<HMAC>.<nonce?>` |
| Verify | `timingSafeEqual()` on full signed value |
| Source | `src/auth/lib/device.ts:125-154` |

## Risk Evaluation Pipeline

The authentication system includes an adaptive risk evaluation pipeline that runs on every login attempt:

```
Login Attempt
     │
     ▼
┌────────────────────┐
│ collectRiskSignals │  (src/auth/risk/signals.ts)
│ - new device?      │  - checks device registration status
│ - geo change?      │  - compares current country to last known
│ - trusted device?  │  - validates device trust status
└─────────┬──────────┘
          │
          ▼
┌────────────────────┐
│ evaluateRiskScore  │  (src/auth/risk/score.ts)
│ - composite score  │  - weighted signal aggregation
│ - risk level       │  - low / medium / high / critical
└─────────┬──────────┘
          │
          ▼
┌────────────────────────┐
│ resolveTwoFactorPolicy │  (src/auth/risk/policy.ts)
│ - action decision      │  - allow / require_2fa / require_strong_2fa / block
│ - reason codes         │  - NEW_DEVICE, COUNTRY_CHANGE, UNTRUSTED_DEVICE
└─────────┬──────────────┘
          │
          ▼
┌────────────────────┐
│ Audit + Execute    │  (src/auth/risk/evaluate-login-risk.ts)
│ - audit log event  │
│ - issue session /  │
│   require 2FA /    │
│   block            │
└────────────────────┘
```

**Risk policy decision matrix:**

| Risk Level | Action | Notes |
|---|---|---|
| low | `allow` | Direct session issuance |
| medium | `allow` or `require_2fa` | Depends on user preference and device trust |
| high | `require_2fa` | Email 2FA required |
| critical | `block` | Authentication blocked for 15 minutes |

## Step-Up MFA (Item 9)

When `STEP_UP_ENABLED` is true (default), certain login conditions trigger mandatory email 2FA regardless of the user's TOTP/WebAuthn preference:

| Trigger | Condition | Source |
|---|---|---|
| New device | No prior device registration for this user | `signals.ts` → device lookup |
| Country change | Geo-IP country differs from last login | `signals.ts` → `lookupGeo()` |

Step-up is fail-safe: if geo lookup is unavailable (no `GEOIP_LOOKUP_URL` configured), only new-device step-up fires. Country-change step-up is inert without geo resolution.

## Concurrent Session Management

| Control | Value | Implementation |
|---|---|---|
| Max concurrent sessions | 5 | `SessionService.enforceConcurrentSessionLimit()` |
| Eviction strategy | Oldest `lastActivityAt` first | Batch revoke on new login |
| Session access window | 15 minutes (rolling) | Renewed on each refresh token rotation |
| Idle timeout | 30 minutes | Checked at validation and refresh |
| Absolute timeout | 7 days (anchored to `lastFullAuthAt`) | Enforced at refresh time |
| Refresh token rotation | Single-use, chain-linked | Atomic `atomicReplace` prevents concurrent rotation |

## Security Alerting

The `AlertingService` fans security events to two destinations:

1. **Security Alert Sink** — structured JSON events, optionally forwarded to a webhook (`SECURITY_WEBHOOK_URL`). Events include: reuse detection, new device, suspicious location, OAuth failure, login failure spikes.
2. **Email notifications** — sent to the user's primary email for: reuse detection, new device sign-in, suspicious location.

All alerting is best-effort (fire-and-forget) and never blocks the request path.

| Event | Severity | Email to User | Sink Event |
|---|---|---|---|
| `auth.refresh.reuse_detected` | critical | Yes | Yes |
| `auth.login.new_device` | warning | Yes | Yes |
| `auth.login.suspicious` | warning | Yes | Yes |
| `auth.password.reset.success` | warning | No (separate confirm email) | Yes |
| `auth.oauth.failed` | warning | No | Yes |
| `auth.login.failure` | warning | No | Yes |
| `auth.login.failure_spike` | critical | No | Yes |
