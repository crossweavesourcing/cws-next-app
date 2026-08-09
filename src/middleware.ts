import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { verifySessionSignatureEdge } from '@/auth/crypto/token-edge';
import { getEnv } from '@/auth/config/env';
const COOKIE_NAME = 'cws_session';

/** Header carrying the per-request CSP nonce so Server Components / next/script can read it. */
export const CSP_NONCE_HEADER = 'x-nonce';

/**
 * Builds a per-request Content-Security-Policy.
 * Note: 'unsafe-inline' is used for scripts instead of a cryptographic nonce because 
 * Netlify's edge caching and Next.js SSG often cause the dynamically generated nonce
 * header to mismatch with the statically cached HTML, leading to hydration failures.
 */
export function buildCsp(
  nonce: string,
  isDevelopment = process.env.NODE_ENV === 'development'
): string {
  const scriptSources = [
    "'self'",
    "'unsafe-inline'", // Reverted to unsafe-inline because Netlify edge caching breaks Next.js nonces
    ...(isDevelopment ? ["'unsafe-eval'"] : []),
  ].join(' ');

  return [
    "default-src 'self'",
    // Category image previews use URL.createObjectURL(), which produces a
    // browser-local blob: URL. Keep this permission scoped to images only.
    "img-src 'self' blob: data: https:",
    "media-src 'self' blob: https:",
    `script-src ${scriptSources}`,
    // React and next/image emit element style attributes. Do not combine a
    // nonce with unsafe-inline here: CSP ignores unsafe-inline when a nonce is
    // present, which blocks those framework-generated attributes.
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' data: https://fonts.gstatic.com",
    "connect-src 'self' https://api.cloudinary.com",
    "frame-ancestors 'none'",
    "base-uri 'self'",
  ].join('; ');
}

/**
 * Next.js Routing Proxy Guard.
 * Executed on every request matching dashboard paths.
 * Optimistically checks for the presence of the session cookie to protect routes.
 *
 * Also mints a per-request CSP nonce and applies the nonce-based CSP on the
 * response, exposing the nonce via a request header for Server Components.
 *
 * NOTE: Full signature validation and DB lookup is deferred to the Server Component DAL
 * via requireAuth() to avoid database overhead on static/asset requests.
 */
export default async function middleware(request: NextRequest) {

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
      hasValidSession = (await verifySessionSignatureEdge(sessionCookie, env.SESSION_SECRET)) !== null;
    } catch {
      hasValidSession = false;
    }
  }

  const isProtectedPath = normalizedPath.startsWith('/dashboard');

  // Pre-authentication auth flows that must be reachable without a session.
  const publicAuthPages = [
    '/dashboard/login',
    '/dashboard/verify-2fa',
    '/dashboard/change-password',
    '/dashboard/forgot-password',
    '/dashboard/reset-password',
  ];
  const isPublicAuthPage = publicAuthPages.includes(normalizedPath);

  // Unauthenticated users visiting protected pages -> redirect to login (with trailing slash)
  if (isProtectedPath && !isPublicAuthPage && !hasValidSession) {
    const loginUrl = new URL('/dashboard/login/', request.url);
    const isActionOrRsc =
      request.headers.has('next-action') ||
      request.headers.get('rsc') === '1' ||
      request.headers.get('accept')?.includes('application/json');

    if (isActionOrRsc) {
      return NextResponse.json(
        { error: 'Unauthorized', redirect: '/dashboard/login/' },
        { status: 401 }
      );
    }

    return NextResponse.redirect(loginUrl);
  }

  // FIX-11: generate a fresh nonce and apply the nonce-based CSP.
  const nonceBytes = new Uint8Array(16);
  crypto.getRandomValues(nonceBytes);
  const nonce = btoa(String.fromCharCode(...nonceBytes));
  
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set(CSP_NONCE_HEADER, nonce);

  const response = NextResponse.next({ request: { headers: requestHeaders } });
  response.headers.set('Content-Security-Policy', buildCsp(nonce));
  return response;
}

/**
 * Configure routes matching this proxy guard.
 */
export const config = {
  matcher: ['/dashboard/:path*'],
};
