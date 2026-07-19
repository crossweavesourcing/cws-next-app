# API Documentation Audit

**Date:** 2026-07-19
**Repository:** cws-next-app
**Auditor:** opencode (automated)

---

## 1. Platform Summary

| Attribute | Value |
|---|---|
| Next.js | 16.2.7 (App Router only) |
| TypeScript | ^5 |
| React | 19.2.4 |
| Zod | 4.4.3 |
| Package manager | pnpm (pnpm-lock.yaml) |
| Runtime | Node.js 22 (Netlify) |
| Deployment | Netlify (`@netlify/plugin-nextjs`) |
| Database | MongoDB 6.x (Atlas driver `mongodb@^6.16.0`) |
| Auth middleware | `src/proxy.ts` (matcher: `/dashboard/:path*` only) |
| Existing OpenAPI/docs packages | **None** |
| Existing CI pipelines | **None** (no `.github/workflows/`, no `.gitlab-ci.yml`) |
| Husky hooks | pre-commit (security-scan + build), pre-push (security-scan + build) |
| Vitest | ^3.2.7 (unit + smoke tests) |
| Playwright | ^1.49.0 (E2E tests) |
| ESLint | ^9 (flat config, eslint-config-next) |
| Lint script | `eslint` (no `--max-warnings`, no `next lint`) |

---

## 2. Existing Validation Landscape

### Zod usage (runtime validation)

| File | Purpose | Schema |
|---|---|---|
| `src/auth/config/env.ts` | Boot-time env validation | `envSchema` (~30 fields) |
| `src/auth/validation/login.schema.ts` | Login form validation | `email`, `password`, `rememberMe` |
| `src/auth/validation/password-policy.ts` | Password change/reset | `passwordChangeSchema`, dynamic `buildPasswordSchema()` |

**All Zod usage is confined to `src/auth/`.** No API route currently uses Zod for request/response validation.

### Manual validation in API routes

| Route | Validation approach |
|---|---|
| `/api/contact` | Inline `sanitizeInput()`, `EMAIL_REGEX`, manual length checks |
| `/api/chat` | Manual `!message` check |
| `/api/mobile/v1/auth/*` | Manual `typeof body.X !== 'string'` checks |
| `/api/auth/webauthn/*` | Manual type checks via `typeof` |
| `/api/auth/logout` | Cookie presence check |
| `/api/auth/refresh` | Cookie presence check |
| `/api/auth/google` | None (redirects to Google) |
| `/api/auth/google/callback` | Manual `searchParams.get()` checks |
| `/api/health` | None |

---

## 3. Complete Route Inventory

### 3.1 General Routes

#### `/api/health` — GET

| Attribute | Detail |
|---|---|
| Source file | `src/app/api/health/route.ts` |
| Method | `GET` |
| Public route | Yes |
| Authentication | None |
| Authorization | None |
| Runtime | Default (Node.js) |
| Request data | None |
| Response data | `{ status: "healthy"|"unhealthy", ... }` or 503 |
| Existing validation | None |
| Documentation readiness | Easy — simple health probe |
| Migration difficulty | Easy |
| Special considerations | Returns 503 on DB failure; should be excluded from auth docs |

#### `/api/contact` — POST

| Attribute | Detail |
|---|---|
| Source file | `src/app/api/contact/route.ts` |
| Method | `POST` |
| Public route | Yes |
| Authentication | None |
| Authorization | None |
| Runtime | Default (Node.js) |
| Request data | `{ name: string, email: string, subject: string, message: string }` |
| Response data | `{ success: true }` or `{ success: false, error: string }` |
| Existing validation | Inline sanitization + manual length checks |
| Documentation readiness | Medium — needs Zod schema extraction |
| Migration difficulty | Easy |
| Special considerations | Forwards to external Google Sheets script; 8s timeout; env-dependent |

#### `/api/chat` — POST

