import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { cookies } from 'next/headers';
import { ObjectId } from 'mongodb';
import { LogoutService, SessionService } from '@/auth/services';
import { verifySessionSignature } from '@/auth/crypto/token';
import { getEnv } from '@/auth/config/env';
import { assertSameOrigin } from '@/auth/lib/request';
import { clearingCookieOpts } from '@/auth/lib/cookies';

const SESSION_COOKIE = 'cws_session';
const REFRESH_COOKIE = 'cws_refresh';
const DEVICE_TOKEN_COOKIE = 'cws_device_token';

/**
 * Route handler to terminate the current session and clear cookies.
 * POST /api/auth/logout
 *
 * C1: protected by `assertSameOrigin` (CSRF guard), and all cleared auth
 * cookies are expired with Strict/Stay attributes matching issuance.
 */
export async function POST(request: NextRequest) {
  // CSRF / origin guard for this state-changing route.
  try {
    await assertSameOrigin();
  } catch {
    return new NextResponse(null, { status: 403 });
  }

  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get(SESSION_COOKIE);

  if (sessionCookie && sessionCookie.value) {
    try {
      const env = getEnv();
      const sessionIdStr = verifySessionSignature(sessionCookie.value, env.SESSION_SECRET);

      if (sessionIdStr) {
        const sessionId = new ObjectId(sessionIdStr);
        // Revoke refresh-token family first so a stolen refresh cannot re-auth.
        await new SessionService().revokeRefreshFamily(sessionId, 'logout');
        const logoutService = new LogoutService();
        await logoutService.logout(sessionId, 'user');
      }
    } catch (err) {
      console.error('Session termination failed during logout route:', err);
    }
  }

  // Clear auth cookies. Session stays Lax; refresh + device tokens are
  // high-value → Strict (mirrors issuance in cookies.ts / device.ts).
  cookieStore.set(SESSION_COOKIE, '', clearingCookieOpts('lax', '/'));
  cookieStore.set(REFRESH_COOKIE, '', clearingCookieOpts('strict', '/api/auth/refresh'));
  cookieStore.set(DEVICE_TOKEN_COOKIE, '', clearingCookieOpts('strict', '/'));

  return new NextResponse(null, { status: 204 });
}
