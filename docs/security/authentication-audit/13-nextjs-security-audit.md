# Next.js Security Audit

**Date:** 2026-07-27
**Scope:** App Router usage, route handler auth, Server Action protection, component boundaries, secrets, CSP, cache, redirects, CSRF, error handling
**Auditor:** Automated security review

---

## 1. App Router vs Pages Router

### NEXT-001: Exclusively uses App Router

| Field | Value |
|---|---|
| Severity | Informational |
| Confidence | High |
| Production blocker | No |
| Evidence | Project structure under `src/app/` |

**Description:** The application uses Next.js App Router exclusively. There is no Pages Router (`src/pages/`). Route groups `(site)` and `(admin)` organize public and protected content without affecting URLs.

**Verdict:** Excellent. Modern architecture with Server Components as default.

---

## 2. Route Handler Authentication

### NEXT-002: Auth routes have origin/CSRF protection

| Field | Value |
|---|---|
| Severity | Informational |
| Confidence | High |
| Production blocker | No |
| Evidence | `src/app/api/auth/refresh/route.ts:30`, `src/app/api/auth/logout/route.ts:23`, `src/app/api/auth/webauthn/login-verify/route.ts:16`, `src/app/api/auth/webauthn/register-verify/route.ts:18` |

**Description:** All state-changing auth Route Handlers call `assertSameOriginStrict()` as the first operation. This prevents cross-origin requests to these endpoints.

**Verdict:** Excellent.

### NEXT-003: Login route has custom origin validation

| Field | Value |
|---|---|
| Severity | Informational |
| Confidence | High |
| Production blocker | No |
| Evidence | `src/app/api/auth/login/route.ts:11-24` |

**Description:** The login Route Handler implements its own origin check that handles Chromium's `Origin: null` for native form navigations with `Sec-Fetch-*` header validation. This accommodates the no-referrer policy while preventing cross-origin form POSTs.

**Analysis:** The `Sec-Fetch-Site: same-origin` + `Sec-Fetch-Mode: navigate` check is browser-controlled and cannot be forged by cross-site JavaScript, making this a valid fallback for the `Origin: null` case.

**Verdict:** Well-designed with appropriate browser-security header usage.

### NEXT-004: Public routes correctly exempted from auth

| Field | Value |
|---|---|
| Severity | Informational |
| Confidence | High |
| Production blocker | No |
| Evidence | `src/proxy.ts:87-94` |

**Description:** The proxy allows unauthenticated access to: `/dashboard/login`, `/dashboard/verify-2fa`, `/dashboard/change-password`, `/dashboard/forgot-password`, `/dashboard/reset-password`.

**Verdict:** Correct. These are pre-authentication pages.

### NEXT-005: Health endpoint is publicly accessible

| Field | Value |
|---|---|
| Severity | Low |
| Confidence | High |
| Production blocker | No |
| Evidence | `src/app/api/health/route.ts:8-12` |

**Description:** `GET /api/health` exposes the database health status without authentication. This is standard for health-check endpoints (load balancers, uptime monitors) but reveals infrastructure status.

**Impact:** An attacker can determine if the MongoDB database is reachable. This is a minor information disclosure.

**Remediation:** Consider restricting to internal networks or adding a simple API key for production, depending on deployment requirements. For most deployments, this is acceptable.

**Acceptance criteria:** The endpoint returns `200` with `{ status: "healthy" }` or `503` with error details.

### NEXT-006: Test cookies endpoint left in codebase

| Field | Value |
|---|---|
| Severity | Low |
| Confidence | High |
| Production blocker | No |
| Evidence | `src/app/api/auth/test-cookies/route.ts:4-8` |

**Description:** `GET /api/auth/test-cookies` sets a test cookie and redirects to login. This appears to be a development/testing utility that was not removed.

**Impact:** Minimal -- it only sets an inert `test_cookie` and redirects. No authentication or authorization impact.

**Remediation:** Remove this route from production builds, or gate it behind `NODE_ENV === 'development'`.

**Acceptance criteria:** The route is not accessible in production.

---

## 3. Server Action Protection

### NEXT-007: All state-changing auth actions wrapped with withCsrfGuard

