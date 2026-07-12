import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { cookies } from 'next/headers';
import { ObjectId } from 'mongodb';
import { LogoutService } from '@/auth/services';
import { verifySessionSignature } from '@/auth/crypto/token';
import { getEnv } from '@/auth/config/env';

const COOKIE_NAME = 'cws_session';

/**
 * Route handler to terminate the current session and clear cookies.
 * POST /api/auth/logout
 */
export async function POST(request: NextRequest) {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get(COOKIE_NAME);

  if (sessionCookie && sessionCookie.value) {
    try {
      const env = getEnv();
      const sessionIdStr = verifySessionSignature(sessionCookie.value, env.SESSION_SECRET);

      if (sessionIdStr) {
        const logoutService = new LogoutService();
        await logoutService.logout(new ObjectId(sessionIdStr), 'user');
      }
    } catch (err) {
      console.error('Session termination failed during logout route:', err);
    }
  }

  // Clear session cookie from user browser
  cookieStore.set(COOKIE_NAME, '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/',
    expires: new Date(0), // Past date invalidates instantly
  });

  return new NextResponse(null, { status: 204 });
}
