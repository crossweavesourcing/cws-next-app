import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { OAuthService } from '@/auth/services';
import { isSecureCookies } from '@/auth/lib/cookies';

const OAUTH_STATE_COOKIE = 'cws_oauth_state';

/**
 * GET /api/auth/google
 * Starts the Google Authorization Code + PKCE flow. Persists the PKCE verifier,
 * state, and nonce in a short-lived, httpOnly, same-site cookie, then redirects
 * the browser to Google's consent screen.
 */
export async function GET() {
  let start;
  try {
    const oauth = new OAuthService();
    start = oauth.buildAuthorizationUrl();
  } catch (err) {
    console.error('Google OAuth start failed:', err);
    return NextResponse.json(
      { error: 'Google sign-in is not available. Contact an administrator.' },
      { status: 503 }
    );
  }

  const cookieStore = await cookies();
  cookieStore.set(OAUTH_STATE_COOKIE, JSON.stringify(start), {
    httpOnly: true,
    secure: isSecureCookies(),
    sameSite: 'lax',
    path: '/',
    maxAge: 10 * 60, // 10 minutes — enough for the redirect round-trip
  });

  return NextResponse.redirect(start.authorizationUrl);
}