| Field | Value |
|---|---|
| Severity | Informational |
| Confidence | High |
| Production blocker | No |
| Evidence | `src/auth/actions/login.ts:109`, `src/auth/actions/verify-2fa.ts:211-212`, `src/auth/actions/verify-totp.ts:171`, `src/auth/actions/change-password.ts:96`, `src/auth/actions/password-reset.ts:150-151`, `src/auth/actions/session.ts:161-163`, `src/auth/actions/admin.ts:49-50`, `src/auth/actions/user-management.ts:11,43,63,83,101`, `src/auth/actions/mfa.ts:31,44,54,89`, `src/auth/actions/device.ts:157-159,245-246`, `src/auth/actions/passkey.ts:91-92`, `src/auth/actions/section.actions.ts:37` |

**Description:** Every state-changing Server Action in the `src/auth/actions/` directory is wrapped with `withCsrfGuard`, which calls `assertSameOrigin()` before executing the action. This provides defense-in-depth on top of Next.js's built-in Server Action CSRF protection (encrypted action IDs + POST-only).

**Verdict:** Excellent. Consistent application across all auth actions.

### NEXT-008: Category and Product CRUD actions missing withCsrfGuard

| Field | Value |
|---|---|
| Severity | Medium |
| Confidence | High |
| Production blocker | No |
| Evidence | `src/auth/actions/category.actions.ts:7,31,55`, `src/auth/actions/product.actions.ts:7,46,90` |

**Description:** The `createCategory`, `updateCategory`, `deleteCategory`, `createProduct`, `updateProduct`, and `deleteProduct` Server Actions in `category.actions.ts` and `product.actions.ts` are `'use server'` actions but are NOT wrapped with `withCsrfGuard`. They do have server-side authorization via `requireCmsPermission()` in the service layer.

**Attack scenario:** A malicious website could create a form that POSTs to these Server Actions (if the user is authenticated). Next.js's built-in CSRF protection (encrypted action IDs) provides a baseline defense, but the project's convention is to add `withCsrfGuard` for explicit, testable, defense-in-depth origin checks. Without it, the only CSRF protection is Next.js's opaque action ID mechanism.

**Impact:** Reduced CSRF defense depth. The actions are still protected by: (1) Next.js encrypted action IDs, (2) server-side `requireCmsPermission()` authorization, (3) HttpOnly cookies. However, the explicit origin check is missing per project convention.

**Root cause:** These actions were likely added before the `withCsrfGuard` convention was established.

**Remediation:** Wrap all exported functions with `withCsrfGuard`:
```typescript
export const createCategory = withCsrfGuard(createCategoryImpl);
export const updateCategory = withCsrfGuard(updateCategoryImpl);
export const deleteCategory = withCsrfGuard(deleteCategoryImpl);
```
Same for `product.actions.ts`.

**Acceptance criteria:** All `'use server'` actions that modify data are wrapped with `withCsrfGuard`. Lint or test verifies this pattern.

**Regression tests:** Verify that cross-origin requests to these actions are rejected with `{ error: 'Request blocked.' }`.

---

## 4. Server Component vs Client Component Boundaries

### NEXT-009: No server-only modules imported in Client Components

| Field | Value |
|---|---|
| Severity | Informational |
| Confidence | High |
| Production blocker | No |
| Evidence | Grep for `'use client'` in `src/app/(admin)/dashboard/` shows 31 client components; none import from `src/auth/repositories/`, `src/database/`, `src/auth/config/env.ts`, or `src/auth/lib/request.ts` |

**Description:** Client Components (`'use client'`) are used only for UI interactivity (forms, modals, toggles). They do not import server-only modules (database, crypto, secrets, repositories). Authentication state flows from Server Components through props, not through client-side API calls to server modules.

**Verdict:** Excellent. Proper Server/Client Component boundary.

### NEXT-010: `server-only` import guard on DAL

| Field | Value |
|---|---|
| Severity | Informational |
| Confidence | High |
| Production blocker | No |
| Evidence | `src/auth/dal.ts:1` |

**Description:** The DAL file starts with `import 'server-only'`, which causes a compile-time error if this module is accidentally imported into a Client Component.

**Verdict:** Excellent. Build-time safety net.

---

## 5. Secrets in Client Bundles

### NEXT-011: No NEXT_PUBLIC_ secrets found

| Field | Value |
|---|---|
| Severity | Informational |
| Confidence | High |
| Production blocker | No |
| Evidence | `src/auth/config/env.ts` -- all secrets are server-side only (SESSION_SECRET, ARGON2_SECRET, MONGODB_URI, etc.) |

