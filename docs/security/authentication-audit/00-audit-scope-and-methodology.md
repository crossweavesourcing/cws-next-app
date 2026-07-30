# Authentication System Audit — Scope and Methodology

## Audit Metadata

| Field | Value |
|---|---|
| **Audit Date** | 2026-07-27 |
| **Commit Hash** | `32af9be` |
| **Branch** | `main` |
| **Application** | CWS Next App — Admin Dashboard & Mobile API |
| **Framework** | Next.js 16.2.7, React 19.2.4, TypeScript 5.9.3 |
| **Runtime** | Node.js (Turbopack dev / production build) |
| **Database** | MongoDB 6.16.0 (Atlas / replica-set) |

## Audit Standards

This audit applies **OWASP Application Security Verification Standard (ASVS) Level 2** criteria, appropriate for an internal administrative application handling authenticated user sessions, role-based access control, and multi-factor authentication.

Key ASVS requirements covered:

- **V2**: Authentication
- **V3**: Session Management
- **V4**: Access Control
- **V5**: Input Validation
- **V7**: Cryptography
- **V9**: Communication Security (TLS, CSP)
- **V12**: Files and Resources
- **V14**: Configuration

## Scope

### In-Scope Areas

1. **Authentication architecture** — `src/auth/` (all subdirectories)
2. **Route-level auth guard** — `src/proxy.ts`
3. **Data Access Layer** — `src/auth/dal.ts`
4. **API Route Handlers** — `src/app/api/auth/`, `src/app/api/mobile/v1/auth/`
5. **Server Actions** — `src/auth/actions/`
6. **Services** — `src/auth/services/`
7. **Repositories** — `src/auth/repositories/`
8. **Cryptography** — `src/auth/crypto/`
9. **Libraries** — `src/auth/lib/` (cookies, CSRF, device, geoip, IP, mobile, request, webauthn)
10. **Risk evaluation** — `src/auth/risk/`
11. **Validation schemas** — `src/auth/validation/`
12. **Error definitions** — `src/auth/errors/`
13. **Database schemas and indexes** — `src/database/schemas/`, `src/database/indexes/`
14. **Environment configuration** — `src/auth/config/env.ts`, `.env.example`
15. **Dependencies** — `package.json`, installed versions

### Excluded from This Audit

| Area | Reason |
|---|---|
| E2E / integration tests (`playwright/`) | Dynamic testing not executed; test coverage assessed separately |
| Unit tests (runtime behavior) | Source code reviewed; tests not executed during this audit |
| Performance / load testing | Out of scope for static code audit |
| Infrastructure / network security | Relies on platform (Vercel/Netlify) — cannot assess |
| MongoDB Atlas network ACLs | Configuration outside repository scope |
| Third-party provider internals | Google OAuth / Gmail SMTP assumed secure per provider SLA |
| Mobile app client code | Server-side API only; mobile client is a separate codebase |
| `src/app/(site)/` public pages | Public marketing content, no auth logic |
| Content/Admin CMS pages | UI components; business logic in services is in scope |

## Methodology

1. **Static code review** of all authentication-related source files
2. **Dependency analysis** — version inspection and known-vulnerability awareness
3. **Architecture review** — data flow tracing from HTTP request through auth guard, DAL, service, and repository layers
4. **Cryptographic review** — algorithm selection, key management, token generation, and signature verification
5. **Configuration review** — environment variable handling, fail-closed boot guards, secret management guidance
6. **Control mapping** — each identified control mapped to OWASP ASVS requirements

## Assumptions

- The `MONGODB_URI` points to a properly configured MongoDB Atlas cluster with network ACLs, at-rest encryption, and authentication enabled.
- `SESSION_SECRET`, `ARGON2_SECRET`, `GOOGLE_CLIENT_SECRET`, `EMAIL_PASSWORD`, and `ADMIN_SEED_PASSWORD` are sourced from a secret manager in all non-local environments and have been rotated from the `.env.example` defaults before any real deployment.
- The application runs behind a reverse proxy or CDN that strips inbound `x-forwarded-for` before appending its own trusted hop, as documented in `.env.example`.
- `TRUSTED_PROXY_IP_HEADER` is configured in production.
- `SECURE_COOKIES=true` is set in production.
- The application's `APP_URL` uses HTTPS in production.
- MongoDB collections have the validated schemas and indexes as defined in `src/database/schemas/` and `src/database/indexes/`.

## Limitations

| Limitation | Impact |
|---|---|
| **No dynamic/runtime testing** | Rate limiting, lockout, brute-force resistance, timing side-channels, and session lifecycle behaviors are assessed from source code only; NOT VERIFIED at runtime |
| **No penetration testing** | Cannot confirm exploitability of theoretical findings |
| **No secret inspection** | All secrets redacted; actual deployment secret values not examined |
| **No infrastructure audit** | CORS, TLS termination, HSTS, DNS configuration are out of scope |
| **Single commit snapshot** | Audit reflects commit `32af9be`; subsequent changes not covered |
| **Geo-IP integration** | `GEOIP_LOOKUP_URL` not configured in `.env.example`; geo-dependent code paths assessed structurally but NOT VERIFIED with live geo data |
| **Mobile API bearer auth** | `MOBILE_JWT_*` env vars commented out; mobile auth code reviewed but NOT VERIFIED with live JWT keys |

## Runtime-Testing Availability

The following items require dynamic testing and are marked **NOT VERIFIED** where source review alone is insufficient:

| Item | Source Reviewed | Runtime Tested |
|---|---|---|
| Argon2id hash timing resistance | Yes | NOT VERIFIED |
| Login rate-limit enforcement (per-IP, per-email) | Yes | NOT VERIFIED |
| Account lockout threshold (5 failures / 15 min) | Yes | NOT VERIFIED |
| Session cookie HMAC signature verification | Yes | NOT VERIFIED |
| Refresh token rotation + reuse detection | Yes | NOT VERIFIED |
| CSRF Origin/Referer guard on Server Actions | Yes | NOT VERIFIED |
| CSP nonce injection and policy enforcement | Yes | NOT VERIFIED |
| Device token HMAC signature verification | Yes | NOT VERIFIED |
| WebAuthn registration/authentication ceremony | Yes | NOT VERIFIED |
| TOTP secret generation and verification | Yes | NOT VERIFIED |
| Email 2FA code delivery and verification | Yes | NOT VERIFIED |
| Step-up MFA (new device / country change) | Yes | NOT VERIFIED |
| Mobile EdDSA JWT signing and verification | Yes | NOT VERIFIED |
| Google OAuth PKCE flow + id_token verification | Yes | NOT VERIFIED |
| Password reset token expiry and single-use | Yes | NOT VERIFIED |
| Account security version invalidation | Yes | NOT VERIFIED |
| Concurrent session limit enforcement | Yes | NOT VERIFIED |
| Password strength evaluation (zxcvbn) | Yes | NOT VERIFIED |
| Recovery code generation and single-use redemption | Yes | NOT VERIFIED |
