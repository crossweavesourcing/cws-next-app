# 13 — Next.js-Specific Security, CSRF, and Browser Security Audit

| Field | Value |
|---|---|
| Audit date | 2026-07-28 |
| Scope | CSRF protection, Next.js architecture, CSP, browser security headers |
| Standards | OWASP ASVS 3.5 (CSRF), OWASP ASVS 3.6 (Direct Access), CWE-352 (CSRF) |

## 1. CSRF Protection

### 1.1 Server Actions: `withCsrfGuard`

`src/auth/lib/csrf.ts:20-37`:

Every state-changing Server Action is wrapped with `withCsrfGuard`, which calls `assertSameOrigin()`.

`assertSameOrigin()` (`src/auth/lib/request.ts:108-134`):
1. Reads `Origin` header — if present, compares to `APP_URL` origin
2. Falls back to `Referer` header — if present, compares to `APP_URL` origin
3. If neither header is present — allows (Next.js built-in protections apply)

**Finding CSRF-001: Server Actions use explicit origin check via `withCsrfGuard`.**
- **Severity:** N/A (pass)

### 1.2 Route Handlers: `assertSameOriginStrict`

For direct Route Handlers (`request.ts:143-165`):
1. Requires either `Origin` or `Referer` to be present
2. Must match `APP_URL` origin
3. If neither header is present → **rejected** (stricter than Server Actions)

**Finding CSRF-002: Route Handlers use strict origin check (no fallback).**
- **Severity:** N/A (pass)

### 1.3 Login Route: Sec-Fetch-Site

The login Route Handler checks `Sec-Fetch-Site` header for additional cross-origin protection.

**Finding CSRF-003: Login route uses Sec-Fetch-Site header check.**
- **Severity:** N/A (pass)

### 1.4 Cookie SameSite Policy

| Cookie | SameSite | Rationale |
|---|---|---|
| `cws_session` | Lax | Must ride top-level navigations for page loads |
| `cws_refresh` | Strict | Only read on same-site XHR/fetch to `/api/auth/refresh` |
| `cws_2fa_pending` | Strict | Only read on same-site Server Action POSTs |
| `cws_pw_pending` | Strict | Only read on same-site Server Action POSTs |
| `cws_device_token` | Strict | Only read on same-site requests |
| `cws_sudo` | Lax | Read on page navigation to check sudo state |

**Finding CSRF-004: Cookie SameSite policy correctly differentiated by sensitivity.**
- **Severity:** N/A (pass)
- **Rationale:** High-value tokens use Strict; session uses Lax for navigation UX. This is documented in `cookies.ts:30-43`.

### 1.5 Next.js Built-in CSRF Protection

Next.js Server Actions include:
- Encrypted action IDs (per-build, per-function)
- POST-only enforcement
- Same-origin checks

The `withCsrfGuard` wrapper adds an explicit, testable, uniform origin check on top of these built-in protections.

**Finding CSRF-005: Double-layered CSRF protection (Next.js built-in + explicit origin check).**
- **Severity:** N/A (pass)

## 2. Next.js Architecture Security

### 2.1 App Router (No Pages Router)

The application uses Next.js App Router exclusively. There is no Pages Router.

**Finding NEXT-001: App Router only, no Pages Router exposure.**
- **Severity:** N/A (pass)

### 2.2 Server Components by Default

Components are Server Components by default. Client Components require explicit `'use client'` directive.

**Finding NEXT-002: Server Components by default (reduced client-side attack surface).**
- **Severity:** N/A (pass)

### 2.3 'use client' Boundaries

Client Components are kept small and do not import server-only modules (database, crypto, secrets). The `AGENTS.md` guide enforces this boundary.

**Finding NEXT-003: Client boundary isolation maintained.**
- **Severity:** N/A (pass)

### 2.4 Server Actions vs Route Handlers

| Feature | Server Actions | Route Handlers |
|---|---|---|
| CSRF guard | `withCsrfGuard` (Origin/Referer) | `assertSameOriginStrict` (stricter) |
| Authentication | DAL guards (`requireAuth`, etc.) | DAL guards + Bearer token support |
| Use cases | Form submissions, mutations | API endpoints, OAuth callbacks |

**Finding NEXT-004: Server Actions and Route Handlers both have CSRF protection.**
- **Severity:** N/A (pass)

### 2.5 Edge Runtime (proxy.ts) vs Node.js Runtime

`proxy.ts` runs in the Edge Runtime:
- HMAC signature verification (no DB lookup)
- CSP nonce generation
- Device ID cookie setup

All authorization and database operations run in the Node.js runtime (Server Components, Server Actions).

**Finding NEXT-005: Edge runtime is limited to fast, stateless operations.**
- **Severity:** N/A (pass)