**Description:** The environment configuration in `env.ts` only defines server-side variables. No `NEXT_PUBLIC_` prefixed secrets are used. The Gemini API key is accessed via `process.env.GEMINI_API_KEY` in a Route Handler (`src/app/api/chat/route.ts:10`), not a Client Component.

**Verdict:** Excellent.

---

## 6. Static Rendering of Private Data

### NEXT-012: No static rendering of authenticated content detected

| Field | Value |
|---|---|
| Severity | Informational |
| Confidence | Medium |
| Production blocker | No |
| Evidence | Dashboard pages use `requireActiveSession()` or `requireRole()` at the top of Server Components |

**Description:** Protected dashboard pages call `requireActiveSession()` or `requireRole()` which redirect unauthenticated users. The data fetching happens at request time, not build time, so private data is not statically rendered.

**Verdict:** Acceptable. The dynamic rendering behavior is correct for authenticated content.

---

## 7. Unsafe Redirects

### NEXT-013: Redirect destinations are hardcoded or derived from trusted data

| Field | Value |
|---|---|
| Severity | Informational |
| Confidence | High |
| Production blocker | No |
| Evidence | `src/auth/dal.ts:62`, `src/auth/actions/login.ts:70,82,85,94,97` |

**Description:** All `redirect()` calls use hardcoded paths (`/dashboard/login`, `/dashboard/change-password`, `/dashboard/verify-2fa`, `/dashboard`) or paths derived from trusted server-side data. No user-controlled input is used as a redirect destination.

**Exception:** `src/app/api/auth/login/route.ts:35` uses `result.redirect` from the action, which is always a hardcoded path from `loginActionImpl`.

**Verdict:** Excellent. No open redirect vulnerability.

---

## 8. Host/Origin Trust

### NEXT-014: APP_URL validated as URL at boot time

| Field | Value |
|---|---|
| Severity | Informational |
| Confidence | High |
| Production blocker | No |
| Evidence | `src/auth/config/env.ts:11` |

**Description:** `APP_URL` is validated as `z.string().url()` at boot time, ensuring it's a valid URL. The origin is extracted in `assertSameOrigin()` and compared against the request's `Origin`/`Referer` headers.

**Verdict:** Excellent.

### NEXT-015: Null Origin handled correctly

| Field | Value |
|---|---|
| Severity | Informational |
| Confidence | High |
| Production blocker | No |
| Evidence | `src/auth/lib/request.ts:121` |

**Description:** `assertSameOrigin()` rejects `Origin: 'null'` (the string "null", which browsers emit for `file://` or private-network requests). The login route has a special case for `Origin: null` with `Sec-Fetch-*` header validation for legitimate Chromium form navigations.

**Verdict:** Excellent. Edge cases handled correctly.

---

## 9. CSRF Protection Gaps

### NEXT-016: Mobile refresh endpoint lacks origin check (by design)

| Field | Value |
|---|---|
| Severity | Informational |
| Confidence | High |
| Production blocker | No |
| Evidence | `src/app/api/mobile/v1/auth/refresh/route.ts:12` |

**Description:** The mobile refresh endpoint does not call `assertSameOriginStrict()`. This is intentional: mobile clients are not browser-based and do not send `Origin`/`Referer` headers. The refresh cookie is `SameSite: Strict`, preventing cross-site form POSTs from including it.

**Analysis:** The `SameSite: Strict` flag on the refresh cookie is the CSRF defense for this endpoint. A cross-site form POST would not include the Strict cookie, so the refresh would fail with 401.

**Verdict:** Acceptable. The cookie SameSite policy provides the CSRF defense.

### NEXT-017: Contact form endpoint lacks CSRF protection

| Field | Value |
|---|---|
| Severity | Low |
| Confidence | High |
| Production blocker | No |
| Evidence | `src/app/api/contact/route.ts:14` |

**Description:** `POST /api/contact` is a public endpoint that accepts contact form submissions and forwards them to a Google Apps Script. It does not have CSRF protection (no origin check, no CSRF token).

**Attack scenario:** A malicious website could create an auto-submitting form that sends spam through this endpoint. The endpoint has rate limiting via the Google Apps Script but not at the application level.

**Impact:** Potential spam through the contact form. No authentication or data breach risk.

**Remediation:** Add `assertSameOriginStrict()` or a CSRF token check. Alternatively, add rate limiting per IP.