| Attribute | Detail |
|---|---|
| Source file | `src/app/api/chat/route.ts` |
| Method | `POST` |
| Public route | No |
| Authentication | Cookie or Bearer (`authenticateCookieOrBearer`) |
| Authorization | Authenticated user (any role) |
| Runtime | Default (Node.js) |
| Request data | `{ message: string, history?: Array<{ sender: string, text: string }> }` |
| Response data | `{ text: string }` or `{ error: string }` |
| Existing validation | Manual `!message` check |
| Documentation readiness | Medium — needs Zod schema; response is streaming-like but currently buffered |
| Migration difficulty | Medium |
| Special considerations | Proxies to Google Gemini API; exposes system prompt context; should document error codes |

### 3.2 Web Auth Routes

#### `/api/auth/webauthn/login-options` — POST

| Attribute | Detail |
|---|---|
| Source file | `src/app/api/auth/webauthn/login-options/route.ts` |
| Method | `POST` |
| Public route | No (requires `cws_2fa_pending` or `cws_stepup_pending` cookie) |
| Authentication | Pending session cookie (HMAC-signed) |
| Authorization | User with pending MFA challenge |
| Runtime | Default (Node.js) |
| Request data | None (cookie-driven) |
| Response data | WebAuthn `PublicKeyCredentialRequestOptions` |
| Existing validation | Cookie presence + HMAC verification |
| Documentation readiness | Medium — WebAuthn types are complex; reference spec types |
| Migration difficulty | Medium |
| Special considerations | Sets `cws_webauthn_challenge` cookie; 5-min TTL; WebAuthn types from `@simplewebauthn/server` |

#### `/api/auth/webauthn/login-verify` — POST

| Attribute | Detail |
|---|---|
| Source file | `src/app/api/auth/webauthn/login-verify/route.ts` |
| Method | `POST` |
| Public route | No (requires `cws_2fa_pending`/`cws_stepup_pending` + `cws_webauthn_challenge` cookies) |
| Authentication | Pending session cookie (HMAC-signed) |
| Authorization | User with pending MFA challenge |
| Runtime | Default (Node.js) |
| Request data | WebAuthn `AuthenticationResponseJSON` (from `@simplewebauthn/browser`) |
| Response data | `{ success: true }` (sets session + refresh cookies) |
| Existing validation | Cookie presence + HMAC + manual type check on body |
| Documentation readiness | Medium — reference WebAuthn spec types |
| Migration difficulty | Medium |
| Special considerations | Issues session + refresh cookies; clears pending cookies; device token |

#### `/api/auth/logout` — POST

| Attribute | Detail |
|---|---|
| Source file | `src/app/api/auth/logout/route.ts` |
| Method | `POST` |
| Public route | No (requires session cookie) |
| Authentication | Session cookie (`cws_session`) |
| Authorization | Authenticated user |
| Runtime | Default (Node.js) |
| Request data | None (cookie-driven, CSRF-protected) |
| Response data | `204 No Content` |
| Existing validation | `assertSameOriginStrict()` CSRF guard |
| Documentation readiness | Easy — simple endpoint |
| Migration difficulty | Easy |
| Special considerations | CSRF-protected; revokes refresh token family; clears 3 cookies |

#### `/api/auth/refresh` — POST

| Attribute | Detail |
|---|---|
| Source file | `src/app/api/auth/refresh/route.ts` |
| Method | `POST` |
| Public route | No (requires `cws_refresh` cookie) |
| Authentication | Refresh token cookie |
| Authorization | Valid refresh token (with reuse detection) |
| Runtime | Default (Node.js) |
| Request data | None (cookie-driven, CSRF-protected) |
| Response data | `{ ok: true }` (sets rotated cookies) or `{ error: string }` |
| Existing validation | `assertSameOriginStrict()` CSRF guard + cookie check |
| Documentation readiness | Easy — cookie-driven rotation |
| Migration difficulty | Easy |
| Special considerations | Refresh token rotation with reuse detection; audit logging on reuse |

#### `/api/auth/google` — GET

