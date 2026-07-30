# 15 — Secrets, Deployment & Browser Security Audit

| Field | Value |
|---|---|
| Audit Date | 2026-07-27 |
| Scope | Secret management, committed secrets, client bundle exposure, secret strength, rotation, startup guards, browser security headers, HSTS, CSP, clickjacking, CORS, HTTPS enforcement |
| Files Reviewed | `src/auth/config/env.ts`, `.env.example`, `next.config.ts`, `src/proxy.ts`, `src/auth/lib/cookies.ts`, `src/auth/lib/request.ts`, `src/database/client.ts`, `src/database/config.ts`, `src/auth/services/mailer.ts`, `package.json`, `.gitignore` |

---

## Executive Summary

The application implements a strong defense-in-depth approach to secret management with multiple fail-closed production boot guards. No secrets are committed to the repository, and no `NEXT_PUBLIC_*` variables expose server secrets. Browser security headers are well-configured for the admin dashboard. The primary gap is the reliance on edge/platform configuration for HSTS, which must be verified at the deployment layer.

---

## Findings

### DEPLOY-001 — HSTS Must Be Configured at the Edge (Not in Application)

| Field | Value |
|---|---|
| Severity | **High** |
| Confidence | **High** |
| Production Blocker | Yes (deployment-level) |
| Evidence | `next.config.ts:32-35` — comment explicitly states HSTS must be at the edge; no `Strict-Transport-Security` header in `securityHeaders` array |

**Attack Scenario:** Without HSTS, a user navigating to the admin dashboard over HTTP (e.g., first visit, or after cookie expiry) sends the initial request in cleartext. An attacker on the same network performs an SSL stripping attack (e.g., `mitmproxy`) to downgrade the connection and intercept the session cookie before the redirect to HTTPS completes.

**Impact:** Session cookie interception on first visit or after HSTS expiry; credential theft.

**Root Cause:** The application correctly defers HSTS to the edge platform (Vercel/Netlify `_headers` or custom headers) because it runs on serverless/edge infrastructure. However, there is no automated verification that the edge is actually configured with the header.

**Remediation:**
1. Document the required edge configuration:
   ```
   Strict-Transport-Security: max-age=63072000; includeSubDomains; preload
   ```
2. Add an E2E test that asserts the `Strict-Transport-Security` header is present on responses.
3. Consider adding the header in `next.config.ts` as defense-in-depth (it will be a no-op behind CDN edge, but provides a safety net for direct-access deployments).

**Acceptance Criteria:**
1. An E2E test verifies `Strict-Transport-Security` is present with `max-age >= 31536000`.
2. Deployment documentation specifies the required edge header configuration.
3. The header value uses `includeSubDomains` and optionally `preload`.

**Regression Tests:**
```typescript
test('HSTS header is present on admin routes', async ({ page }) => {
  const response = await page.goto('/dashboard/login/');
  const hsts = response?.headers()['strict-transport-security'];
  expect(hsts).toContain('max-age=');
  expect(parseInt(hsts.match(/max-age=(\d+)/)?.[1] ?? '0')).toBeGreaterThanOrEqual(31536000);
});
```

---

### DEPLOY-002 — No Secrets Committed to Repository

| Field | Value |
|---|---|
| Severity | **None** (positive finding) |
| Confidence | **High** |
| Production Blocker | No |
| Evidence | `.gitignore:34-37` — `.env*` excluded, `!.env.example` allowed; `next.config.ts:1-15` — no secret values; `.env.example` contains dev placeholders only |

**Validation:**
- `.gitignore` excludes all `.env*` files except `.env.example`.
- `.env.example` contains only placeholder values (`default_session_secret_must_be_thirty_two_characters_long`, `argon2_secret_pepper_min_16_characters`, `SeedPassword123!`, `xxxx xxxx xxxx xxxx`).
- `next.config.ts` contains no secret values.
- No `NEXT_PUBLIC_*` variables exist in the codebase (verified by grep).
- All secrets are read from `process.env` at runtime.

**Root Cause:** Proper gitignore configuration and documentation discipline.

**Remediation:** None required. Continue the policy of sourcing secrets from the secret manager.

---

### DEPLOY-003 — No NEXT_PUBLIC_ Variables Expose Server Secrets

| Field | Value |
|---|---|
| Severity | **None** (positive finding) |
| Confidence | **High** |
| Production Blocker | No |
| Evidence | Grep for `NEXT_PUBLIC` across all `.ts` files returned zero matches |

