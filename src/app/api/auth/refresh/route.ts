import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { cookies } from 'next/headers';
import { SessionService } from '@/auth/services';
import { RefreshTokenRepository } from '@/auth/repositories';
import { hashToken } from '@/auth/crypto/token';
import { getClientIp, assertSameOriginStrict } from '@/auth/lib/request';
import { getEnv } from '@/auth/config/env';
import { AuditLogRepository } from '@/auth/repositories';
import { clearingCookieOpts, isSecureCookies } from '@/auth/lib/cookies';

const SESSION_COOKIE = 'cws_session';
const REFRESH_COOKIE = 'cws_refresh';

/**
 * POST /api/auth/refresh
 * Rotates the refresh token, issuing a new session cookie + refresh cookie.
 * On reuse detection, revokes the session family and clears cookies.
 *
 * C1: protected by `assertSameOrigin` (already), refresh cookie issued Strict
 * (high-value token, only read on same-site refresh POSTs).
 */
export async function POST(request: NextRequest) {
  const env = getEnv();
  const cookieStore = await cookies();
  const refreshCookie = cookieStore.get(REFRESH_COOKIE);

  // Origin guard (CSRF protection for this state-changing route).
  try {
    await assertSameOriginStrict();
  } catch {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  if (!refreshCookie || !refreshCookie.value) {
    return NextResponse.json({ error: 'No refresh token' }, { status: 401 });
  }

  const ipAddress = await getClientIp();
  const userAgent = request.headers.get('user-agent') || null;
  const tokenHash = hashToken(refreshCookie.value);

  const sessionService = new SessionService();
  const refreshRepo = new RefreshTokenRepository();
  const auditRepo = new AuditLogRepository();

  const deviceCookie = cookieStore.get('cws_device_token');
  const clientDeviceToken = deviceCookie ? deviceCookie.value : null;

  const result = await sessionService.rotateRefreshToken(tokenHash, ipAddress, userAgent, clientDeviceToken);

  // Reuse / unknown / revoked token — or expiry detected at refresh time.
  if (!result || 'expired' in result) {
    const expired = result && 'expired' in result;

    if (!expired) {
      // Unknown / reused / revoked token.
      const prior = await refreshRepo.findByHash(tokenHash);
      if (prior) {
        await auditRepo.log({
          userId: prior.userId,
          sessionId: prior.sessionId,
          action: 'auth.refresh.reuse_detected',
          status: 'WARNING',
          errorCode: 'AUTH_REFRESH_REUSE',
          actor: { type: 'user', id: prior.userId },
          source: { platform: 'web', appVersion: '0.1.0' },
          correlationId: null,
          requestId: null,
          resource: { type: 'session', id: prior.sessionId.toString() },
          metadata: { reason: 'refresh token reuse or unknown token' },
          ipAddress,
          userAgent,
        });
      }
    }
    // Clear both cookies.
    cookieStore.set(SESSION_COOKIE, '', clearingCookieOpts('lax', '/'));
    cookieStore.set(REFRESH_COOKIE, '', clearingCookieOpts('strict', '/api/auth/refresh'));
    // Generic message either way (do not disclose the specific reason to the client).
    return NextResponse.json(
      { error: expired ? 'Session expired' : 'Session revoked' },
      { status: 401 }
    );
  }

  // Success: issue rotated cookies. Session stays Lax (needed for top-level
  // navigation); refresh token is high-value → Strict.
  const secure = isSecureCookies();
  cookieStore.set(SESSION_COOKIE, result.sessionCookie, {
    httpOnly: true,
    secure,
    sameSite: 'lax',
    path: '/',
    maxAge: Math.floor(env.ACCESS_SESSION_TTL_MS / 1000),
  });
  cookieStore.set(REFRESH_COOKIE, result.refreshToken, {
    httpOnly: true,
    secure,
    sameSite: 'strict',
    path: '/api/auth/refresh',
    maxAge: Math.floor(env.REFRESH_TOKEN_TTL_MS / 1000),
  });

  return NextResponse.json({ ok: true });
}
