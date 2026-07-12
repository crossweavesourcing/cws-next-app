import 'server-only';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { SessionService } from './services/session.service';
import type { SessionDocument } from '@/types/auth';

const sessionService = new SessionService();
const COOKIE_NAME = 'cws_session';

/**
 * Returns the current authenticated session if valid, or null.
 * Safe to call in Server Components, Server Actions, and Route Handlers.
 */
export async function getAuthSession(): Promise<SessionDocument | null> {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get(COOKIE_NAME);
  
  if (!sessionCookie || !sessionCookie.value) {
    return null;
  }

  try {
    return await sessionService.validateSession(sessionCookie.value);
  } catch (err) {
    console.error('Session validation error in DAL:', err);
    return null;
  }
}

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