## 3. Content Security Policy (CSP)

### 3.1 CSP Implementation

`proxy.ts:20-47` (`buildCsp()`):

```
default-src 'self'
img-src 'self' blob: data: https:
media-src 'self' blob: https:
script-src 'self' 'nonce-{random}' ['unsafe-eval' in dev only]
style-src 'self' 'unsafe-inline' https://fonts.googleapis.com
font-src 'self' data: https://fonts.gstatic.com
connect-src 'self'
frame-ancestors 'none'
base-uri 'self'
form-action 'self'
```

### 3.2 Key CSP Properties

| Directive | Value | Assessment |
|---|---|---|
| `script-src` | `'self' 'nonce-{random}'` | Correct — no `unsafe-inline` |
| `style-src` | `'self' 'unsafe-inline'` | Acceptable — React/next/image emit inline styles |
| `frame-ancestors` | `'none'` | Correct — clickjacking prevention |
| `base-uri` | `'self'` | Correct — prevents base tag injection |
| `form-action` | `'self'` | Correct — prevents form hijacking |
| `connect-src` | `'self'` | Correct — no external connections |

### 3.3 Nonce Generation

```typescript
const nonce = crypto.randomBytes(16).toString('base64');
```

Per-request nonce (16 random bytes, base64-encoded). Fresh nonce for every request.

**Finding NEXT-006: CSP uses per-request nonce, no unsafe-inline for scripts.**
- **Severity:** N/A (pass)

### 3.4 CSP in Development

```typescript
...(isDevelopment ? ["'unsafe-eval'"] : []),
```

`unsafe-eval` is added only in development mode. This is acceptable for HMR.

**Finding NEXT-007: unsafe-eval only in development.**
- **Severity:** N/A (pass)

## 4. Static Rendering of Private Data

**Finding NEXT-008: NOT VERIFIED — no private data in static pages.**
- **Severity:** Informational
- **Rationale:** The public site (`(site)/`) contains marketing content. The admin dashboard (`(admin)/`) uses dynamic rendering with authentication. No static pages contain private user data based on code review.

## 5. Secrets in Client Bundles

**Finding NEXT-009: No `NEXT_PUBLIC_*` secrets found.**
- **Severity:** N/A (pass)
- **Rationale:** No `NEXT_PUBLIC_*` environment variables contain secrets. The `NEXT_PUBLIC_*` prefix is not used for `SESSION_SECRET`, `ARGON2_SECRET`, `TOTP_ENCRYPTION_KEY`, or any other credential.

## 6. Open Redirects

### 6.1 OAuth Redirect

The OAuth callback route validates the `redirect_uri` against the configured `GOOGLE_REDIRECT_URI`. No user-controlled redirect parameters are used.

**Finding NEXT-010: OAuth redirect URI validated against configuration.**
- **Severity:** N/A (pass)

### 6.2 Login Redirect

After login, the redirect is hardcoded to `/dashboard`. No user-controlled redirect parameter is used in the login flow.

**Finding NEXT-011: Login redirect is hardcoded, no open redirect vector.**
- **Severity:** N/A (pass)

## 7. Error Responses

### 7.1 Public Error Messages

All error responses use generic, non-enumerating messages:
- `"Invalid credentials"` (not "wrong password" or "user not found")
- `"Request blocked."` (not "CSRF check failed with origin X")
- `"Your session has expired."` (not "session ID not found in DB")

**Finding NEXT-012: Error responses use generic public messages.**
- **Severity:** N/A (pass)

## 8. Cache Controls

**Finding NEXT-013: NOT VERIFIED for all routes.**
- **Severity:** Low
- **Rationale:** The QR code route sets `Cache-Control: no-store`. Other routes may need explicit cache headers for authenticated content. The proxy sets CSP headers but not explicit cache-control directives.
- **Recommendation:** Audit all `/dashboard/*` routes for appropriate `Cache-Control` headers, especially routes serving sensitive data.

## 9. Browser Security Headers

### 9.1 HSTS (HTTP Strict Transport Security)

**Finding BROWSER-001: HSTS NOT VERIFIED — must be configured at edge/CDN.**
- **Severity:** Medium
- **Rationale:** HSTS is typically configured at the reverse proxy or CDN level (e.g., Vercel, Cloudflare). The Next.js middleware (`proxy.ts`) does not set `Strict-Transport-Security` headers. This must be verified at the deployment layer.
- **Recommendation:** Ensure HSTS is configured at the edge with `max-age=31536000; includeSubDomains; preload`.

### 9.2 Content Security Policy

Set by `proxy.ts` on every `/dashboard/*` request.

**Finding BROWSER-002: CSP set on all dashboard routes.**
- **Severity:** N/A (pass)

