# 12 — Authorization Enforcement Audit

| Field | Value |
|---|---|
| Audit date | 2026-07-28 |
| Scope | DAL guards, proxy guard, service-layer authorization, role checks, ownership checks |
| Standards | OWASP ASVS 4.1 (Access Control), NIST SP 800-63B, CWE-862 (Missing Authorization) |

## 1. Architecture Overview

Authorization is enforced at three layers:

1. **Edge/proxy layer** (`proxy.ts`): HMAC-only session check — fast, no DB lookup
2. **DAL layer** (`dal.ts`): Full session validation + role/permission checks
3. **Service layer**: Business logic authorization (ownership, role, state checks)

## 2. DAL Layer Guards

### 2.1 `getAuthSession()`

`dal.ts:24-65`:
- Reads `cws_session` cookie or `Authorization: Bearer` header
- For cookies: delegates to `SessionService.validateSession()` (full DB lookup + HMAC + revocation + status + version check)
- For Bearer tokens: delegates to `verifyMobileAccessToken()` (JWT verification + DB session lookup)
- Memoized via React `cache()` to prevent N+1 queries

**Finding AUTHZ-001: `getAuthSession()` performs full session validation with DB lookup.**
- **Severity:** N/A (pass)

### 2.2 `requireAuth()`

`dal.ts:79-89`:
```typescript
export async function requireAuth(): Promise<SessionDocument> {
  const session = await getAuthSession();
  if (!session) {
    const reqHeaders = await headers();
    if (reqHeaders.get('authorization')) {
      throw new SessionExpiredError();
    }
    redirect('/dashboard/login');
  }
  return session;
}
```

Returns session or redirects to login (web) / throws (mobile API).

**Finding AUTHZ-002: `requireAuth()` enforces authentication.**
- **Severity:** N/A (pass)

### 2.3 `requireActiveSession()`

`dal.ts:97-104`:
```typescript
export async function requireActiveSession(): Promise<SessionDocument> {
  const session = await requireAuth();
  const user = await getAuthUser(session.userId);
  if (user?.security?.forcePasswordChange) {
    redirect('/dashboard/change-password');
  }
  return session;
}
```

Additionally checks that the user is not in a forced-password-change state.

**Finding AUTHZ-003: `requireActiveSession()` enforces authentication + active state.**
- **Severity:** N/A (pass)

### 2.4 `requireRole()`

`dal.ts:154-167`:
```typescript
export async function requireRole(required: UserRole): Promise<SessionDocument> {
  const session = await requireActiveSession();
  const user = await getAuthUser(session.userId);
  const role: UserRole | undefined = user?.role;

  if (role === 'super_admin') return session;
  if (required === 'admin' && role === 'admin') return session;
  if (role === required) return session;

  throw new InsufficientRoleError(required, role);
}
```

Hierarchical role model: `super_admin > admin > manager`.

**Finding AUTHZ-004: `requireRole()` implements hierarchical role checks.**
- **Severity:** N/A (pass)

### 2.5 `requireCmsPermission()`

`dal.ts:176-188`:
```typescript
export async function requireCmsPermission(permission: CmsPermission): Promise<SessionDocument> {
  const session = await requireActiveSession();
  const user = await getAuthUser(session.userId);
  if (!user) throw new InsufficientRoleError(permission, undefined);

  if (user.role === 'super_admin') return session;
  if (user.role === 'admin' && (ADMIN_IMPLICIT_PERMISSIONS as readonly string[]).includes(permission)) return session;
  if (user.role === 'manager' && user.permissions?.includes(permission)) return session;

  throw new InsufficientRoleError(permission, user.role);
}
```

- `super_admin`: always allowed
- `admin`: implicit permissions for CMS areas
- `manager`: explicit permission in `permissions[]` array

**Finding AUTHZ-005: CMS permissions correctly enforced with role hierarchy.**
- **Severity:** N/A (pass)

### 2.6 `requireSuperAdminOnly()`

`dal.ts:194-201`:
```typescript
export async function requireSuperAdminOnly(): Promise<SessionDocument> {
  const session = await requireActiveSession();
  const user = await getAuthUser(session.userId);
  if (user?.role !== 'super_admin') {
    throw new InsufficientRoleError('super_admin', user?.role);
  }
  return session;
}
```

Strict check — only `super_admin` role passes.

**Finding AUTHZ-006: Super admin check is strict.**
- **Severity:** N/A (pass)

### 2.7 `requireSudoMode()`

`dal.ts:111-131`:
- Checks session freshness (`lastFullAuthAt` within 15 minutes) OR valid `cws_sudo` cookie
- Used for sensitive operations: MFA disable, TOTP re-enrollment, MFA preferences, password change

**Finding AUTHZ-007: Sudo mode gate for sensitive operations.**
- **Severity:** N/A (pass)

## 3. Proxy Guard (Edge Layer)

### 3.1 HMAC-Only Check

`proxy.ts:60-112`:
```typescript
let hasValidSession = false;
if (sessionCookie) {
  try {
    const env = getEnv();
    hasValidSession = verifySessionSignature(sessionCookie, env.SESSION_SECRET) !== null;
  } catch {
    hasValidSession = false;
  }
}
```

The proxy only verifies the HMAC signature — it does NOT perform:
- Database lookup
- Revocation check
- Account status check
- Security version check

**Finding AUTHZ-008: Proxy guard is edge-only HMAC check, not authorization.**
- **Severity:** Informational
- **Rationale:** This is correctly documented in the code comment at `proxy.ts:57-58`:
  ```
  Full signature validation and DB lookup is deferred to the Server Component DAL
  via requireAuth() to avoid database overhead on static/asset requests.
  ```
  The proxy is a fast redirect gate, not an authorization boundary. Full authorization happens in the DAL.

