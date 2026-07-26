import 'server-only';
import { cache } from 'react';
import { ObjectId } from 'mongodb';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { SessionService } from './services/session.service';
import { UserRepository } from './repositories/user.repository';
import type { SessionDocument, UserRole } from '@/types/auth';

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
  constructor(required: UserRole, actual: UserRole | undefined) {
    super(`Role "${actual ?? 'unknown'}" is not permitted; "${required}" required.`);
    this.name = 'InsufficientRoleError';
  }
}

/**
 * Asserts that the request is authenticated AND that the user holds the
 * required role. This is the single point of RBAC enforcement for now.
 *
 * Authorization is role-string based; no roles/permissions collection is used.
 * We trust `users.role` as the authoritative capability value. `admin` is always
 * sufficient; for any other required role we require an exact match.
 */
export async function requireRole(required: UserRole): Promise<SessionDocument> {
  const session = await requireActiveSession();
  const user = await getAuthUser(session.userId);
  const role: UserRole | undefined = user?.role;

  const allowed = required === 'admin' ? role === 'admin' : role === required;
  if (!allowed) {
    throw new InsufficientRoleError(required, role);
  }
  return session;
}
