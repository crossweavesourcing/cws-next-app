# Authorization Audit

**Date:** 2026-07-27
**Scope:** Server-side authorization, role enforcement, privilege escalation prevention, horizontal/vertical access control, tenant boundaries
**Auditor:** Automated security review

---

## 1. Server-Side Authorization on Protected APIs

### AUTHZ-001: All web Server Actions use service-layer authorization

| Field | Value |
|---|---|
| Severity | Informational |
| Confidence | High |
| Production blocker | No |
| Evidence | `src/auth/services/admin.service.ts:17`, `src/auth/services/category.service.ts:12`, `src/auth/services/product.service.ts:17`, `src/auth/services/section.service.ts:98` |

**Description:** All web-facing Server Actions delegate to services that call `requireRole()`, `requireActiveSession()`, or `requireCmsPermission()` before performing any operation. Authorization is enforced server-side, not in the UI.

**Examples:**
- `AdminService.revokeUserSessions()` calls `requireRole('super_admin')` (`src/auth/services/admin.service.ts:17`)
- `CategoryService.createCategory()` calls `requireCmsPermission('categories')` (`src/auth/services/category.service.ts:12`)
- `ProductService.createProduct()` calls `requireCmsPermission('products')` (`src/auth/services/product.service.ts:17`)
- `SectionService.updateSection()` calls `requireCmsPermission('page_content')` (`src/auth/services/section.service.ts:180`)
- `UserManagementService` operations call `requireManagerAccess()` which uses `requireActiveSession()` + role check (`src/auth/services/user-management.service.ts:14-21`)

**Verdict:** Excellent. Service-layer authorization is consistently applied.

### AUTHZ-002: Mobile API routes use `authenticateBearerRequest` + service-layer auth

| Field | Value |
|---|---|
| Severity | Informational |
| Confidence | High |
| Production blocker | No |
| Evidence | `src/app/api/mobile/v1/admin/sections/route.ts:10-12`, `src/app/api/mobile/v1/admin/sections/[id]/route.ts:12-14`, `src/app/api/mobile/v1/users/[id]/route.ts:34-50` |

**Description:** Properly secured mobile API routes (sections, users) call `authenticateBearerRequest()` for identity, then check CMS permissions or role-based access before proceeding.

**Verdict:** Excellent where applied.

### AUTHZ-003: Mobile admin routes for categories/products lack bearer authentication

| Field | Value |
|---|---|
| Severity | Medium |
| Confidence | High |
| Production blocker | No |
| Evidence | `src/app/api/mobile/v1/admin/categories/route.ts:6`, `src/app/api/mobile/v1/admin/products/route.ts:6`, `src/app/api/mobile/v1/admin/products/[id]/route.ts:6`, `src/app/api/mobile/v1/admin/sessions/revoke/route.ts:10` |

**Description:** The mobile admin routes for categories (POST, PUT), products (POST, PUT, DELETE), and session revocation (POST) do NOT call `authenticateBearerRequest()`. They rely on the service layer's `requireCmsPermission()`/`requireRole()` which calls `requireActiveSession()` which reads the `cws_session` cookie.

**Attack scenario:** A mobile app sending a bearer token to these endpoints would receive a 500 error because `requireActiveSession()` cannot read the bearer token -- it only reads cookies. The service layer throws an error, which is caught and returned as 500 "Internal server error". This is NOT a security bypass (the authorization still blocks unauthenticated access), but it means these endpoints are broken for mobile clients and only work for web browsers with cookies.

**Impact:** Functional regression -- mobile clients cannot use these admin endpoints. No authorization bypass.

**Root cause:** Inconsistent application of `authenticateBearerRequest()` across mobile admin routes. Sections and users have it; categories, products, and session revocation do not.

**Remediation:** Add `authenticateBearerRequest()` (or `authenticateCookieOrBearer()` for shared endpoints) to:
- `src/app/api/mobile/v1/admin/categories/route.ts`
- `src/app/api/mobile/v1/admin/categories/[id]/route.ts`
- `src/app/api/mobile/v1/admin/products/route.ts`
- `src/app/api/mobile/v1/admin/products/[id]/route.ts`
- `src/app/api/mobile/v1/admin/sessions/revoke/route.ts`

