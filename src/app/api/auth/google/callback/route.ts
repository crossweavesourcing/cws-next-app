import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { cookies } from 'next/headers';
import { OAuthService, AlertingService } from '@/auth/services';
import { getClientIp } from '@/auth/lib/request';
import { getEnv } from '@/auth/config/env';
import { signSessionId } from '@/auth/crypto/token';
import { AuditLogRepository } from '@/auth/repositories';

const OAUTH_STATE_COOKIE = 'cws_oauth_state';
const SESSION_COOKIE = 'cws_session';
const REFRESH_COOKIE = 'cws_refresh';
const TWO_FA_PENDING_COOKIE = 'cws_2fa_pending';
const PW_PENDING_COOKIE = 'cws_pw_pending';
const STEPUP_PENDING_COOKIE = 'cws_stepup_pending';

/**
 * GET /api/auth/google/callback
 * Completes the Google OAuth flow: verifies state (CSRF), exchanges the code,
 * verifies the id_token, links/looks up the user, and issues session + refresh
 * cookies before redirecting into the dashboard.
 */
export async function GET(request: NextRequest) {
  const env = getEnv();
  const cookieStore = await cookies();
  const url = new URL(request.url);

  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  const error = url.searchParams.get('error');

  const stateCookie = cookieStore.get(OAUTH_STATE_COOKIE);
  const secure = process.env.NODE_ENV === 'production';

  // Clear the one-time state cookie regardless of outcome.
  const clearState = () =>
    cookieStore.set(OAUTH_STATE_COOKIE, '', {
      httpOnly: true,
      secure,
      sameSite: 'lax',
      path: '/',
      expires: new Date(0),
    });

  if (error) {
    clearState();
    return NextResponse.redirect(`${env.APP_URL}/dashboard/login/?error=oauth_cancelled`);
  }
  if (!code || !state || !stateCookie?.value) {
    clearState();
    return NextResponse.redirect(`${env.APP_URL}/dashboard/login/?error=oauth_invalid`);
  }

  let secrets: { state: string; codeVerifier: string; nonce: string };
  try {
    secrets = JSON.parse(stateCookie.value);
  } catch {
    clearState();
    return NextResponse.redirect(`${env.APP_URL}/dashboard/login/?error=oauth_invalid`);
  }

  const ipAddress = await getClientIp();
  const userAgent = request.headers.get('user-agent') || null;

  try {
    const oauth = new OAuthService();
    const result = await oauth.handleCallback(
      code,
      state,
      secrets.state,
      secrets.codeVerifier,
      secrets.nonce,
      ipAddress,
      userAgent
    );

    clearState();

    // FIX-03: parity with the password login flow. For MFA-enabled or
    // force-password-change accounts, no session is issued yet — set the
    // corresponding signed pending cookie and redirect to complete the login.
    if (result.status === 'mfa_required') {
      const pending = signSessionId(result.userId.toString(), env.SESSION_SECRET);
      cookieStore.set(TWO_FA_PENDING_COOKIE, pending, {
        httpOnly: true,
        secure,
        sameSite: 'lax',
        path: '/',
        maxAge: 5 * 60, // 5 minutes to complete 2FA
      });
      return NextResponse.redirect(`${env.APP_URL}/dashboard/verify-2fa`);
    }
    if (result.status === 'force_change') {
      const pending = signSessionId(result.userId.toString(), env.SESSION_SECRET);
      cookieStore.set(PW_PENDING_COOKIE, pending, {
        httpOnly: true,
        secure,
        sameSite: 'lax',
        path: '/',
        maxAge: 10 * 60, // 10 minutes to complete the change
      });
      return NextResponse.redirect(`${env.APP_URL}/dashboard/change-password`);
    }

    // Item 9: step-up (new device / country change). Set the signed
    // `cws_stepup_pending` cookie and redirect to verify-2fa to complete 2FA.
    if (result.status === 'step_up') {
      const pending = signSessionId(result.userId.toString(), env.SESSION_SECRET);
      cookieStore.set(STEPUP_PENDING_COOKIE, pending, {
        httpOnly: true,
        secure,
        sameSite: 'lax',
        path: '/',
        maxAge: 5 * 60, // 5 minutes to complete the step-up 2FA
      });
      return NextResponse.redirect(`${env.APP_URL}/dashboard/verify-2fa`);
    }

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
      sameSite: 'lax',
      path: '/api/auth/refresh',
      maxAge: Math.floor(env.REFRESH_TOKEN_TTL_MS / 1000),
    });

    return NextResponse.redirect(`${env.APP_URL}/dashboard/`);
  } catch (err) {
    console.error('Google OAuth callback failed:', err);
    await new AuditLogRepository().log({
      userId: null,
      sessionId: null,
      action: 'auth.login.failure',
      status: 'FAILURE',
      errorCode: 'AUTH_OAUTH_FAILED',
      actor: null,
      source: { platform: 'web', appVersion: '0.1.0' },
      correlationId: null,
      requestId: null,
      resource: null,
      metadata: { reason: err instanceof Error ? err.message : 'oauth callback error' },
      ipAddress,
      userAgent,
    });
    // Forward to the security sink so OAuth failures are watched, not just stored.
    await new AlertingService().recordFailure({
      identifier: 'google_oauth',
      userId: null,
      ipAddress,
      reason: 'AUTH_OAUTH_FAILED',
    });
    clearState();
    return NextResponse.redirect(`${env.APP_URL}/dashboard/login/?error=oauth_failed`);
  }
}