**Validation:** No client-bound environment variables exist. All sensitive configuration is accessed server-side only through `getEnv()` in `src/auth/config/env.ts`.

---

### DEPLOY-004 — SESSION_SECRET Fail-Closed Boot Guard

| Field | Value |
|---|---|
| Severity | **None** (positive finding) |
| Confidence | **High** |
| Production Blocker | No |
| Evidence | `src/auth/config/env.ts:112-137` — validates length ≥ 32, checks against blocklist of known defaults |

**Validation:**
- Schema requires `z.string().min(32)`.
- Production boot guard additionally checks against a blocklist of two known default values.
- Blocklist includes the previously shipped static value.
- Error message instructs `openssl rand -hex 32` for generation.

---

### DEPLOY-005 — ARGON2_SECRET Fail-Closed Boot Guard

| Field | Value |
|---|---|
| Severity | **None** (positive finding) |
| Confidence | **High** |
| Production Blocker | No |
| Evidence | `src/auth/config/env.ts:210-218` — refuses to boot if < 16 chars in production |

**Validation:**
- Production boot guard enforces minimum 16 characters.
- Dev mode warns but does not block.
- Migration caveat documented (enabling pepper after users exist requires re-hashing).

---

### DEPLOY-006 — SECURE_COOKIES Fail-Closed Boot Guard

| Field | Value |
|---|---|
| Severity | **None** (positive finding) |
| Confidence | **High** |
| Production Blocker | No |
| Evidence | `src/auth/config/env.ts:273-280` — refuses to boot unless `SECURE_COOKIES='true'` in production |

**Validation:**
- Explicit opt-in required in production (not defaulting from `NODE_ENV`).
- Prevents cleartext cookie leakage from misconfigured proxies.
- Dev mode falls back to `NODE_ENV === 'production'` for backwards compatibility.

---

### DEPLOY-007 — TRUSTED_PROXY_IP_HEADER Fail-Closed Boot Guard

| Field | Value |
|---|---|
| Severity | **None** (positive finding) |
| Confidence | **High** |
| Production Blocker | No |
| Evidence | `src/auth/config/env.ts:231-239` — refuses to boot without this header configured in production |

**Validation:**
- Prevents the `0.0.0.0` sentinel collapse that would lock out all logins.
- Dev mode warns but does not block.

---

### DEPLOY-008 — All Required Secrets Verified at Boot in Production

| Field | Value |
|---|---|
| Severity | **None** (positive finding) |
| Confidence | **High** |
| Production Blocker | No |
| Evidence | `src/auth/config/env.ts:152-179` — checks MONGODB_URI, SESSION_SECRET, ARGON2_SECRET, ADMIN_SEED_PASSWORD, GOOGLE_CLIENT_SECRET (when OAuth enabled), EMAIL_PASSWORD (when email enabled) |

**Validation:**
- Fails closed: lists missing secret names (not values) in the error message.
- Conditional secrets (GOOGLE_CLIENT_SECRET, EMAIL_PASSWORD) only required when the parent feature is configured.

---

### DEPLOY-009 — MongoDB Connection Enforces TLS

| Field | Value |
|---|---|
| Severity | **None** (positive finding) |
| Confidence | **High** |
| Production Blocker | No |
| Evidence | `src/database/client.ts:40` — `tls: true` |

**Validation:** The MongoClient is configured with explicit `tls: true`, preventing cleartext MongoDB wire protocol connections.

---

### DEPLOY-010 — Database Config Validates URI Scheme

| Field | Value |
|---|---|
| Severity | **Low** |
| Confidence | **High** |
| Production Blocker | No |
| Evidence | `src/database/config.ts:52-55` — rejects URIs not starting with `mongodb://` or `mongodb+srv://`; `src/database/config.ts:54` — leaks first 20 chars of URI in error message |

**Attack Scenario:** An error during database configuration validation includes the first 20 characters of the `MONGODB_URI`. This could expose the scheme, host, and potentially a username prefix (e.g., `mongodb+srv://admin:pa`).

**Impact:** Partial secret leakage in error logs/monitoring.

**Root Cause:** The error message is designed to help developers debug configuration issues, but it includes too much of the URI.

**Remediation:** Replace the URI slice with a safe message like `'starts with "${uri.slice(0, 10)}…"'` or simply omit the prefix entirely and only report the scheme validity.