**Acceptance criteria:** Every `/api/mobile/v1/admin/*` route calls `authenticateBearerRequest()` or `authenticateCookieOrBearer()` before processing the request.

**Regression tests:** Test each mobile admin endpoint with: (1) valid bearer token, (2) valid session cookie, (3) no credentials, (4) invalid/expired bearer token.

---

## 2. Client-Side Route Guards

### AUTHZ-004: Middleware is not the sole authorization layer

| Field | Value |
|---|---|
| Severity | Informational |
| Confidence | High |
| Production blocker | No |
| Evidence | `src/proxy.ts:60-112`, `src/auth/dal.ts:59-65` |

**Description:** The proxy/middleware (`src/proxy.ts`) only performs a lightweight HMAC signature check on the session cookie to redirect unauthenticated users to login. It explicitly defers full session validation (DB lookup, revocation check, expiry enforcement) to the DAL layer via `requireAuth()` / `requireActiveSession()`.

**Analysis:** This is the correct architecture. The middleware is a UX convenience (fast redirect), not a security boundary. All actual authorization happens server-side in the DAL and service layers.

**Verdict:** Excellent. Defense-in-depth with clear separation of concerns.

---

## 3. User IDs from Request Bodies

### AUTHZ-005: User IDs from form data are validated but ownership is verified server-side

| Field | Value |
|---|---|
| Severity | Medium |
| Confidence | Medium |
| Production blocker | No |
| Evidence | `src/auth/actions/session.ts:51-109` |

**Description:** `revokeSessionActionImpl` takes both `sessionId` and `currentSessionId` from form data. The ownership check (`current.userId.equals(target.userId)`) verifies that both sessions belong to the same user. However, it does NOT verify that the caller actually holds the `currentSessionId` -- it trusts the form data.

