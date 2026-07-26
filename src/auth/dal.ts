import 'server-only';
import { cache } from 'react';
import { ObjectId } from 'mongodb';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { SessionService } from './services/session.service';
import { UserRepository } from './repositories/user.repository';
import type { SessionDocument, UserRole, CmsPermission } from '@/types/auth';
import { ADMIN_IMPLICIT_PERMISSIONS, ALL_CMS_PERMISSIONS } from '@/types/auth';

const sessionService = new SessionService();
const COOKIE_NAME = 'cws_session';


/**
 * Returns the current authenticated session if valid, or null.
 * Safe to call in Server Components, Server Actions, and Route Handlers.
 * Memoized using React cache to prevent N+1 queries during a single render pass.
 */
export const getAuthSession = cache(async (): Promise<SessionDocument | null> => {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get(COOKIE_NAME);
  
  if (!sessionCookie || !sessionCookie.value) {
    return null;
  }

  try {
    const session = await sessionService.validateSession(sessionCookie.value);
    if (!session) {
      try {
        cookieStore.delete(COOKIE_NAME);
      } catch {
        // Ignore read-only cookie errors in Server Components
      }
    }
    return session;
  } catch (err) {
    console.error('Session validation database/infrastructure error in DAL:', err);
    // Do NOT delete the session cookie on transient DB errors.
    // Rethrow so the page renders a 500 error boundary rather than
    // falsely wiping the cookie and redirecting the user to login.
    throw err;
  }
});

/**
 * Returns the user document for a given user ID.
 * Memoized using React cache to prevent N+1 queries during a single render pass.
 */
export const getAuthUser = cache(async (userId: ObjectId) => {
  return new UserRepository().findById(userId);
});

/**
 * Asserts that the request is authenticated.
 * Redirects to the login page if the session is invalid or expired.
 */
export async function requireAuth(): Promise<SessionDocument> {
  const session = await getAuthSession();
  if (!session) {
    redirect('/dashboard/login');
  }
  return session;
}

/**
 * Asserts that the request is authenticated AND not in a forced-password-change
 * state. If the session is invalid/expired it redirects to login; if the user
 * must change their password it redirects to the change-password page. Use this
 * on pages that should be unreachable while a forced change is pending.
 */
export async function requireActiveSession(): Promise<SessionDocument> {
  const session = await requireAuth();
  const user = await getAuthUser(session.userId);
  if (user?.security?.forcePasswordChange) {
    redirect('/dashboard/change-password');
  }
  return session;
}

/**
 * Thrown by `requireRole` when the authenticated user lacks the required role.
 * Server Actions should catch this and surface an error to the client rather
 * than letting it bubble up as an unhandled exception.
 */
export class InsufficientRoleError extends Error {
  constructor(required: UserRole | string, actual: UserRole | undefined) {
    super(`Role "${actual ?? 'unknown'}" is not permitted; "${required}" required.`);
    this.name = 'InsufficientRoleError';
  }
}

/**
 * Asserts that the request is authenticated AND that the user holds the
 * required role. Uses a hierarchical model:
 *   super_admin > admin > manager
 *
 * - super_admin is always sufficient for any role check.
 * - admin is sufficient when 'admin' is required.
 * - manager is sufficient only when 'manager' is required.
 */
export async function requireRole(required: UserRole): Promise<SessionDocument> {
  const session = await requireActiveSession();
  const user = await getAuthUser(session.userId);
  const role: UserRole | undefined = user?.role;

  // super_admin is always sufficient for any role check
  if (role === 'super_admin') return session;
  // admin is sufficient when admin is required
  if (required === 'admin' && role === 'admin') return session;
  // exact match for any other case (e.g. manager requiring manager)
  if (role === required) return session;

  throw new InsufficientRoleError(required, role);
}

/**
 * Asserts that the user has access to a specific CMS area.
 *
 * - super_admin → always allowed
 * - admin → allowed for overview, page_content, categories, products
 * - manager → allowed only if the permission is in their permissions[] array
 */
export async function requireCmsPermission(
  permission: CmsPermission
): Promise<SessionDocument> {
  const session = await requireActiveSession();
  const user = await getAuthUser(session.userId);
  if (!user) throw new InsufficientRoleError(permission, undefined);

  if (user.role === 'super_admin') return session;
  if (user.role === 'admin' && (ADMIN_IMPLICIT_PERMISSIONS as readonly string[]).includes(permission)) return session;
  if (user.role === 'manager' && user.permissions?.includes(permission)) return session;

  throw new InsufficientRoleError(permission, user.role);
}

/**
 * Asserts that the user is a super_admin. Use for features restricted to
 * super admin only (Navigation, Visibility, Media Library, Design System).
 */
export async function requireSuperAdminOnly(): Promise<SessionDocument> {
  const session = await requireActiveSession();
  const user = await getAuthUser(session.userId);
  if (user?.role !== 'super_admin') {
    throw new InsufficientRoleError('super_admin', user?.role);
  }
  return session;
}

/**
 * Returns the effective CMS permissions for a user based on their role.
 * Used by the dashboard layout to determine which sidebar items to show.
 */
export async function getEffectivePermissions(userId: ObjectId): Promise<{
  role: UserRole;
  permissions: CmsPermission[];
  canManageUsers: boolean;
}> {
  const user = await getAuthUser(userId);
  if (!user) return { role: 'manager', permissions: [], canManageUsers: false };

  if (user.role === 'super_admin') {
    return { role: 'super_admin', permissions: [...ALL_CMS_PERMISSIONS], canManageUsers: true };
  }
  if (user.role === 'admin') {
    return { role: 'admin', permissions: [...ADMIN_IMPLICIT_PERMISSIONS], canManageUsers: true };
  }
  return { role: 'manager', permissions: user.permissions ?? [], canManageUsers: false };
}