**Acceptance criteria:** Cross-origin submissions are rejected.

**Regression tests:** Verify that cross-origin POST to `/api/contact` is rejected.

---

## 10. Sensitive Error Exposure

### NEXT-018: Error messages sanitized in client responses

| Field | Value |
|---|---|
| Severity | Informational |
| Confidence | High |
| Production blocker | No |
| Evidence | `src/auth/actions/login.ts:99-104`, `src/app/api/chat/route.ts:107-111`, `src/app/api/auth/refresh/route.ts:80-84` |

**Description:** Server-side errors are logged with full details but returned to clients as generic messages:
- Login: "An unexpected system error occurred" (line 104)
- Chat: "Failed to communicate with ZXY Sourcing Co-Pilot" (line 110)
- Refresh: "Session revoked" / "Session expired" (line 82) -- no distinction between reuse and unknown token

**Verdict:** Excellent. Internal error details are not leaked to clients.

### NEXT-019: Debug file writes in verify-2fa.ts (production concern)

| Field | Value |
|---|---|
| Severity | Medium |
| Confidence | High |
| Production blocker | No |
| Evidence | `src/auth/actions/verify-2fa.ts:125-138` |

**Description:** The `verify2faActionImpl` function writes debug information to a file `debug-verify.log` using `fs.appendFileSync`. The logged data includes `pendingAuth.deviceObjectId`, device lookup results, and trust status.

**Attack scenario:** In production, this creates:
1. A writable file on the filesystem that could be accessed if the application has any file-read vulnerability
2. Unbounded log file growth (no rotation, no cleanup)
3. Potential information disclosure through error messages if file operations fail

**Impact:** Information disclosure (device IDs, trust status) to anyone with filesystem access. Operational concern (disk space, no log rotation).

**Root cause:** Debugging code left in the codebase.

**Remediation:** Remove the `fs.appendFileSync` calls (lines 125-138). Use proper structured logging (e.g., the existing `AuditLogRepository`) if this information needs to be recorded.

**Acceptance criteria:** No `fs.appendFileSync` calls in production code paths. All security-relevant events are logged through the audit log system.

**Regression tests:** Verify no filesystem writes outside of established logging mechanisms.

---

## 11. CSP Enforcement

### NEXT-020: Nonce-based CSP applied on all dashboard responses

| Field | Value |
|---|---|
| Severity | Informational |
| Confidence | High |
| Production blocker | No |
| Evidence | `src/proxy.ts:20-47`, `src/proxy.ts:105-110` |

**Description:** A per-request CSP nonce is generated via `crypto.randomBytes(16).toString('base64')` and applied as a `Content-Security-Policy` header on all `/dashboard/*` responses. The nonce is also exposed via the `x-csp-nonce` request header for Server Components.

**CSP directives:**
- `default-src 'self'`
- `script-src 'self' 'nonce-{random}'` (plus `'unsafe-eval'` in development only)
- `style-src 'self' 'unsafe-inline' https://fonts.googleapis.com`
- `img-src 'self' blob: data: https:`
- `connect-src 'self'`
- `frame-ancestors 'none'`
- `base-uri 'self'`
- `form-action 'self'`

**Analysis:** The nonce-based CSP prevents XSS by blocking inline scripts without the correct nonce. `'unsafe-inline'` is used for styles (required by React/Next.js) but CSP ignores `unsafe-inline` when a nonce is present for scripts. The `frame-ancestors 'none'` prevents clickjacking.

**Verdict:** Excellent. Modern, nonce-based CSP implementation.

### NEXT-021: CSP only applied to dashboard routes

| Field | Value |
|---|---|
| Severity | Low |
| Confidence | Medium |
| Production blocker | No |
| Evidence | `src/proxy.ts:117-119` |

**Description:** The CSP header is only applied to `/dashboard/:path*` routes via the middleware matcher. Public site routes (`/(site)/`) and API routes do not receive CSP headers.

**Analysis:** This is likely intentional -- the public site may have different CSP requirements, and API routes don't render HTML. However, if the public site renders user-controlled content, it should also have CSP.

**Verdict:** Acceptable if the public site doesn't handle user-generated content. Should be reviewed if user content is rendered.

---

## 12. Cache Leakage Risks

### NEXT-022: Auth pages are dynamically rendered

