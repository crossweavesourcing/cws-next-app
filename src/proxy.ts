import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { verifySessionSignature } from '@/auth/crypto/token';
import { getEnv } from '@/auth/config/env';

const COOKIE_NAME = 'cws_session';

/**
 * Next.js Routing Proxy Guard.
 * Executed on every request matching dashboard paths.
 * Optimistically checks for the presence of the session cookie to protect routes.
 *
 * NOTE: Full signature validation and DB lookup is deferred to the Server Component DAL
 * via requireAuth() to avoid database overhead on static/asset requests.
 */
export function proxy(request: NextRequest) {
  const sessionCookie = request.cookies.get(COOKIE_NAME)?.value;
  const { pathname } = request.nextUrl;

  // Normalize pathname to handle trailingSlash: true in next.config.ts
  let normalizedPath = pathname;
  if (normalizedPath.endsWith('/') && normalizedPath !== '/') {
    normalizedPath = normalizedPath.slice(0, -1);
  }

  let hasValidSession = false;
  if (sessionCookie) {
    try {
      const env = getEnv();
      hasValidSession = verifySessionSignature(sessionCookie, env.SESSION_SECRET) !== null;
    } catch {
      hasValidSession = false;
    }
  }

  const isProtectedPath = normalizedPath.startsWith('/dashboard');
  const isLoginPage = normalizedPath === '/dashboard/login';

  // Unauthenticated users visiting protected pages -> redirect to login (with trailing slash)
  if (isProtectedPath && !isLoginPage && !hasValidSession) {
    const loginUrl = new URL('/dashboard/login/', request.url);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

/**
 * Configure routes matching this proxy guard.
 */
export const config = {
  matcher: ['/dashboard/:path*'],
};
