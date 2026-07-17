# Item 10 — Admin forced / global logout  (P1)

> Self-contained prompt. Works in a fresh session with no prior context.

## START HERE
File A (new): `src/auth/actions/admin.ts` (`'use server'`).
File B: `src/auth/dal.ts` (add `requireRole` guard next to `requireActiveSession`).
File C: `src/auth/repositories/session.repository.ts` (`revokeAllUserSessions`) + `src/auth/repositories/refresh-token.repository.ts` (`revokeBySession`).
Read `src/auth/actions/session.ts` (`revokeSessionAction` / `revokeAllOtherSessionsAction`) + `src/auth/actions/device.ts` (`resolveOwnedDevice`) for the existing ownership-check pattern.

## PROJECT CONTEXT (read first)
- Next.js 16 App Router; `src/proxy.ts` = renamed middleware (optimistic guard only).
- TS strict, MongoDB driver (NO Mongoose). Internal app, no public registration.
- Session model (PRESERVE): DB-backed `sessions`. `cws_session` signed HMAC. `cws_refresh` opaque; only SHA-256 hash in `refresh_tokens`. Rotate + reuse-detect (family revoke).
- Layers: `src/auth/dal.ts` → `src/auth/services/*` → `src/auth/repositories/*`. Cookies in `src/auth/lib/*`.
- `src/auth/dal.ts` has `getAuthSession`, `requireAuth`, `requireActiveSession`. **No `requireRole` exists** — `/dashboard/*` gated only by valid active session.
- `users.role` is enum `admin|member|viewer`; `roleId` references a `roles` collection (not yet enforced).
- Audit via `AuditLogRepository.log({...})`. Email via `sendMail`.

## CURRENT BEHAVIOR (the gap)
- Only self-service `revokeSessionAction` (ownership-checked) and `revokeAllOtherSessionsAction` exist.
- **No admin capability** to force-logout a specific user or every user (breach response).

## FIX (incremental)
- Add `src/auth/actions/admin.ts` (`'use server'`) with:
  - `adminRevokeUserSessionsAction(formData)` → `SessionRepository.revokeAllUserSessions(userId, 'admin')` (existing method: `updateMany({userId, revoked:false}, {$set:{revoked:true, revokedBy:'admin', revokedReason:'Bulk administrative user revocation', revokedAt:now}})`) + `RefreshTokenRepository.revokeBySession(s)` (family revoke) + audit `auth.session.revoked` (actor `admin`).
  - `adminRevokeAllSessionsAction()` → revoke **all** sessions across all users (`sessions.updateMany({revoked:false}, {$set:{revoked:true, revokedBy:'admin', revokedReason:'Global administrative revocation', revokedAt:now}})`) + refresh families + audit.
- Gate BOTH behind a **new `requireRole('admin')` guard** added to `src/auth/dal.ts` (load user, check `role`/`roleId`). This item is the ONLY place RBAC enforcement is needed now — implement `requireRole` minimally here as a dependency.
- Add minimal admin UI (reuse the security page or a new `/dashboard/admin/users`) with **server-side** role checks (never trust client role).

## ACCEPTANCE
- [ ] Admin can force-logout a single user (all their sessions + refresh families revoked).
- [ ] Admin can force-logout all users (breach button) with a confirm guard.
- [ ] Both are server-side role-gated; non-admins get rejected.
- [ ] Every revocation is audited.

## END HERE
Verification: `pnpm lint` + `pnpm build`. Add a test for `requireRole` rejection + admin revoke. Do NOT change the normal user login/refresh flow. Keep cookie semantics HttpOnly+Secure+SameSite.
