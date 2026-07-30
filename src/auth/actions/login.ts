'use server';

import { cookies, headers } from 'next/headers';
import { LoginService } from '../services/login.service';
import { AuthError } from '../errors/auth-errors';
import { signSessionId } from '../crypto/token';
import { getEnv } from '../config/env';
import { setAuthCookies, strictCookieOpts, sessionCookieOpts } from '../lib/cookies';
import { getClientIp } from '../lib/request';
import { withCsrfGuard } from '../lib/csrf';

export type LoginActionState = {
  error?: string;
  fieldErrors?: {
    email?: string[];
    password?: string[];
  };
  redirect?: string;
} | undefined;

/**
 * Server Action executing login credentials check.
 * Bound to the login form using React 19's useActionState hook.
 *
 * C1: wrapped with `withCsrfGuard` so every call is origin-checked, and the
 * short-lived pending cookies (2FA / step-up / force-password-change) are set
 * with `SameSite=Strict` — they are only ever read on same-site Server Action
 * POSTs, so Strict blocks a cross-site form POST from riding them.
 */
export async function loginActionImpl(
  prevState: LoginActionState,
  formData: FormData
): Promise<LoginActionState> {
  const email = formData.get('email');
  const password = formData.get('password');
  const rememberMe = formData.get('rememberMe') === 'on' || formData.get('rememberMe') === 'true';

  if (typeof email !== 'string' || typeof password !== 'string') {
    return { error: 'Invalid submission fields.' };
  }

  // Get request metadata from headers
  const headersList = await headers();
  const userAgent = headersList.get('user-agent') || null;

  // FIX-09: resolve client IP via the single source of truth (handles trusted
  // proxy headers + x-forwarded-for consistently across all auth code paths).
  const ipAddress = await getClientIp();

  const loginService = new LoginService();

  try {
    const result = await loginService.loginWithPassword(
      { email, password, rememberMe },
      ipAddress,
      userAgent
    );

    const cookieStore = await cookies();
    const env = getEnv();

    // MFA path: do NOT issue a real session yet. Set a short-lived pending
    // cookie (opaque token) so the verify-2fa step can complete the login.
    if (result.status === 'mfa_required') {
      const pending = result.pendingAuthToken;
      cookieStore.set('cws_2fa_pending', pending, {
        ...strictCookieOpts(env, { path: '/' }),
        maxAge: 5 * 60, // 5 minutes to complete 2FA
      });
      return { redirect: '/dashboard/verify-2fa' };
    }

    if (result.status === 'force_change') {
      // FIX-02: the user's password is expired/forced-change, so no real session
      // exists yet. Set a short-lived signed pending cookie (carrying the userId)
      // so the change-password page + action can operate without a full session.
      const pending = signSessionId(result.userId.toString(), env.SESSION_SECRET);
      cookieStore.set('cws_pw_pending', pending, {
        ...sessionCookieOpts(env, { path: '/' }),
        maxAge: 10 * 60, // 10 minutes to complete the change
      });
      return { redirect: '/dashboard/change-password' };
    }
    if (result.status === 'step_up') {
      return { redirect: '/dashboard/verify-step-up' };
    }

    const { sessionCookie, refreshToken, user, rememberMe: resultRememberMe } = result;

    await setAuthCookies({ sessionCookie, refreshToken, rememberMe: resultRememberMe });

    // Check forced password change flag
    if (user.security?.forcePasswordChange) {
      return { redirect: '/dashboard/change-password' };
    }

    return { redirect: '/dashboard' };
  } catch (err: unknown) {
    const error = err instanceof Error ? err : new Error(String(err));
    console.error('=== UNHANDLED LOGIN ACTION EXCEPTION ===');
    console.error('Error message:', error.message);
    console.error('Error name:', error.name);
    console.error('Error stack:', error.stack);
    console.error('=======================================');
    if (err instanceof AuthError) {
      return { error: err.publicMessage };
    }

    return { error: 'An unexpected system error occurred. Please try again later.' };
  }
}

/** CSRF-guarded public entry point used by the login form. */
export const loginAction = withCsrfGuard(loginActionImpl);
