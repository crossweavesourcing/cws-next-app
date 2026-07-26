# Security Findings & Architectural Recommendations Audit

**Document Path**: `/docs/architecture/security-findings.md`  
**Related Documents**: [Architecture Index](file:///Users/User/Documents/projects/cws-proj/cws-next-app/docs/architecture/README.md) | [Authentication Overview](file:///Users/User/Documents/projects/cws-proj/cws-next-app/docs/architecture/authentication-overview.md) | [Workflows](file:///Users/User/Documents/projects/cws-proj/cws-next-app/docs/architecture/authentication-workflows.md)

---

## 1. Executive Security Assessment

An application security audit of the custom authentication system, database interactions, authorization layer, and media integration in `cws-next-app` was conducted.

### Overall Assessment: **Acceptable with Critical & High Priority Fixes Needed**

The repository demonstrates a mature security design well above standard custom-authentication implementations. Key strengths include:
- **Memory-Hard Hashing**: Argon2id password hashing with custom parameters and application pepper.
- **Timing Side-Channel Protection**: Dummy verification against `DUMMY_HASH` for unknown email lookups.
- **Token Rotation & Theft Detection**: Rotating refresh token families with reuse detection and atomic replacement.
- **Restricted OAuth Provisioning**: Google OAuth code exchange with PKCE, JWKS signature verification, and zero auto-provisioning (requires pre-linked `oauth_accounts` row).
- **Hardened Cookies & CSP**: HMAC-signed session cookies and per-request CSP nonces (`x-csp-nonce`).

However, **one Critical functional/security defect** in MongoDB driver v6 usage and **two High-priority hardening items** must be addressed before production deployment.

---

## 2. Security Findings Summary Table

| ID | Severity | Finding | Evidence (File & Function) | Impact | Exploitation / Risk Scenario | Recommendation | Effort |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **C-1** | **Critical** | MongoDB Driver v6 `findOneAndUpdate().value` Misuse | [src/auth/repositories/refresh-token.repository.ts](file:///Users/User/Documents/projects/cws-proj/cws-next-app/src/auth/repositories/refresh-token.repository.ts) (`atomicReplace`) | Legitimate refresh token rotations return `null`, falsely triggering reuse detection | Every valid token refresh misclassifies as token theft, revoking active user sessions and causing Denial of Service (DoS) | Remove `.value` dereference; return the document directly per MongoDB v6 driver API | **Small** |
| **H-1** | **High** | Proxy Guard Relies on Cookie Signature Only | [src/proxy.ts](file:///Users/User/Documents/projects/cws-proj/cws-next-app/src/proxy.ts) (`proxy()`) | Middleware passes requests with valid HMAC without checking revocation/expiry in DB | If a Server Component forgets to call `requireAuth()` or `requireRole()`, revoked/expired sessions can view content | Enforce strict review and ESLint rules requiring `requireActiveSession()` or `requireRole()` in all protected Server Components | **Small** |
| **H-2** | **High** | Lack of Plus/Dot Alias Email Normalization | [src/auth/services/login.service.ts](file:///Users/User/Documents/projects/cws-proj/cws-next-app/src/auth/services/login.service.ts) (`loginWithPassword`) | Email normalized with `.trim().toLowerCase()` only | Email plus-addressing (`user+tag@domain.com`) or Unicode confusables bypass exact match | Standardize email normalization across user lookup and seeding routines to prevent account duplicate confusion | **Medium** |
| **M-1** | **Medium** | SameSite=Lax on Temporary Challenge Cookies | [src/auth/lib/cookies.ts](file:///Users/User/Documents/projects/cws-proj/cws-next-app/src/auth/lib/cookies.ts) (`setPendingCookie`) | `cws_2fa_pending` and `cws_stepup_pending` set `SameSite=Lax` | Temporary challenge tokens accessible on top-level cross-site navigations | Change temporary challenge cookies (`cws_2fa_pending`, `cws_pw_pending`, `cws_stepup_pending`) to `SameSite=Strict` | **Small** |
| **M-2** | **Medium** | Cloudinary Old Asset Cleanup Missing | [src/auth/services/category.service.ts](file:///Users/User/Documents/projects/cws-proj/cws-next-app/src/auth/services/category.service.ts) (`updateCategory` / `deleteCategory`) | Updates/deletes update MongoDB but omit Cloudinary `destroy()` API call | Deleted/replaced images persist indefinitely in Cloudinary storage | Accumulation of unreferenced orphan assets in Cloudinary storage | Add Cloudinary `destroy()` API calls when categories or products are updated or deleted | **Medium** |
| **L-1** | **Low** | Missing Environment Secrets in Development Warning Only | [src/auth/config/env.ts](file:///Users/User/Documents/projects/cws-proj/cws-next-app/src/auth/config/env.ts) (`validateSecurityConfig`) | Dev mode logs warnings for missing `ARGON2_SECRET` / `TRUSTED_PROXY_IP_HEADER` | Local dev environment operates without security pepper or proxy checks | Retain warn-only in dev, but ensure CI pipeline runs integration tests with production-equivalent env validation | **Small** |
| **I-1** | **Info** | Single-String RBAC Architecture | [src/auth/dal.ts](file:///Users/User/Documents/projects/cws-proj/cws-next-app/src/auth/dal.ts) (`requireRole`) | Single string `role` field in `users` (`'admin' \| 'member' \| 'viewer'`) | Clean, simple authorization model suitable for current application scale | Document role definitions clearly and consider fine-grained permissions if application scale grows | **Info** |

---

## 3. Deep-Dive Audit of Critical & High Findings

### Finding C-1 (Critical): MongoDB Driver v6 `findOneAndUpdate().value` Misuse

- **Root Cause**: The project uses `mongodb@^6.16.0`. In version 6 of the native MongoDB driver, `findOneAndUpdate()` returns the modified/original `Document` directly (or `null`). In older driver versions (v4/v5), it returned an object containing `{ value: Document, ok: 1 }`.
- **Implementation Evidence**:
  In [src/auth/repositories/refresh-token.repository.ts](file:///Users/User/Documents/projects/cws-proj/cws-next-app/src/auth/repositories/refresh-token.repository.ts):
  ```typescript
  // INCORRECT (Driver v4/v5 pattern):
  const result = await collection.findOneAndUpdate(...);
  return result.value; // In driver v6, result IS the document, so result.value is undefined -> returns null!
  ```
- **Impact**:
  When a legitimate user attempts to refresh their access token via `/api/auth/refresh` or `/api/mobile/v1/auth/refresh`, `atomicReplace()` returns `null` because it reads `.value`. `SessionService.rotateRefreshToken()` interprets this `null` return as a **concurrent rotation / token theft attempt**, immediately revoking the user's entire session family and sending a security alert!
- **Remediation**:
  Update `atomicReplace` in `RefreshTokenRepository` and `incrementFailedAndGet` in `UserRepository` to return `result` directly:
  ```typescript
  // CORRECT (Driver v6 pattern):
  const result = await collection.findOneAndUpdate(...);
  return result;
  ```

---

### Finding H-1 (High): Proxy Guard Relies on Cookie Signature Only

- **Root Cause**: `src/proxy.ts` executes on Next.js Edge runtime and validates only the HMAC-SHA256 signature of `cws_session` using `verifySessionSignature()`. To avoid database connection overhead on static asset requests, it does not query MongoDB to check if the session has been revoked, expired, or if the user status has changed.
- **Impact**:
  If a developer creates a new protected Server Component under `/dashboard` and forgets to invoke `requireActiveSession()` or `requireRole()`, a user with a revoked or expired session whose cookie signature is mathematically valid will be granted access to the page content.
- **Remediation**:
  Maintain strict architectural compliance with the project's agent rules ([AGENTS.md](file:///Users/User/Documents/projects/cws-proj/cws-next-app/AGENTS.md)): **Every Server Component, Server Action, and Route Handler under `/dashboard` or `/api/admin` MUST call `requireActiveSession()` or `requireRole()`**.

---

### Finding H-2 (High): Missing Plus/Dot Email Normalization

- **Root Cause**: `LoginService.loginWithPassword()` normalizes email input using `email.trim().toLowerCase()`.
- **Impact**:
  Gmail and many enterprise email providers treat `john.doe@gmail.com` and `johndoe+test@gmail.com` as identical inboxes. If an administrator seeds an account with `john.doe@gmail.com`, a login attempt with `johndoe@gmail.com` will fail to find the user. Conversely, if user seeding does not normalize canonical addresses, alias duplicates can be created.
- **Remediation**:
  Implement a centralized email canonicalization helper (`normalizeEmail()`) that strips sub-address tags (plus-addressing) for known providers and applies Unicode NFKC normalization prior to querying `user_emails`.

---

## 4. Prioritized Implementation Roadmap

To maintain system security, stability, and data integrity, technical improvements should be executed in the following prioritized order:

### Priority 1: Immediate Security & Correctness Fixes
1. **Fix Driver v6 `findOneAndUpdate` Return Value (C-1)**: Update `RefreshTokenRepository.atomicReplace()` and `UserRepository` to return the updated document directly instead of reading `.value`.
2. **Harden Temporary Cookie Attributes (M-1)**: Set `SameSite=Strict` on `cws_2fa_pending`, `cws_pw_pending`, and `cws_stepup_pending` cookies in [src/auth/lib/cookies.ts](file:///Users/User/Documents/projects/cws-proj/cws-next-app/src/auth/lib/cookies.ts).

### Priority 2: Database & Authorization Integrity Fixes
3. **Enforce DAL Protection Across All Dashboard Routes (H-1)**: Audit all Server Components under `src/app/(admin)/dashboard/` to guarantee that `requireActiveSession()` or `requireRole()` is explicitly called at the top of every page file.
4. **Implement Email Canonicalization (H-2)**: Add standardized email normalization across user lookup repositories and seed scripts.

### Priority 3: Cloudinary Consistency Fixes
5. **Implement Asset Deletion Cleanup (M-2)**: Update `CategoryService.deleteCategory()`, `updateCategory()`, `ProductService.deleteProduct()`, and `updateProduct()` to invoke `cloudinary.uploader.destroy()` for replaced or deleted media files.

### Priority 4: Maintainability & Operational Improvements
6. **Automate OpenAPI Documentation Regeneration**: Run `pnpm docs:generate` and `pnpm test:api-contract` whenever new mobile endpoints or authentication options are modified.
7. **CI Secret Validation**: Add integration test suites to CI pipelines to ensure production environment variables (`SESSION_SECRET`, `ARGON2_SECRET`, `TRUSTED_PROXY_IP_HEADER`, `SECURE_COOKIES`) pass `validateSecurityConfig()` checks before deployment.