| Attribute | Detail |
|---|---|
| Source file | `src/app/api/auth/google/route.ts` |
| Method | `GET` |
| Public route | Yes |
| Authentication | None |
| Authorization | None |
| Runtime | Default (Node.js) |
| Request data | None |
| Response data | 302 redirect to Google OAuth consent screen |
| Existing validation | None (OAuthService throws on misconfiguration) |
| Documentation readiness | Easy — simple redirect |
| Migration difficulty | Easy |
| Special considerations | Sets `cws_oauth_state` cookie with PKCE verifier; returns 503 if Google not configured |

#### `/api/auth/google/callback` — GET

| Attribute | Detail |
|---|---|
| Source file | `src/app/api/auth/google/callback/route.ts` |
| Method | `GET` |
| Public route | Yes (OAuth callback from Google) |
| Authentication | None (validates OAuth state) |
| Authorization | None (creates session on success) |
| Runtime | Default (Node.js) |
| Request data | Query params: `code`, `state`, `error` |
| Response data | 302 redirect to `/dashboard/` or `/dashboard/login/?error=...` |
| Existing validation | State cookie validation, code/state presence, per-IP rate limit |
| Documentation readiness | Hard — multi-branch redirect flow, rate limiting, MFA/step-up branching |
| Migration difficulty | Hard |
| Special considerations | Per-IP rate limit (20/15min); handles `mfa_required`, `force_change`, `step_up` statuses; audit logging; alerting |

### 3.3 Mobile API Routes

All mobile routes share:
- `export const runtime = 'nodejs';`
- CORS via `mobileCorsHeaders()` (origin-restricted)
- `OPTIONS` handler for preflight
- `requireJson()` Content-Type check

#### `/api/mobile/v1/auth/password` — POST, OPTIONS

| Attribute | Detail |
|---|---|
| Source file | `src/app/api/mobile/v1/auth/password/route.ts` |
| Method | `POST`, `OPTIONS` |
| Public route | Yes |
| Authentication | None |
| Authorization | None |
| Runtime | Node.js (explicit) |
| Request data | `MobilePasswordLoginRequest` (opaque body passed to `MobileAuthService.passwordLogin`) |
| Response data | `{ status: "authenticated", accessToken, refreshToken, expiresIn }` or `{ status: "mfa_required", challengeToken }` or error |
| Existing validation | `requireJson()` + manual type check |
| Documentation readiness | Medium — need to extract `MobileAuthService.passwordLogin` parameter types |
| Migration difficulty | Medium |
| Special considerations | Returns 202 for MFA required; 403 for force password change; 401 for invalid credentials |

#### `/api/mobile/v1/auth/mfa/email` — POST, OPTIONS

| Attribute | Detail |
|---|---|
| Source file | `src/app/api/mobile/v1/auth/mfa/email/route.ts` |
| Method | `POST`, `OPTIONS` |
| Public route | Yes |
| Authentication | None |
| Authorization | None |
| Runtime | Node.js (explicit) |
| Request data | `{ challengeToken: string, code: string }` |
| Response data | `{ status: "authenticated", accessToken, refreshToken, expiresIn }` or error |
| Existing validation | `requireJson()` + `typeof` checks |
| Documentation readiness | Easy |
| Migration difficulty | Easy |

#### `/api/mobile/v1/auth/mfa/totp` — POST, OPTIONS

| Attribute | Detail |
|---|---|
| Source file | `src/app/api/mobile/v1/auth/mfa/totp/route.ts` |
| Method | `POST`, `OPTIONS` |
| Public route | Yes |
| Authentication | None |
| Authorization | None |
| Runtime | Node.js (explicit) |
| Request data | `{ challengeToken: string, code: string }` |
| Response data | `{ status: "authenticated", accessToken, refreshToken, expiresIn }` or error |
| Existing validation | `requireJson()` + `typeof` checks |
| Documentation readiness | Easy |
| Migration difficulty | Easy |

#### `/api/mobile/v1/auth/mfa/webauthn/options` — POST, OPTIONS