**Acceptance Criteria:**
1. The error message does not include the password portion of the URI.
2. At most the scheme (`mongodb://` or `mongodb+srv://`) and host are shown.

**Regression Tests:**
```typescript
it('does not leak password in database config error', () => {
  process.env.MONGODB_URI = 'mongodb+srv://admin:SuperSecret123@cluster0.example.com/db';
  expect(() => getDatabaseConfig()).toThrow('MONGODB_URI');
  // Verify the error does not contain 'SuperSecret'
});
```

---

### DEPLOY-011 — Security Headers Applied to Dashboard and API Routes

| Field | Value |
|---|---|
| Severity | **None** (positive finding) |
| Confidence | **High** |
| Production Blocker | No |
| Evidence | `next.config.ts:37-61` — full header set; `next.config.ts:81-91` — scoped to `/dashboard/:path*` and `/api/:path*` |

**Headers configured:**
| Header | Value | Protection |
|---|---|---|
| `X-Frame-Options` | `DENY` | Clickjacking |
| `X-Content-Type-Options` | `nosniff` | MIME sniffing |
| `Referrer-Policy` | `no-referrer` | Referrer leakage |
| `Cross-Origin-Opener-Policy` | `same-origin` | Cross-origin window access |
| `Cross-Origin-Resource-Policy` | `same-origin` | Cross-origin resource loading |
| `Permissions-Policy` | `camera=(), microphone=(), geolocation=()` | Feature policy |
| `Content-Security-Policy` | Nonce-based on dashboard, static defense-in-depth elsewhere | XSS |

---

### DEPLOY-012 — CSP Nonce Is Correctly Generated Per-Request

| Field | Value |
|---|---|
| Severity | **None** (positive finding) |
| Confidence | **High** |
| Production Blocker | No |
| Evidence | `src/proxy.ts:105` — `crypto.randomBytes(16).toString('base64')` |

**Validation:**
- Nonce is generated fresh per request using cryptographically secure random bytes.
- 16 bytes = 128 bits of entropy.
- Exposed to Server Components via `x-csp-nonce` request header.
- `unsafe-inline` is removed from `script-src` on dashboard routes.

---

### DEPLOY-013 — Missing Permissions-Policy Directives for Modern Browser Features

| Field | Value |
|---|---|
| Severity | **Low** |
| Confidence | **High** |
| Production Blocker | No |
| Evidence | `next.config.ts:50-52` — only `camera`, `microphone`, `geolocation` are restricted |

**Attack Scenario:** The browser allows other powerful features by default (payment, USB, MIDI, screen wake lock, etc.). An XSS or injected script could abuse these APIs.

**Impact:** Limited — the admin dashboard does not use these features, but the principle of least privilege recommends disabling them.

**Root Cause:** The Permissions-Policy only covers the most common high-risk features.

**Remediation:** Extend to a comprehensive deny list:
```
camera=(), microphone=(), geolocation=(), payment=(), usb=(), magnetometer=(), gyroscope=(), accelerometer=(), ambient-light-sensor=(), autoplay=(), battery=(), display-capture=(), encrypted-media=(), gamepad=(), keyboard-map=(), midi=(), picture-in-picture=(), speaker=(), sync-xhr=(self), web-share=(), xr-spatial-tracking=()
```

**Acceptance Criteria:**
1. `Permissions-Policy` header includes deny directives for all high-risk browser features.

**Regression Tests:**
```typescript
test('Permissions-Policy disables high-risk features', async ({ page }) => {
  const response = await page.goto('/dashboard/login/');
  const policy = response?.headers()['permissions-policy'];
  expect(policy).toContain('payment=');
  expect(policy).toContain('usb=');
});
```

---

### DEPLOY-014 — Static CSP Allows unsafe-inline for style-src

| Field | Value |
|---|---|
| Severity | **Low** |
| Confidence | **High** |
| Production Blocker | No |
| Evidence | `next.config.ts:59` — `style-src 'self' 'unsafe-inline'`; `src/proxy.ts:40` — `style-src 'self' 'unsafe-inline' https://fonts.googleapis.com` |

**Attack Scenario:** An attacker who achieves XSS could inject inline styles for data exfiltration (e.g., CSS keyloggers via `background: url(...)`) or UI redressing.

