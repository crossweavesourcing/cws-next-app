'use server';

import { cookies, headers } from 'next/headers';
import { LoginService } from '../services/login.service';
import { AuthError } from '../errors/auth-errors';

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
 */
export async function loginAction(
  prevState: LoginActionState,
  formData: FormData
): Promise<LoginActionState> {
  const email = formData.get('email');
  const password = formData.get('password');

  if (typeof email !== 'string' || typeof password !== 'string') {
    return { error: 'Invalid submission fields.' };
  }

  // Get request metadata from headers
  const headersList = await headers();
  const userAgent = headersList.get('user-agent') || null;
  
  // Resolve client IP (fallback to localhost)
  const forwardedFor = headersList.get('x-forwarded-for');
  const ipAddress = forwardedFor ? forwardedFor.split(',')[0].trim() : '127.0.0.1';

  const loginService = new LoginService();

  try {
    const { cookie, user } = await loginService.loginWithPassword(
      { email, password },
      ipAddress,
      userAgent
    );

    // Set HttpOnly Secure Session cookie
    const cookieStore = await cookies();
    cookieStore.set('cws_session', cookie, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/',
      maxAge: 7 * 24 * 60 * 60, // 7 days
    });

    // Check forced password change flag
    if (user.security?.forcePasswordChange) {
      return { redirect: '/dashboard/change-password' };
    }

    return { redirect: '/dashboard' };
  } catch (err) {
    if (err instanceof AuthError) {
      return { error: err.publicMessage };
    }

    console.error('Unhandled login action exception:', err);
    return { error: 'An unexpected system error occurred. Please try again later.' };
  }
}