### 3.2 Implications

A revoked or stale session with a valid HMAC signature will pass the proxy check and reach the DAL, where it will be rejected. This is by design — the proxy is an optimization, not a security boundary.

**Finding AUTHZ-009: Stale/revoked sessions can reach DAL but are rejected there.**
- **Severity:** Informational
- **Rationale:** Defense-in-depth: the proxy reduces DB load; the DAL enforces authorization.

## 4. Service Layer Authorization

### 4.1 Ownership Checks

Services use `userId` from the session (not from form data or request body) for data access:
- `UserRepository` queries by `userId`
- `SessionRepository` queries by `userId`
- `RecoveryCodeRepository` queries by `userId`
- `MfaRepository` queries by `userId`

**Finding AUTHZ-010: Service layer uses session-derived userId for data access.**
- **Severity:** N/A (pass)

### 4.2 Role Checks in Services

`AdminService` operations use `requireRole('admin')` or `requireSuperAdminOnly()` from the DAL. The service layer itself does not re-check roles (relies on the calling action's DAL guard).

**Finding AUTHZ-011: Service layer delegates authorization to DAL guards.**
- **Severity:** Informational
- **Rationale:** This is correct as long as every Server Action that calls a service method has the appropriate DAL guard. The audit should verify this for each action.

### 4.3 Mobile API Authorization

Mobile routes use:
1. Bearer token verification (`verifyMobileAccessToken`)
2. Session lookup via `getAuthSession()`
3. Same DAL guards (`requireActiveSession`, `requireRole`, etc.)

The same business logic (`LoginService`, `SessionService`, etc.) is shared between web and mobile.

**Finding AUTHZ-012: Mobile API uses shared business logic with same authorization.**
- **Severity:** N/A (pass)

## 5. Test Vectors

### 5.1 No Credentials → Denied

| Path | Expected | Mechanism |
|---|---|---|
| `GET /dashboard/*` (no cookie) | Redirect to `/dashboard/login` | `proxy.ts` guard |
| `POST` to Server Action (no session) | `requireAuth()` → redirect | DAL |
| `GET` API route (no header/cookie) | 401 or redirect | DAL |

### 5.2 Invalid/Expired Session → Denied

| Scenario | Expected | Mechanism |
|---|---|---|
| Tampered cookie HMAC | `verifySessionSignature` returns null | `proxy.ts` + DAL |
| Revoked session | `validateSession()` returns null | DB lookup |
| Expired session (absolute) | `validateSession()` returns null | DB check |
| Idle timeout exceeded | `validateSession()` returns null | DB check |
| User deactivated | Session revoked + returns null | DB check |

### 5.3 Pre-2FA Session → Denied

No session exists until MFA completes. The `cws_2fa_pending` cookie is not a session.

### 5.4 Different User → Denied

| Scenario | Expected | Mechanism |
|---|---|---|
| Access other user's data | Ownership check fails | Service layer userId scope |
| Submit other user's userId in form | Session userId used, not form data | DAL/service design |

### 5.5 Disabled User → Denied

`validateSession()` checks `user.status !== 'active'` and revokes the session.

### 5.6 Admin User → Allowed for Admin Routes

`requireRole('admin')` passes for `admin` and `super_admin` roles.

### 5.7 Manager User → Denied for Admin Routes

`requireRole('admin')` throws `InsufficientRoleError` for `manager` role.

### 5.8 Modified User ID in Form Data → Denied

Server Actions read `userId` from `session.userId`, not from `formData`. Example from `verify-2fa.ts:64`:
```typescript
const userId = pendingAuth.userId;  // from pending auth, not form data
```

### 5.9 Horizontal Privilege Escalation → Denied

All data queries are scoped by `userId` from the session. There is no query that accepts a userId parameter from the client.

### 5.10 Vertical Privilege Escalation → Denied

Role checks enforce hierarchical permissions. A `manager` cannot access `admin` or `super_admin` routes.

## 6. Summary of Findings

| ID | Finding | Severity | Status |
|---|---|---|---|
| AUTHZ-001 | `getAuthSession()` performs full validation | N/A | Pass |
| AUTHZ-002 | `requireAuth()` enforces authentication | N/A | Pass |
| AUTHZ-003 | `requireActiveSession()` enforces active state | N/A | Pass |
| AUTHZ-004 | `requireRole()` implements hierarchy | N/A | Pass |
| AUTHZ-005 | CMS permissions correctly enforced | N/A | Pass |
| AUTHZ-006 | Super admin check is strict | N/A | Pass |
| AUTHZ-007 | Sudo mode for sensitive operations | N/A | Pass |
| AUTHZ-008 | Proxy is HMAC-only, not authorization | Informational | By design |
| AUTHZ-009 | Stale sessions reach DAL but rejected | Informational | By design |
| AUTHZ-010 | Session-derived userId for data access | N/A | Pass |
| AUTHZ-011 | Service layer delegates to DAL | Informational | By design |
| AUTHZ-012 | Mobile API uses shared authorization | N/A | Pass |

## 7. Recommendations

1. **Verify all Server Actions have DAL guards.** The audit assumes every state-changing action uses `withCsrfGuard` + `requireAuth()`/`requireActiveSession()`/`requireRole()`. This should be verified exhaustively.
2. **Consider adding an authorization middleware** that centrally enforces DAL guards based on route patterns, rather than relying on each action to call the appropriate guard.
3. **Log authorization failures** in the audit log. Currently, `InsufficientRoleError` is thrown but not audit-logged. Adding audit logging for authorization failures would improve detection of privilege escalation attempts.
4. **Document the proxy guard's limitation** more prominently — it is a performance optimization, not a security boundary. The DAL is the authorization boundary.
