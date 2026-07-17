import { NextResponse } from 'next/server';
import { cookies, headers } from 'next/headers';
import { ObjectId } from 'mongodb';
import { MfaService } from '@/auth/services/mfa.service';
import { SessionService } from '@/auth/services/session.service';
import { verifySessionSignature } from '@/auth/crypto/token';
import { getEnv } from '@/auth/config/env';
import { getClientIp } from '@/auth/lib/request';
import { ensureDeviceId, setServerDeviceToken } from '@/auth/lib/device';
import { setAuthCookies } from '@/auth/lib/cookies';

export async function POST(request: Request) {
  try {
    const cookieStore = await cookies();
    const pending = cookieStore.get('cws_2fa_pending') ?? cookieStore.get('cws_stepup_pending');
    const challengeCookie = cookieStore.get('cws_webauthn_challenge');
    
    if (!pending?.value || !challengeCookie?.value) {
      return NextResponse.json({ error: 'Session expired' }, { status: 401 });
    }

    const userIdStr = verifySessionSignature(pending.value, getEnv().SESSION_SECRET);
    if (!userIdStr) {
      return NextResponse.json({ error: 'Invalid session' }, { status: 401 });
    }

    const userId = new ObjectId(userIdStr);
    const body = await request.json();
    const mfaService = new MfaService();
    
    const isValid = await mfaService.verifyWebAuthnAuthentication(userId, body, challengeCookie.value);
    
    if (!isValid) {
      return NextResponse.json({ error: 'Invalid WebAuthn response' }, { status: 400 });
    }

    // Success! Issue real session.
    const ip = await getClientIp();
    const ua = (await headers()).get('user-agent') || null;
    const device = await ensureDeviceId();
    const sessionService = new SessionService();
    
    const created = await sessionService.createSession(
      userId,
      ip,
      ua,
      'password',
      device
    );
    
    if (created.status !== 'authenticated') {
      return NextResponse.json({ error: 'Unable to complete sign-in' }, { status: 400 });
    }
    
    const { sessionCookie, refreshToken, deviceObjectId } = created;

    if (deviceObjectId) {
      await setServerDeviceToken(deviceObjectId);
    }

    await setAuthCookies({ sessionCookie, refreshToken });

    // Clear pending cookies
    for (const name of ['cws_2fa_pending', 'cws_stepup_pending', 'cws_webauthn_challenge']) {
      cookieStore.set(name, '', { maxAge: 0, path: '/' });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('WebAuthn verify error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