**Impact:** Limited — inline styles are required by React's runtime style injection (`element.style`), and CSP ignores `unsafe-inline` when a nonce is present for `script-src`. The `style-src` nonce interaction is different: `style-src` with a nonce still blocks inline styles unless they carry the nonce OR `unsafe-inline` is present. React and Next.js inject styles via `element.style` attributes, which require `unsafe-inline` in `style-src`.

**Root Cause:** Framework compatibility — React and Next.js use runtime inline styles that cannot carry nonces.

**Remediation:** Accept the `unsafe-inline` for `style-src` as a framework requirement. The `script-src` nonce protection (where XSS exploitation requires script execution) is the primary defense. Consider migrating to a CSS-in-JS solution that extracts styles to external files if stricter CSP is required.

**Acceptance Criteria:**
1. `style-src` includes `unsafe-inline` only (not `unsafe-eval`).
2. `script-src` does NOT include `unsafe-inline` on dashboard routes.

---

### DEPLOY-015 — CORS Configuration for Mobile API

| Field | Value |
|---|---|
| Severity | **Low** |
| Confidence | **Medium** |
| Production Blocker | No |
| Evidence | `src/auth/config/env.ts:29-31` — `MOBILE_ALLOWED_ORIGINS` defaults to empty array; `src/auth/config/env.ts:396` — consumed by `getMobileAuthConfig()` |

**Attack Scenario:** If `MOBILE_ALLOWED_ORIGINS` is not configured, the mobile API CORS check may reject all cross-origin requests (fail-closed) or accept all (fail-open), depending on implementation.

**Impact:** Either mobile clients cannot authenticate (availability), or CORS provides no protection.

**Root Cause:** The CORS origin list is optional and defaults to empty.

**Remediation:** Verify the CORS middleware implementation checks `allowedOrigins.length === 0` and rejects cross-origin requests in that case. Document that `MOBILE_ALLOWED_ORIGINS` MUST be set for mobile API deployments.

**Acceptance Criteria:**
1. When `MOBILE_ALLOWED_ORIGINS` is empty, CORS rejects all cross-origin requests.
2. The value is documented in `.env.example` with instructions.

---

### DEPLOY-016 — WebAuthn Origin Enforced as HTTPS in Production

| Field | Value |
|---|---|
| Severity | **None** (positive finding) |
| Confidence | **High** |
| Production Blocker | No |
| Evidence | `src/auth/config/env.ts:331-336` — throws if origin is not `https:` in production |

---

## Summary Table

| ID | Finding | Severity | Confidence | Blocker |
|---|---|---|---|---|
| DEPLOY-001 | HSTS must be at the edge | High | High | Yes (deployment) |
| DEPLOY-002 | No committed secrets | None (pass) | High | No |
| DEPLOY-003 | No NEXT_PUBLIC_ leaks | None (pass) | High | No |
| DEPLOY-004 | SESSION_SECRET guard | None (pass) | High | No |
| DEPLOY-005 | ARGON2_SECRET guard | None (pass) | High | No |
| DEPLOY-006 | SECURE_COOKIES guard | None (pass) | High | No |
| DEPLOY-007 | TRUSTED_PROXY guard | None (pass) | High | No |
| DEPLOY-008 | All secrets boot-verified | None (pass) | High | No |
| DEPLOY-009 | MongoDB TLS enforced | None (pass) | High | No |
| DEPLOY-010 | URI partial leak in DB config error | Low | High | No |
| DEPLOY-011 | Security headers on dashboard/API | None (pass) | High | No |
| DEPLOY-012 | CSP nonce generation | None (pass) | High | No |
| DEPLOY-013 | Missing Permissions-Policy directives | Low | High | No |
| DEPLOY-014 | style-src unsafe-inline | Low | High | No |
| DEPLOY-015 | CORS mobile origins optional | Low | Medium | No |
| DEPLOY-016 | WebAuthn HTTPS enforced | None (pass) | High | No |

---

## Recommendations Priority

1. **DEPLOY-001** — Verify and document HSTS at the edge; add E2E test (High impact, Low effort)
2. **DEPLOY-013** — Extend Permissions-Policy to deny all high-risk features (Low impact, Low effort)
3. **DEPLOY-010** — Remove URI prefix from database config error message (Low impact, Low effort)
4. **DEPLOY-015** — Document and verify CORS fail-closed behavior for mobile API (Low impact, Low effort)
