import { NextResponse } from 'next/server';
import { cookies, headers } from 'next/headers';
import { MfaService } from '@/auth/services/mfa.service';
import { LoginService } from '@/auth/services/login.service';
import { RateLimitService } from '@/auth/services/rate-limit.service';
import { UserRepository } from '@/auth/repositories/user.repository';
import { WebAuthnChallengeRepository } from '@/auth/repositories/webauthn-challenge.repository';
import { assertSameOriginStrict, CsrfError, getClientIp } from '@/auth/lib/request';
import { getDeviceId, setServerDeviceToken } from '@/auth/lib/device';
import { setAuthCookies, sessionCookieOpts, strictCookieOpts } from '@/auth/lib/cookies';
import { getEnv } from '@/auth/config/env';
import { AuthError } from '@/auth/errors/auth-errors';
import { challengeFromClientDataJSON, parseAuthenticationResponse } from '@/auth/lib/webauthn';

export async function POST(request: Request) {
  try {
    await assertSameOriginStrict();
    const cookieStore = await cookies();
    const payload = await request.json().catch(() => null) as { email?: unknown; response?: unknown } | null;
    const email = typeof payload?.email === 'string' ? payload.email.trim().toLowerCase() : '';
    const body = parseAuthenticationResponse(payload?.response ?? null);
    const challenge = body ? challengeFromClientDataJSON(body.response.clientDataJSON) : null;
    if (!email || !body || !challenge) {
      return NextResponse.json({ error: 'Invalid WebAuthn response' }, { status: 400 });
    }

    const ip = await getClientIp();
    const rateLimitService = new RateLimitService();
    await rateLimitService.checkRateLimit(ip, email);

    const mfaService = new MfaService();
    const device = await getDeviceId();
    if (!device?.serverDeviceId) {
      return NextResponse.json(
        { error: 'This passkey is saved for another device. Add a passkey on this device or sign in with email and password.' },
        { status: 401 }
      );
    }

    const ua = (await headers()).get('user-agent') || null;

    const user = await new UserRepository().findByEmail(email);
    if (!user || user.status !== 'active') {
      await rateLimitService.recordIpFailure(ip, ua);
      return NextResponse.json({ error: 'Invalid WebAuthn response' }, { status: 400 });
    }

    const challengeDoc = await new WebAuthnChallengeRepository().consume({
      challenge,
      purpose: 'passwordless_login',
      userId: user._id,
    });
    if (!challengeDoc) {
      await rateLimitService.recordIpFailure(ip, ua);
      return NextResponse.json({ error: 'Session expired' }, { status: 401 });
    }
    if (!challengeDoc.deviceObjectId || !challengeDoc.deviceObjectId.equals(device.serverDeviceId)) {
      return NextResponse.json(
        { error: 'This passkey is saved for another device. Add a passkey on this device or sign in with email and password.' },
        { status: 401 }
      );
    }

    const verification = await mfaService.verifyWebAuthnPasswordlessAuthentication(
      body,
      challengeDoc.challenge,
      device.serverDeviceId,
      user._id
    );
    if (verification && 'error' in verification) {
      return NextResponse.json(
        { error: 'This passkey is saved for another device. Add a passkey on this device or sign in with email and password.' },
        { status: 401 }
      );
    }
    if (!verification) {
      await rateLimitService.recordIpFailure(ip, ua);
      return NextResponse.json({ error: 'Invalid WebAuthn response' }, { status: 400 });
    }
    const result = await new LoginService().loginWithPasskey(verification.userId, ip, ua);
    if (result.status === 'mfa_required') {
      cookieStore.set('cws_2fa_pending', result.pendingAuthToken, {
        ...strictCookieOpts(getEnv(), { path: '/' }),
        maxAge: 5 * 60,
      });
      return NextResponse.json({ success: true, redirect: '/dashboard/verify-2fa?method=email' });
    }
    await setAuthCookies({ sessionCookie: result.sessionCookie, refreshToken: result.refreshToken });

    if (device.serverDeviceId) {
      await setServerDeviceToken(device.serverDeviceId);
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    if (err instanceof CsrfError) return NextResponse.json({ error: 'Request blocked.' }, { status: 403 });
    if (err instanceof AuthError) return NextResponse.json({ error: err.publicMessage }, { status: 401 });
    console.error('WebAuthn verify error:', err instanceof Error ? err.name : 'UnknownError');
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