**Attack scenario:** An attacker who can invoke this Server Action (requires the encrypted action ID from Next.js's built-in CSRF protection) could supply:
- `sessionId`: a target session to revoke
- `currentSessionId`: another session belonging to the same user (obtained through other means)

The ownership check would pass because both sessions belong to the same user. The attacker doesn't need to know the caller's actual session.

**Note:** This requires: (1) the attacker knows valid session ObjectIds (24-hex-char MongoDB IDs, not easily guessable), (2) the attacker can invoke the Server Action (requires the encrypted action ID), (3) both sessions belong to the same user. The practical risk is low due to the high entropy of session IDs and Next.js's action ID protection.

**Impact:** Potential horizontal privilege escalation allowing session revocation within the same user's sessions, bypassing the need to authenticate as that user.

**Root cause:** `revokeSessionActionImpl` does not call `requireActiveSession()` or `getAuthSession()` to verify the caller's identity. It trusts the `currentSessionId` form field.

**Remediation:** Add `requireActiveSession()` at the beginning of `revokeSessionActionImpl` and use the authenticated session for ownership verification instead of the user-supplied `currentSessionId`. Alternatively, verify that the caller's actual session ID (from the cookie) matches the provided `currentSessionId`.

**Acceptance criteria:** The caller must be authenticated with a valid session, and the ownership check must use the authenticated session, not user-supplied input.

**Regression tests:** (1) Authenticated user cannot revoke another user's sessions. (2) Unauthenticated invocation is rejected. (3) Supplying a different `currentSessionId` than the caller's actual session is rejected.

### AUTHZ-006: Admin service userId parameter validated and role-checked

| Field | Value |
|---|---|
| Severity | Informational |
| Confidence | High |
| Production blocker | No |
| Evidence | `src/auth/services/admin.service.ts:12-21` |

**Description:** `AdminService.revokeUserSessions()` validates the userId format, calls `requireRole('super_admin')`, prevents self-revocation, and logs the action.

**Verdict:** Excellent.

---

## 4. Database Queries Scoped to Current User

### AUTHZ-007: Session queries scoped by userId or sessionId

| Field | Value |
|---|---|
| Severity | Informational |
| Confidence | High |
| Production blocker | No |
| Evidence | `src/auth/repositories/session.repository.ts:33-42`, `src/auth/repositories/session.repository.ts:94-110` |

**Description:** All session queries filter by `userId` or specific `sessionId`. `revokeAllUserSessions` targets a specific userId. `listForUser` filters by userId. No queries return sessions across users without explicit admin context.

**Verdict:** Excellent.

### AUTHZ-008: User management queries scoped to caller's role

| Field | Value |
|---|---|
| Severity | Informational |
| Confidence | High |
| Production blocker | No |
| Evidence | `src/auth/services/user-management.service.ts:28-35` |

**Description:** `listManagedUsers()` returns all users for `super_admin` but only managers for `admin`. This prevents an `admin` from seeing other `admin` or `super_admin` accounts.

**Verdict:** Excellent.

---

## 5. Admin Route Role Checks

### AUTHZ-009: Admin operations require super_admin role

| Field | Value |
|---|---|
| Severity | Informational |
| Confidence | High |
| Production blocker | No |
| Evidence | `src/auth/services/admin.service.ts:17`, `src/auth/services/admin.service.ts:53` |

**Description:** Both `revokeUserSessions()` and `revokeAllSessions()` in `AdminService` require `super_admin` role via `requireRole('super_admin')`.

**Verdict:** Excellent.

### AUTHZ-010: Role hierarchy enforced correctly

| Field | Value |
|---|---|
| Severity | Informational |
| Confidence | High |
| Production blocker | No |
| Evidence | `src/auth/dal.ts:103-116` |

**Description:** The role hierarchy `super_admin > admin > manager` is correctly implemented in `requireRole()`. `super_admin` passes any role check. `admin` passes when `admin` is required. Exact match for other cases.

**Verdict:** Excellent.

### AUTHZ-011: CMS permission system correctly enforces per-permission access

| Field | Value |
|---|---|
| Severity | Informational |
| Confidence | High |
| Production blocker | No |
| Evidence | `src/auth/dal.ts:125-137` |

**Description:** `requireCmsPermission()` checks: super_admin (all), admin (implicit permissions), manager (explicit permissions array). This provides fine-grained access control for CMS operations.

**Verdict:** Excellent.

---

## 6. Horizontal Privilege Escalation Prevention

### AUTHZ-012: Session revocation checks ownership

| Field | Value |
|---|---|
| Severity | Informational |
| Confidence | High |
| Production blocker | No |
| Evidence | `src/auth/actions/session.ts:22`, `src/auth/actions/session.ts:82` |

**Description:** Both `revokeFriendlySessionAction` and `revokeSessionAction` verify that the target session belongs to the same user as the caller before revoking.

**Note:** `revokeFriendlySession` uses `requireActiveSession()` (line 16), which is correct. `revokeSessionAction` uses the form-supplied `currentSessionId` (see AUTHZ-005).

**Verdict:** Good for `revokeFriendlySession`. See AUTHZ-005 for the gap in `revokeSessionAction`.

### AUTHZ-013: Mobile users/[id] endpoint checks self or admin

| Field | Value |
|---|---|
| Severity | Informational |
| Confidence | High |
| Production blocker | No |
| Evidence | `src/app/api/mobile/v1/users/[id]/route.ts:48` |

**Description:** `GET /api/mobile/v1/users/[id]` allows access if the authenticated user is an admin OR if the requested ID matches the authenticated user's ID.

**Verdict:** Excellent.

---

## 7. Vertical Privilege Escalation Prevention

### AUTHZ-014: User management prevents privilege escalation

| Field | Value |
|---|---|
| Severity | Informational |
| Confidence | High |
| Production blocker | No |
| Evidence | `src/auth/services/user-management.service.ts:50-58`, `src/auth/services/user-management.service.ts:82-98` |

**Description:** Multiple controls prevent privilege escalation:
- Cannot create `super_admin` users via UI (line 51)
- Admins cannot create other admins (line 55)
- Only `super_admin` can change roles (line 82)
- Cannot promote to `super_admin` via UI (line 86)
- Cannot change the role of an existing `super_admin` (line 94)
- Admins can only delete/restore managers (line 139, 165)

**Verdict:** Excellent. Comprehensive privilege escalation prevention.

### AUTHZ-015: Manager permissions can only be set on manager-role users

| Field | Value |
|---|---|
| Severity | Informational |
| Confidence | High |
| Production blocker | No |
| Evidence | `src/auth/services/user-management.service.ts:114` |

**Description:** `setManagerPermissions()` verifies the target user has role `manager` before applying permission changes. This prevents using the permissions endpoint to elevate non-manager users.

**Verdict:** Excellent.

---

## 8. Disabled User Session Behavior

### AUTHZ-016: Disabled/suspended users rejected on every session validation

| Field | Value |
|---|---|
| Severity | Informational |
| Confidence | High |
| Production blocker | No |
| Evidence | `src/auth/services/session.service.ts:204-208` |

**Description:** `validateSession()` checks `user.status !== 'active'` on every call and revokes the session immediately if the user is not active.

**Verdict:** Excellent. Immediate effect.

### AUTHZ-017: Soft-deleted users have sessions revoked

| Field | Value |
|---|---|
| Severity | Informational |
| Confidence | High |
| Production blocker | No |
| Evidence | `src/auth/services/user-management.service.ts:146-148` |

**Description:** `deleteUser()` calls `sessionRepo.revokeAllUserSessions(targetId, 'admin')` as part of the soft-delete process.

**Verdict:** Excellent.

---

## 9. Role Change Effect on Existing Sessions

### AUTHZ-018: Role changes take effect on next session validation

| Field | Value |
|---|---|
| Severity | Low |
| Confidence | Medium |
| Production blocker | No |
| Evidence | `src/auth/dal.ts:103-116`, `src/auth/services/user-management.service.ts:79-98` |

**Description:** When a user's role is changed (e.g., demoted from admin to manager), the role is read from the database on every `requireRole()` / `requireCmsPermission()` call. The change takes effect immediately for subsequent requests. However, the current request's session is not explicitly revoked.

**Analysis:** A demoted admin would lose access on their next request. Their existing session remains valid but their reduced permissions prevent accessing admin-only resources. This is acceptable behavior -- there is no need to force-logout on role demotion since the authorization check happens on every operation.

**Verdict:** Acceptable. Role changes are enforced immediately without requiring session revocation.

---

## Findings Summary

| ID | Severity | Title | Production Blocker |
|---|---|---|---|
| AUTHZ-001 | Informational | Web Server Actions use service-layer auth | No |
| AUTHZ-002 | Informational | Mobile routes use bearer auth + service-layer auth | No |
| AUTHZ-003 | Medium | Mobile admin routes (categories/products/sessions) missing bearer auth | No |
| AUTHZ-004 | Informational | Middleware is UX layer, not auth boundary | No |
| AUTHZ-005 | Medium | revokeSessionAction trusts user-supplied currentSessionId | No |
| AUTHZ-006 | Informational | Admin service validates userId + checks role | No |
| AUTHZ-007 | Informational | Session queries scoped by userId | No |
| AUTHZ-008 | Informational | User management queries scoped to role | No |
| AUTHZ-009 | Informational | Admin ops require super_admin | No |
| AUTHZ-010 | Informational | Role hierarchy enforced correctly | No |
| AUTHZ-011 | Informational | CMS permission system works correctly | No |
| AUTHZ-012 | Informational | Session revocation checks ownership | No |
| AUTHZ-013 | Informational | Mobile user endpoint checks self or admin | No |
| AUTHZ-014 | Informational | Privilege escalation prevented | No |
| AUTHZ-015 | Informational | Manager permissions scoped to manager role | No |
| AUTHZ-016 | Informational | Disabled users rejected on session validation | No |
| AUTHZ-017 | Informational | Soft-deleted users have sessions revoked | No |
| AUTHZ-018 | Informational | Role changes take effect immediately | No |

**No Critical or High severity findings.**

Two Medium findings (AUTHZ-003, AUTHZ-005) require attention but neither represents an active bypass. The authorization architecture is well-designed with consistent server-side enforcement, role-based access control, and defense-in-depth.
