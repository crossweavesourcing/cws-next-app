# Authentication Situation & Scenario Decision Matrix

**Document Path**: `/docs/architecture/authentication-scenarios.md`  
**Related Documents**: [Architecture Index](file:///Users/User/Documents/projects/cws-proj/cws-next-app/docs/architecture/README.md) | [Workflows](file:///Users/User/Documents/projects/cws-proj/cws-next-app/docs/architecture/authentication-workflows.md) | [Security Findings](file:///Users/User/Documents/projects/cws-proj/cws-next-app/docs/architecture/security-findings.md)

---

## 1. Overview & Handling Criteria

This matrix documents the exact behavior of CWS Next App under all credential, session, routing, OAuth, and infrastructure conditions.

Every scenario is evaluated against five audit status labels:
- **Handled correctly**: Behavior is fully implemented, secure, and verified in code.
- **Partially handled**: Functionality exists but lacks complete edge-case handling.
- **Not handled**: Application does not account for the condition, creating potential security or UX risks.
- **Behavior is inconsistent**: Application exhibits different behavior across surfaces (e.g. Web vs Mobile).
- **Unable to verify**: Behavior depends on unverified environment or deployment configurations.

---

## 2. Credential Situations Matrix

| Situation | Condition | Logic Executed | Application Behavior | Response or Redirect | Database Changes | Security Concern | Handling Label |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Correct Credentials** | Email & password match active user record | `LoginService.loginWithPassword()` | Verifies Argon2id hash, checks MFA/expiry status, creates active session | Sets `cws_session` cookie; redirects to `/dashboard` | Resets `failedLoginAttempts: 0`, updates `lastLoginAt`, inserts `sessions` & `login_attempts` | None | **Handled correctly** |
| **Incorrect Password** | Existing email, wrong password | `LoginService.loginWithPassword()` | Executes Argon2id verify, increments failure count atomically | Throws `InvalidCredentialsError`, stays on `/dashboard/login` | Increments `failedLoginAttempts`, inserts `login_attempts` & `audit_logs` | High failure rates trigger lockout | **Handled correctly** |
| **Unknown Email** | Email not in database | `LoginService.loginWithPassword()` | Runs dummy Argon2id verify (`DUMMY_HASH`) + 0-50ms random delay | Throws `InvalidCredentialsError`, stays on `/dashboard/login` | Inserts `login_attempts` (userId: null) & `audit_logs` | Mitigates timing side-channels | **Handled correctly** |
| **Empty Email / Password** | Form submitted with empty fields | `loginSchema.safeParse()` | Zod validation fails before DB lookup or password hashing | Throws `InvalidCredentialsError` ("Input validation failed") | None | None (early rejection) | **Handled correctly** |
| **Invalid Email Format** | String fails `z.string().email()` | `loginSchema.safeParse()` | Zod validation fails at boundary | Throws `InvalidCredentialsError` | None | Prevents NoSQL injection payloads | **Handled correctly** |
| **Suspended Account** | User `status === 'suspended'` | `LoginService.loginWithPassword()` | Checks status after user lookup, before password verification | Throws `AccountSuspendedError` | Inserts `login_attempts` (failureReason: "Account suspended") | Prevents access by suspended users | **Handled correctly** |
| **Disabled Account** | User `status === 'disabled'` or `'inactive'` | `LoginService.loginWithPassword()` | Checks status after user lookup | Throws `AccountDisabledError` | Inserts `login_attempts` & `audit_logs` | Blocks access by deactivated users | **Handled correctly** |
| **Deleted Account** | User `status === 'deleted'` | `LoginService.loginWithPassword()` | Soft-deleted user record lookup checks status | Throws `AccountDeletedError` | Inserts `login_attempts` & `audit_logs` | Prevents logins on soft-deleted users | **Handled correctly** |
| **Locked Account** | `lockedUntil > now` | `LoginService.loginWithPassword()` | Checks `lockedUntil` timestamp before verifying password | Throws `AccountLockedError` with remaining time | Inserts `login_attempts` ("Attempt on locked account") | Prevents brute-force attempts during lock | **Handled correctly** |
| **Lockout Threshold Reached**| 5th consecutive password failure | `userRepo.recordFailedLoginAndMaybeLock()` | Single atomic update increments count and sets `lockedUntil = now + 15m` | Throws `AccountLockedError` | Updates `users.security`, inserts `login_attempts` & `audit_logs` | Atomic update prevents race conditions | **Handled correctly** |
| **OAuth-Only Account Password Attempt** | User has no `password.hash` | `LoginService.loginWithPassword()` | Checks `user.password` existence after lifecycle check | Throws `InvalidCredentialsError` ("User has no password set") | Inserts `login_attempts` & `audit_logs` | Prevents NullPointer/unhandled error | **Handled correctly** |

---

## 3. Session Situations Matrix

| Situation | Condition | Logic Executed | Application Behavior | Response or Redirect | Database Changes | Security Concern | Handling Label |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Valid Active Session** | Cookie signature valid & DB session active | `SessionService.validateSession()` | Verifies HMAC, checks `revoked: false`, updates `lastActivityAt` in background | Grants route access; renders content | Background update to `sessions.lastActivityAt` | None | **Handled correctly** |
| **Missing Cookie** | No `cws_session` cookie provided | `src/proxy.ts` & `dal.ts` | Proxy detects missing cookie on `/dashboard/*` | Redirects to `/dashboard/login` | None | None | **Handled correctly** |
| **Idle Timeout Exceeded** | `lastActivityAt + 30m <= now` | `SessionService.validateSession()` | Compares activity timestamp against `IDLE_TIMEOUT_MS` | Revokes session, deletes cookie, redirects to login | Updates `sessions.revoked = true`, `revokedReason: "Session expired"` | Prevents unattended terminal takeover | **Handled correctly** |
| **Absolute Lifetime Exceeded** | `createdAt + 7d <= now` | `SessionService.validateSession()` | Compares creation timestamp against `REFRESH_TOKEN_TTL_MS` | Revokes session, deletes cookie, redirects to login | Updates `sessions.revoked = true` | Enforces mandatory re-authentication | **Handled correctly** |
| **Modified Cookie Signature**| Cookie value tampered with | `verifySessionSignature()` | HMAC verification fails at proxy or DAL | Treats cookie as invalid, deletes cookie, redirects | None | Detects cookie tampering | **Handled correctly** |
| **Session Revoked in DB** | `sessions.revoked === true` | `SessionService.validateSession()` | DB query finds `revoked: true` | Deletes cookie, redirects to login | None | Enforces immediate session termination | **Handled correctly** |
| **User Status Changed Mid-Session** | Admin sets user to `disabled` while session active | `SessionService.validateSession()` | Re-checks `user.status` on every session validation | Revokes session immediately, deletes cookie, redirects | Updates `sessions.revoked = true` ("Account status changed") | Prevents continued access after account disablement | **Handled correctly** |
| **Security Version Bump** | Password change increments `accountSecurityVersion` | `SessionService.validateSession()` | Compares session's version snapshot with user's current version | Revokes session immediately, deletes cookie, redirects | Updates `sessions.revoked = true` ("Account security version changed") | Invalidates concurrent sessions across devices | **Handled correctly** |
| **Concurrent Session Cap Hit** | User logs in on 6th device (cap is 5) | `SessionService.createSession()` | Revokes oldest active session for user before creating new one | Login succeeds on 6th device; oldest device session revoked | Updates oldest session `revoked = true` ("Concurrent session limit exceeded") | Limits exposure from forgotten devices | **Handled correctly** |
| **Token Reuse Detected** | Previously rotated refresh token presented again | `SessionService.rotateRefreshToken()` | Detects `revoked: true` or `replacedBy != null` | Revokes entire session family, sends theft alert, returns 401 | Revokes all refresh tokens in family (`revokedReason: "reuse_detected"`) | Protects against refresh token theft | **Handled correctly** |

---

## 4. Route Protection & Authorization Situations

| Situation | Condition | Logic Executed | Application Behavior | Response or Redirect | Database Changes | Security Concern | Handling Label |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Authenticated User Visits Login** | Valid session cookie present on `/dashboard/login` | `/dashboard/login` Page Component | Checks `getAuthSession()`. If valid, redirects to dashboard | Redirect to `/dashboard` | None | Avoids redundant login prompts | **Handled correctly** |
| **Unauthenticated User Visits Protected Page** | No session on `/dashboard/admin/users` | `src/proxy.ts` & `requireActiveSession()` | Proxy catches missing cookie; DAL asserts active session | Redirect to `/dashboard/login` | None | Blocks unauthorized UI access | **Handled correctly** |
| **Unauthenticated User Calls Protected API** | No bearer token or cookie on `/api/mobile/v1/admin/*` | Route Handler auth wrapper | `verifyMobileAuth()` fails to find valid token | HTTP 401 Unauthorized `{ error: "unauthorized" }` | None | Blocks unauthorized API calls | **Handled correctly** |
| **Insufficient Role Access** | Non-admin user accesses `/dashboard/admin/users` | `requireRole('admin')` in Server Component / Action | Fetches user role from DB. If not `admin`, throws error | Throws `InsufficientRoleError`; renders error boundary | Writes `audit_logs` failure entry | Enforces strict role-based access control | **Handled correctly** |
| **Client-Side Navigation to Protected Route** | User clicks link in SPA router | Next.js Router & Proxy Guard | Proxy runs on navigation request header | Redirects to login if session missing/expired | None | Ensures client transitions are protected | **Handled correctly** |
| **Direct URL Entry in Browser** | User types `/dashboard/security` in address bar | Server Rendering Pipeline | Server Component executes `requireActiveSession()` | Renders page if session valid; redirects if invalid | None | Ensures initial loads are protected | **Handled correctly** |
| **CSRF Header Missing on State-Changing API** | POST request without valid `Origin` / `Referer` | `verifyCsrfOrigin()` | Compares `Origin` header against `APP_URL` | Throws `CsrfForbiddenError` / HTTP 403 | Writes `audit_logs` CSRF violation entry | Protects against cross-site request forgery | **Handled correctly** |

---

## 5. OAuth & Infrastructure Situations

| Situation | Condition | Logic Executed | Application Behavior | Response or Redirect | Database Changes | Security Concern | Handling Label |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **OAuth State Mismatch** | Query `state` differs from `cws_oauth_state` cookie | `OAuthService.handleCallback()` | Validates state parameter to prevent login CSRF | Throws error ("OAuth state mismatch"); redirects to login | Writes `audit_logs` failure entry | Blocks CSRF state manipulation | **Handled correctly** |
| **OAuth Account Not Linked** | Google user email has no row in `oauth_accounts` | `OAuthService.handleCallback()` | Queries `oauth_accounts` by `sub`. Auto-linking disabled | Throws error ("Google sign-in not enabled for account") | None | Prevents unauthorized account takeover via Google | **Handled correctly** |
| **Google JWKS Unreachable**| Google certs endpoint times out or fails | `fetchGoogleJwks()` | Catch block intercepts network error | Throws `OAuthProviderUnavailableError` | None | Fails safely when external provider is down | **Handled correctly** |
| **MongoDB Connection Failure** | Database offline during authentication | `getDb()` connection wrapper | Database driver throws connection error | Surfaces safe generic HTTP 500 / error boundary | None | Avoids leaking internal DB connection strings | **Handled correctly** |
| **Missing `SESSION_SECRET`** | App boots without `SESSION_SECRET` set | `validateSecurityConfig()` | Boot guard validates secret length and default values | Throws fatal error; process halts during boot | None | Prevents booting with weak/default signing secrets | **Handled correctly** |
| **Cloudinary Upload Fails** | Cloudinary API returns error during CMS asset save | `CategoryService` / `ProductService` | Intercepts upload exception before database write | Throws upload error; halts category/product creation | No database changes occur (no orphan DB records) | Keeps DB and Cloudinary state synchronized | **Handled correctly** |
| **Database Fails After Cloudinary Upload** | Image uploads to Cloudinary but DB write fails | `ProductService.createProduct()` | Cloudinary upload succeeds; DB insert throws | Throws DB error; return error to client | Image exists in Cloudinary without DB reference | Potential orphan image risk in Cloudinary | **Partially handled** |