| Attribute | Detail |
|---|---|
| Source file | `src/app/api/mobile/v1/auth/mfa/webauthn/options/route.ts` |
| Method | `POST`, `OPTIONS` |
| Public route | Yes |
| Authentication | None |
| Authorization | None |
| Runtime | Node.js (explicit) |
| Request data | `{ challengeToken: string }` |
| Response data | WebAuthn `PublicKeyCredentialRequestOptions` or error |
| Existing validation | `requireJson()` + `typeof` check |
| Documentation readiness | Medium — WebAuthn types |
| Migration difficulty | Easy |

#### `/api/mobile/v1/auth/mfa/webauthn/verify` — POST, OPTIONS

| Attribute | Detail |
|---|---|
| Source file | `src/app/api/mobile/v1/auth/mfa/webauthn/verify/route.ts` |
| Method | `POST`, `OPTIONS` |
| Public route | Yes |
| Authentication | None |
| Authorization | None |
| Runtime | Node.js (explicit) |
| Request data | `{ challengeToken: string, response: AuthenticationResponseJSON }` |
| Response data | `{ status: "authenticated", accessToken, refreshToken, expiresIn }` or error |
| Existing validation | `requireJson()` + `typeof` checks |
| Documentation readiness | Medium — WebAuthn types |
| Migration difficulty | Easy |

#### `/api/mobile/v1/auth/me` — GET, OPTIONS

| Attribute | Detail |
|---|---|
| Source file | `src/app/api/mobile/v1/auth/me/route.ts` |
| Method | `GET`, `OPTIONS` |
| Public route | No |
| Authentication | Bearer JWT (`authenticateBearerRequest`) |
| Authorization | Active user with valid mobile session |
| Runtime | Node.js (explicit) |
| Request data | None (Authorization header) |
| Response data | `{ id, role, status, profile: { displayName, firstName, lastName, employeeId, department } }` |
| Existing validation | Bearer token verification |
| Documentation readiness | Easy |
| Migration difficulty | Easy |
| Special considerations | Sensitive user data; should document response schema precisely |

#### `/api/mobile/v1/auth/refresh` — POST, OPTIONS

| Attribute | Detail |
|---|---|
| Source file | `src/app/api/mobile/v1/auth/refresh/route.ts` |
| Method | `POST`, `OPTIONS` |
| Public route | No |
| Authentication | Refresh token in body (validated against DB) |
| Authorization | Valid mobile refresh token |
| Runtime | Node.js (explicit) |
| Request data | `{ refreshToken: string }` |
| Response data | `{ status: "authenticated", accessToken, refreshToken, expiresIn }` or error |
| Existing validation | `requireJson()` + manual type + length check |
| Documentation readiness | Easy |
| Migration difficulty | Easy |

#### `/api/mobile/v1/auth/google` — POST, OPTIONS

| Attribute | Detail |
|---|---|
| Source file | `src/app/api/mobile/v1/auth/google/route.ts` |
| Method | `POST`, `OPTIONS` |
| Public route | Yes |
| Authentication | None |
| Authorization | None |
| Runtime | Node.js (explicit) |
| Request data | `{ idToken: string }` |
| Response data | `{ status: "authenticated", accessToken, refreshToken, expiresIn }` or `{ status: "mfa_required", challengeToken }` or error |
| Existing validation | `requireJson()` + `typeof` checks |
| Documentation readiness | Easy |
| Migration difficulty | Easy |
| Special considerations | Google ID token verification; same branching as web OAuth |

#### `/api/mobile/v1/auth/logout` — POST, OPTIONS

| Attribute | Detail |
|---|---|
| Source file | `src/app/api/mobile/v1/auth/logout/route.ts` |
| Method | `POST`, `OPTIONS` |
| Public route | Yes |
| Authentication | None (revokes by refresh token) |
| Authorization | None |
| Runtime | Node.js (explicit) |
| Request data | `{ refreshToken?: string }` |
| Response data | `{ ok: true }` |
| Existing validation | `requireJson()` + manual type check |
| Documentation readiness | Easy |
| Migration difficulty | Easy |