| Field | Value |
|---|---|
| Severity | Informational |
| Confidence | High |
| Production blocker | No |
| Evidence | `src/auth/dal.ts:20-45` (uses `cookies()` which opts into dynamic rendering) |

**Description:** The `getAuthSession()` function calls `cookies()`, which is a dynamic API in Next.js. This automatically opts pages using it into dynamic rendering, preventing cache leakage of authenticated content.

**Verdict:** Excellent. Automatic cache invalidation for authenticated routes.

---

## 13. Additional Findings

### NEXT-023: IP resolution with production-safe fallback

| Field | Value |
|---|---|
| Severity | Informational |
| Confidence | High |
| Production blocker | No |
| Evidence | `src/auth/lib/request.ts:26-66` |

**Description:** The `getClientIp()` function implements a tiered IP resolution strategy:
1. Trusted proxy header (platform-specific, e.g., `x-vercel-proxied-for`)
2. In production without a trusted header: ignores spoofable `x-forwarded-for`, uses `x-real-ip` or sentinel `0.0.0.0`
3. In development: accepts first-hop `x-forwarded-for` for local tooling

The production boot guard (`src/auth/config/env.ts:231-240`) refuses to start without `TRUSTED_PROXY_IP_HEADER`, preventing the sentinel from collapsing rate limits.

**Verdict:** Excellent. Production-safe IP resolution with fail-closed behavior.

### NEXT-024: WebAuthn configuration validated at boot

| Field | Value |
|---|---|
| Severity | Informational |
| Confidence | High |
| Production blocker | No |
| Evidence | `src/auth/config/env.ts:325-342` |

**Description:** WebAuthn RP ID and origin are validated at boot to ensure: HTTPS in production, RP ID matches the origin hostname, origin is a clean origin (no path/query/credentials).

**Verdict:** Excellent.

### NEXT-025: Timing-safe comparison used for all token verification

| Field | Value |
|---|---|
| Severity | Informational |
| Confidence | High |
| Production blocker | No |
| Evidence | `src/auth/crypto/token.ts:49-54`, `src/auth/lib/device.ts:147-152` |

**Description:** Both session cookie verification and device token verification use `crypto.timingSafeEqual()` to prevent timing side-channel attacks. Buffer length is checked before comparison.

**Verdict:** Excellent.

---

## Findings Summary

| ID | Severity | Title | Production Blocker |
|---|---|---|---|
| NEXT-001 | Informational | Exclusively uses App Router | No |
| NEXT-002 | Informational | Auth routes have CSRF protection | No |
| NEXT-003 | Informational | Login has custom origin validation | No |
| NEXT-004 | Informational | Public routes correctly exempted | No |
| NEXT-005 | Low | Health endpoint publicly accessible | No |
| NEXT-006 | Low | Test cookies endpoint in codebase | No |
| NEXT-007 | Informational | Auth actions wrapped with withCsrfGuard | No |
| NEXT-008 | Medium | Category/Product actions missing withCsrfGuard | No |
| NEXT-009 | Informational | No server-only imports in Client Components | No |
| NEXT-010 | Informational | server-only import guard on DAL | No |
| NEXT-011 | Informational | No NEXT_PUBLIC_ secrets | No |
| NEXT-012 | Informational | No static rendering of private data | No |
| NEXT-013 | Informational | Redirects are hardcoded/trusted | No |
| NEXT-014 | Informational | APP_URL validated at boot | No |
| NEXT-015 | Informational | Null origin handled correctly | No |
| NEXT-016 | Informational | Mobile refresh lacks origin check (by design) | No |
| NEXT-017 | Low | Contact form lacks CSRF protection | No |
| NEXT-018 | Informational | Error messages sanitized | No |
| NEXT-019 | Medium | Debug file writes in verify-2fa.ts | No |
| NEXT-020 | Informational | Nonce-based CSP on dashboard | No |
| NEXT-021 | Low | CSP only on dashboard routes | No |
| NEXT-022 | Informational | Auth pages dynamically rendered | No |
| NEXT-023 | Informational | IP resolution production-safe | No |
| NEXT-024 | Informational | WebAuthn config validated at boot | No |
| NEXT-025 | Informational | Timing-safe comparison on all tokens | No |

**No Critical or High severity findings.**

Two Medium findings (NEXT-008, NEXT-019) require attention. The Next.js security architecture is solid with proper use of Server Components, App Router, CSP nonces, origin checks, and defense-in-depth patterns.