### 9.3 Clickjacking Prevention

`frame-ancestors: 'none'` in the CSP prevents embedding in iframes.

**Finding BROWSER-003: Clickjacking prevented via frame-ancestors.**
- **Severity:** N/A (pass)

### 9.4 X-Content-Type-Options

**Finding BROWSER-004: `X-Content-Type-Options: nosniff` NOT VERIFIED.**
- **Severity:** Low
- **Rationale:** Should be set at the edge/CDN. Prevents MIME-type sniffing.
- **Recommendation:** Add `X-Content-Type-Options: nosniff` at the edge or in `proxy.ts`.

### 9.5 Referrer-Policy

**Finding BROWSER-005: Referrer-Policy NOT VERIFIED.**
- **Severity:** Low
- **Rationale:** Should be set to `strict-origin-when-cross-origin` or `no-referrer` to prevent leaking URLs with sensitive tokens.
- **Recommendation:** Add `Referrer-Policy: strict-origin-when-cross-origin` at the edge.

### 9.6 Permissions-Policy

**Finding BROWSER-006: Permissions-Policy NOT VERIFIED.**
- **Severity:** Low
- **Rationale:** Should restrict access to browser features (camera, microphone, geolocation, etc.).
- **Recommendation:** Add `Permissions-Policy: camera=(), microphone=(), geolocation=()` at the edge.

### 9.7 CORS (Cross-Origin Resource Sharing)

Mobile API routes use `MOBILE_ALLOWED_ORIGINS` for CORS configuration. Web dashboard routes do not need CORS (same-origin only).

**Finding BROWSER-007: CORS restricted for mobile API.**
- **Severity:** N/A (pass)

## 10. Summary of Findings

| ID | Finding | Severity | Status |
|---|---|---|---|
| CSRF-001 | Server Actions use explicit origin check | N/A | Pass |
| CSRF-002 | Route Handlers use strict origin check | N/A | Pass |
| CSRF-003 | Login route uses Sec-Fetch-Site | N/A | Pass |
| CSRF-004 | Cookie SameSite correctly differentiated | N/A | Pass |
| CSRF-005 | Double-layered CSRF protection | N/A | Pass |
| NEXT-001 | App Router only | N/A | Pass |
| NEXT-002 | Server Components by default | N/A | Pass |
| NEXT-003 | Client boundary isolation | N/A | Pass |
| NEXT-004 | Both SA and RH have CSRF protection | N/A | Pass |
| NEXT-005 | Edge runtime limited to stateless ops | N/A | Pass |
| NEXT-006 | CSP with per-request nonce | N/A | Pass |
| NEXT-007 | unsafe-eval only in dev | N/A | Pass |
| NEXT-008 | No private data in static pages | Informational | Not verified |
| NEXT-009 | No NEXT_PUBLIC_ secrets | N/A | Pass |
| NEXT-010 | OAuth redirect URI validated | N/A | Pass |
| NEXT-011 | Login redirect hardcoded | N/A | Pass |
| NEXT-012 | Generic error messages | N/A | Pass |
| NEXT-013 | Cache controls not verified for all routes | Low | Advisory |
| BROWSER-001 | HSTS not verified (edge-level) | Medium | Verify at edge |
| BROWSER-002 | CSP set on dashboard routes | N/A | Pass |
| BROWSER-003 | Clickjacking prevented | N/A | Pass |
| BROWSER-004 | X-Content-Type-Options not verified | Low | Verify at edge |
| BROWSER-005 | Referrer-Policy not verified | Low | Verify at edge |
| BROWSER-006 | Permissions-Policy not verified | Low | Verify at edge |
| BROWSER-007 | CORS restricted for mobile API | N/A | Pass |

## 11. Recommendations

1. **[BROWSER-001]** Verify HSTS is configured at the edge/CDN. If not, add `Strict-Transport-Security` header in `proxy.ts`.
2. **[BROWSER-004/005/006]** Add security headers in `proxy.ts` or at the edge:
   ```
   X-Content-Type-Options: nosniff
   Referrer-Policy: strict-origin-when-cross-origin
   Permissions-Policy: camera=(), microphone=(), geolocation=()
   ```
3. **[NEXT-013]** Audit all `/dashboard/*` routes for `Cache-Control: no-store, no-cache, must-revalidate` to prevent browser caching of authenticated content.
4. **[NEXT-008]** Verify that no Server Component accidentally renders private data that could be cached by the CDN.
5. **Consider adding `X-DNS-Prefetch-Control: off`** to prevent DNS prefetching of internal hosts.
6. **Consider adding `X-Permitted-Cross-Domain-Policies: none`** to prevent Flash/PDF cross-domain data loading.