---

## 4. Route Coverage Summary

| Category | Routes | Auth'd | Public | Have Zod schemas | Have OpenAPI spec |
|---|---|---|---|---|---|
| General | 3 | 1 | 2 | 0 | 0 |
| Web Auth | 6 | 4 | 2 | 0 | 0 |
| Mobile Auth | 9 | 1 | 8 | 0 | 0 |
| **Total** | **18** | **6** | **12** | **0** | **0** |

---

## 5. Infrastructure Gaps

### 5.1 No CI pipeline

No `.github/workflows/`, no `.gitlab-ci.yml`. The only automated checks are Husky pre-commit/pre-push hooks running `security-scan.js` and `pnpm build`.

### 5.2 No API documentation tooling

No Swagger UI, no Redoc, no Scalar, no `openapi-typescript`, no `zod-openapi`, no `@asteasolutions/zod-to-openapi`. Zero documentation infrastructure exists.

### 5.3 No API-level Zod schemas

All Zod schemas live in `src/auth/` and serve auth-specific purposes (login form, password policy, env config). No route defines request/response Zod schemas for documentation or validation.

### 5.4 No OpenAPI linter or coverage checker

No `@redocly/cli`, no `spectral`, no custom coverage scripts.

### 5.5 Missing expected route

`MOBILE_JWT_PUBLIC_KEYS_JSON` env var references a JWKS public key store, but no `.well-known/jwks.json` route exists in the codebase.

### 5.6 Inconsistent validation patterns

- `/api/contact`: Inline `sanitizeInput()` + regex
- `/api/chat`: Manual `!message` check
- Mobile routes: `requireJson()` + `typeof` checks
- Web auth routes: Cookie-based + HMAC verification
- No shared validation utility across routes

### 5.7 No request/response type exports

No route exports TypeScript types for its request body, query params, or response shapes. Types are implicit in the handler code.

---

## 6. Security Considerations for Documentation

### 6.1 Sensitive endpoints requiring careful documentation

- `/api/auth/*` routes: Session management, token rotation, CSRF guards — must document security properties without leaking implementation details
- `/api/mobile/v1/auth/*` routes: JWT-based auth with EdDSA — must document token format and lifecycle
- `/api/chat`: Proxies to external LLM — system prompt must not be exposed in docs
- `/api/contact`: Forwards to external service — document timeout and error behavior

### 6.2 Endpoints to handle with care in public docs

- `/api/health`: May reveal database technology (MongoDB)
- `/api/auth/google/callback`: OAuth flow with state/nonce — document without revealing bypass vectors
- Mobile MFA endpoints: Challenge token lifecycle must be documented precisely

### 6.3 CORS configuration

Mobile routes have origin-restricted CORS (`MOBILE_ALLOWED_ORIGINS`). Documentation should note this requirement for API consumers.

---

## 7. Migration Readiness Assessment

| Difficulty | Routes | Count |
|---|---|---|
| Easy | `/api/health`, `/api/contact`, `/api/auth/logout`, `/api/auth/refresh`, `/api/auth/google`, `/api/mobile/v1/auth/mfa/email`, `/api/mobile/v1/auth/mfa/totp`, `/api/mobile/v1/auth/me`, `/api/mobile/v1/auth/refresh`, `/api/mobile/v1/auth/google`, `/api/mobile/v1/auth/logout` | 11 |
| Medium | `/api/chat`, `/api/auth/webauthn/login-options`, `/api/auth/webauthn/login-verify`, `/api/mobile/v1/auth/password`, `/api/mobile/v1/auth/mfa/webauthn/options`, `/api/mobile/v1/auth/mfa/webauthn/verify` | 6 |
| Hard | `/api/auth/google/callback` | 1 |

**Overall assessment:** All 18 routes are documentable. No route requires exclusion. The primary effort is extracting implicit request/response types into Zod schemas and defining OpenAPI metadata for each route.
