# Authentication Architecture & Component Overview

**Document Path**: `/docs/architecture/authentication-overview.md`  
**Related Documents**: [Architecture Index](file:///Users/User/Documents/projects/cws-proj/cws-next-app/docs/architecture/README.md) | [Workflows](file:///Users/User/Documents/projects/cws-proj/cws-next-app/docs/architecture/authentication-workflows.md) | [Security Findings](file:///Users/User/Documents/projects/cws-proj/cws-next-app/docs/architecture/security-findings.md)

---

## 1. Executive Summary

CWS Next App uses a custom, multi-surface authentication engine built directly on the native MongoDB driver (`mongodb`). It provides secure authentication for both a web-based administrative dashboard (`src/app/(admin)/dashboard/`) and a RESTful mobile API (`src/app/api/mobile/v1/`).

Key characteristics include:
- **No Third-Party Frameworks**: Operates without Auth.js, NextAuth, Passport, or Clerk.
- **Argon2id Password Hashing**: Hashed with salt, memory/cost constraints, and an optional secret application pepper.
- **Dual Transport Mechanisms**: Secure HMAC-SHA256 signed HTTP cookies for web browsing, and EdDSA (Ed25519) signed JWT access tokens with opaque refresh tokens for mobile apps.
- **Strict Single-Role RBAC**: Enforces role checks (`admin`, `member`, `viewer`) server-side via the Data Access Layer ([src/auth/dal.ts](file:///Users/User/Documents/projects/cws-proj/cws-next-app/src/auth/dal.ts)).
- **Defense-in-Depth Protection**: Integrates atomic rate limiting, brute-force lockout, step-up MFA, device binding, and per-request CSP nonces.

---

## 2. Authentication Components Inventory

The table below documents every authentication component, module, and helper across the system:

| Component | Responsibility | File Path | Main Functions | Called By |
| :--- | :--- | :--- | :--- | :--- |
| **Routing Proxy Guard** | Optimistic session cookie verification & CSP nonce injection | [src/proxy.ts](file:///Users/User/Documents/projects/cws-proj/cws-next-app/src/proxy.ts) | `proxy()`, `buildCsp()` | Next.js Edge Runtime (all `/dashboard/*` requests) |
| **Data Access Layer (DAL)** | Server-side session retrieval, authentication assertions, RBAC checks | [src/auth/dal.ts](file:///Users/User/Documents/projects/cws-proj/cws-next-app/src/auth/dal.ts) | `getAuthSession()`, `requireAuth()`, `requireActiveSession()`, `requireRole()` | Server Components, Server Actions, Route Handlers |
| **Login Service** | Password credential verification, lockout checks, MFA challenge triggers | [src/auth/services/login.service.ts](file:///Users/User/Documents/projects/cws-proj/cws-next-app/src/auth/services/login.service.ts) | `loginWithPassword()` | `loginAction` ([src/auth/actions/login.ts](file:///Users/User/Documents/projects/cws-proj/cws-next-app/src/auth/actions/login.ts)) |
| **Session Service** | Session creation, expiration enforcement, idle validation, refresh token rotation | [src/auth/services/session.service.ts](file:///Users/User/Documents/projects/cws-proj/cws-next-app/src/auth/services/session.service.ts) | `createSession()`, `validateSession()`, `rotateRefreshToken()`, `terminateSession()` | `LoginService`, `OAuthService`, `logoutRoute`, `refreshRoute` |
| **OAuth Service** | Google OIDC authorization URL creation, PKCE token exchange, JWKS signature verification | [src/auth/services/oauth.service.ts](file:///Users/User/Documents/projects/cws-proj/cws-next-app/src/auth/services/oauth.service.ts) | `buildAuthorizationUrl()`, `handleCallback()`, `handleMobileIdToken()` | Google API routes ([src/app/api/auth/google/route.ts](file:///Users/User/Documents/projects/cws-proj/cws-next-app/src/app/api/auth/google/route.ts)) |
| **MFA Service** | Multi-factor authentication management (WebAuthn, TOTP, Email OTP, Recovery Codes) | [src/auth/services/mfa.service.ts](file:///Users/User/Documents/projects/cws-proj/cws-next-app/src/auth/services/mfa.service.ts) | `verifyTotp()`, `verifyWebAuthn()`, `verifyEmailOtp()`, `consumeRecoveryCode()` | `verify2faAction`, WebAuthn API Route Handlers |
| **Mobile Auth Service** | Mobile authentication orchestration, password verification, EdDSA JWT issuance | [src/auth/services/mobile-auth.service.ts](file:///Users/User/Documents/projects/cws-proj/cws-next-app/src/auth/services/mobile-auth.service.ts) | `loginWithPassword()`, `refreshTokens()`, `getMe()` | Mobile REST API Routes ([src/app/api/mobile/v1/auth/*](file:///Users/User/Documents/projects/cws-proj/cws-next-app/src/app/api/mobile/v1/auth/)) |
| **Mobile Token Service**| Asymmetric EdDSA (Ed25519) JWT signing, public key rotation, claims verification | [src/auth/services/mobile-token.service.ts](file:///Users/User/Documents/projects/cws-proj/cws-next-app/src/auth/services/mobile-token.service.ts) | `issueAccessToken()`, `verifyAccessToken()` | Mobile Auth Handlers, Mobile API Middleware |
| **Device Service** | Device identity registration, geolocation tracking, device blocking enforcement | [src/auth/services/device.service.ts](file:///Users/User/Documents/projects/cws-proj/cws-next-app/src/auth/services/device.service.ts) | `registerLogin()`, `toggleBlockDevice()` | `SessionService`, Device Management Server Actions |
| **Password Service** | Password policy enforcement, expiry checks, password history rotation | [src/auth/services/password.service.ts](file:///Users/User/Documents/projects/cws-proj/cws-next-app/src/auth/services/password.service.ts) | `changePassword()`, `isExpired()`, `resetPassword()` | Change Password Server Actions, Admin Service |
| **Rate Limit Service** | MongoDB-backed sliding window rate limiting for IP & user identifiers | [src/auth/services/rate-limit.service.ts](file:///Users/User/Documents/projects/cws-proj/cws-next-app/src/auth/services/rate-limit.service.ts) | `checkRateLimit()`, `recordAttempt()` | `LoginService`, `PasswordService` |
| **Alerting Service** | Security event logging, failure spike detection, theft notifications | [src/auth/services/alerting.service.ts](file:///Users/User/Documents/projects/cws-proj/cws-next-app/src/auth/services/alerting.service.ts) | `recordFailure()`, `alertReuseDetected()` | `LoginService`, `SessionService`, `OAuthService` |
| **Password Crypto** | Argon2id hashing & verification with timing side-channel protection | [src/auth/crypto/password.ts](file:///Users/User/Documents/projects/cws-proj/cws-next-app/src/auth/crypto/password.ts) | `hashPassword()`, `verifyPassword()` | `LoginService`, `PasswordService` |
| **Token Crypto** | HMAC-SHA256 cookie signing & opaque token generation | [src/auth/crypto/token.ts](file:///Users/User/Documents/projects/cws-proj/cws-next-app/src/auth/crypto/token.ts) | `signSessionId()`, `verifySessionSignature()`, `generateRefreshToken()` | `proxy.ts`, `dal.ts`, `SessionService` |
| **Device Utilities** | Client device ID resolution and HMAC-signed server token handling | [src/auth/lib/device.ts](file:///Users/User/Documents/projects/cws-proj/cws-next-app/src/auth/lib/device.ts) | `ensureDeviceId()`, `setServerDeviceToken()`, `verifyServerDeviceToken()` | `proxy.ts`, `LoginService`, `SessionService` |
| **Cookie Utilities** | HTTP cookie management (setting & clearing auth cookies) | [src/auth/lib/cookies.ts](file:///Users/User/Documents/projects/cws-proj/cws-next-app/src/auth/lib/cookies.ts) | `setSessionCookie()`, `clearAuthCookies()`, `setPendingCookie()` | Server Actions, API Route Handlers |
| **CSRF Protection** | Origin and Referer validation for state-changing POST/PUT/DELETE requests | [src/auth/lib/csrf.ts](file:///Users/User/Documents/projects/cws-proj/cws-next-app/src/auth/lib/csrf.ts) | `verifyCsrfOrigin()` | Server Actions, API Route Handlers |

---

## 3. Authentication Data & Security Specification

### User Identity Source
- **Primary Source**: `users` collection in MongoDB ([src/database/schemas/users.schema.ts](file:///Users/User/Documents/projects/cws-proj/cws-next-app/src/database/schemas/users.schema.ts)).
- **Email Resolution**: Contact emails reside in `user_emails` collection (`user_emails.email`), linked via `userId`.
- **No Public Registration**: Accounts must be explicitly seeded ([scripts/db-seed.ts](file:///Users/User/Documents/projects/cws-proj/cws-next-app/scripts/db-seed.ts)) or provisioned by an admin ([src/auth/services/admin.service.ts](file:///Users/User/Documents/projects/cws-proj/cws-next-app/src/auth/services/admin.service.ts)).

### Web Session Storage & Cookie Specifications

The application uses five specific HTTP cookies:

| Cookie Name | Purpose | Value Format | Security Attributes | TTL |
| :--- | :--- | :--- | :--- | :--- |
| `cws_session` | Main authenticated web session cookie | `sessionId.hmacSignature` | `HttpOnly`, `SameSite=Lax`, `Path=/`, `Secure` (in prod) | 15 min (access), 7 days (max rolling) |
| `cws_2fa_pending` | Temporary challenge cookie during MFA verification | `userId.hmacSignature` | `HttpOnly`, `SameSite=Lax`, `Path=/`, `Secure` | 10 minutes |
| `cws_pw_pending` | Temporary challenge cookie during forced password change | `userId.hmacSignature` | `HttpOnly`, `SameSite=Lax`, `Path=/`, `Secure` | 15 minutes |
| `cws_stepup_pending`| Temporary challenge cookie during location step-up 2FA | `userId.hmacSignature` | `HttpOnly`, `SameSite=Lax`, `Path=/`, `Secure` | 10 minutes |
| `cws_device_token` | Server-issued device identity token | `deviceObjectId.hmacSignature` | `HttpOnly`, `SameSite=Lax`, `Path=/`, `Secure` | 1 year |

### Token Definitions & Lifetimes
1. **Access Session**: Stored in `sessions` collection. Controlled by `ACCESS_SESSION_TTL_MS` (default 15 minutes).
2. **Idle Timeout**: Session expires if inactive for `IDLE_TIMEOUT_MS` (default 30 minutes). Checked on every `validateSession()`.
3. **Refresh Tokens**: Opaque 256-bit entropy tokens stored as SHA-256 hashes in `refresh_tokens` collection. Max lifetime `REFRESH_TOKEN_TTL_MS` (default 7 days). Feature atomic rotation (`atomicReplace`) and family revocation upon reuse detection.
4. **Mobile Access JWTs**: EdDSA (Ed25519) signed JWTs. Lifetime `MOBILE_ACCESS_TOKEN_TTL_MS` (default 15 minutes). Public keys served via JWKS endpoint ([src/app/api/mobile/v1/.well-known/jwks.json/route.ts](file:///Users/User/Documents/projects/cws-proj/cws-next-app/src/app/api/mobile/v1/.well-known/jwks.json/route.ts)).

### Password Hashing Algorithm
- **Algorithm**: Argon2id via `argon2` npm library.
- **Parameters**: `memoryCost: 65536` (64 MB), `timeCost: 3` iterations, `parallelism: 4`.
- **Application Pepper**: Blended with password before hashing using `ARGON2_SECRET` environment variable ([src/auth/config/env.ts](file:///Users/User/Documents/projects/cws-proj/cws-next-app/src/auth/config/env.ts)).
- **Timing Protection**: Unknown email lookups execute a dummy Argon2id verification against `DUMMY_HASH` plus a randomized delay (0-50ms) to prevent email enumeration timing side-channels ([src/auth/services/login.service.ts](file:///Users/User/Documents/projects/cws-proj/cws-next-app/src/auth/services/login.service.ts)).

---

## 4. Multi-Tier Authentication Architecture Diagram

The flowchart below illustrates the exact interactions between all system layers during an authentication lifecycle request:

```mermaid
flowchart TB
    subgraph Clients["Client Surfaces"]
        WebBrowser["Web Browser (Dashboard)"]
        MobileApp["Mobile REST Client"]
    end

    subgraph EdgeLayer["Edge / Middleware Layer (src/proxy.ts)"]
        ProxyGuard["Next.js Proxy Guard"]
        CSPNonce["Generate & Inject x-csp-nonce"]
        VerifyCookieSig["Verify cws_session HMAC Signature"]
    end

    subgraph AppLayer["Next.js Server Layer"]
        ServerComp["Server Components (src/app/)"]
        ServerAction["Server Actions (src/auth/actions/)"]
        RouteHandler["Route Handlers (src/app/api/)"]
        DAL["Data Access Layer (src/auth/dal.ts)"]
    end

    subgraph ServiceLayer["Auth Business Services (src/auth/services/)"]
        LoginSvc["LoginService"]
        SessionSvc["SessionService"]
        OAuthSvc["OAuthService"]
        MfaSvc["MfaService"]
        MobileTokenSvc["MobileTokenService"]
        RateLimitSvc["RateLimitService"]
    end

    subgraph ExternalProvider["External Services"]
        GoogleOIDC["Google OAuth 2.0 / JWKS"]
        CloudinaryAPI["Cloudinary Media API"]
    end

    subgraph DatabaseLayer["MongoDB Collections (src/database/)"]
        UsersCol[("users")]
        SessionsCol[("sessions")]
        RefreshTokensCol[("refresh_tokens")]
        DevicesCol[("devices")]
        AuditLogsCol[("audit_logs")]
    end

    %% Web Flow Connections
    WebBrowser -->|HTTP Request| ProxyGuard
    ProxyGuard --> VerifyCookieSig
    VerifyCookieSig -->|Valid Signature| CSPNonce
    CSPNonce -->|Pass Request| ServerComp
    WebBrowser -->|Submit Form| ServerAction
    
    ServerComp -->|Call requireActiveSession()| DAL
    ServerAction -->|Call requireRole()| DAL
    DAL -->|Lookup & Validate| SessionSvc

    %% Mobile Flow Connections
    MobileApp -->|HTTP Bearer Token| RouteHandler
    RouteHandler -->|Verify EdDSA Claims| MobileTokenSvc

    %% Service Operations
    ServerAction --> LoginSvc
    ServerAction --> MfaSvc
    RouteHandler --> OAuthSvc
    
    LoginSvc -->|Check Brute Force| RateLimitSvc
    OAuthSvc -->|Exchange Code / Fetch JWKS| GoogleOIDC
    
    SessionSvc -->|Read/Write Session Doc| SessionsCol
    SessionSvc -->|Atomic Rotation| RefreshTokensCol
    LoginSvc -->|User Lookup| UsersCol
    
    %% Audit Logging
    LoginSvc -->|Write Audit Entry| AuditLogsCol
    SessionSvc -->|Log Device Identity| DevicesCol

    style WebBrowser fill:#2563eb,color:#fff
    style MobileApp fill:#2563eb,color:#fff
    style ProxyGuard fill:#7c3aed,color:#fff
    style DAL fill:#059669,color:#fff
    style DatabaseLayer fill:#d97706,color:#fff
```

---

## 5. File Dependency Map

The dependency table below documents how key authentication files import and call each other:

| Source File | Imports / Calls | Target File | Purpose |
| :--- | :--- | :--- | :--- |
| `src/proxy.ts` | `verifySessionSignature` | `src/auth/crypto/token.ts` | Edge-side optimistic session signature validation |
| `src/proxy.ts` | `ensureDeviceId` | `src/auth/lib/device.ts` | Issue/maintain client device ID cookie |
| `src/auth/dal.ts` | `validateSession` | `src/auth/services/session.service.ts` | Server-side session verification |
| `src/auth/dal.ts` | `findById` | `src/auth/repositories/user.repository.ts` | Retrieve user for role assertion |
| `src/auth/actions/login.ts` | `loginWithPassword` | `src/auth/services/login.service.ts` | Execute credential verification flow |
| `src/auth/actions/login.ts` | `setSessionCookie` | `src/auth/lib/cookies.ts` | Set HTTP session cookie on successful login |
| `src/auth/services/login.service.ts` | `checkRateLimit` | `src/auth/services/rate-limit.service.ts` | Check IP & user brute-force limits |
| `src/auth/services/login.service.ts` | `verifyPassword` | `src/auth/crypto/password.ts` | Verify Argon2id hash |
| `src/auth/services/session.service.ts` | `generateRefreshToken` | `src/auth/crypto/token.ts` | Mint opaque refresh tokens |
| `src/auth/services/session.service.ts` | `atomicReplace` | `src/auth/repositories/refresh-token.repository.ts` | Single-query atomic token rotation |
| `src/auth/services/oauth.service.ts` | `fetchGoogleJwks` | Google OIDC Endpoint | Fetch RS256 public keys for id_token verification |
