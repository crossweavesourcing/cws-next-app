import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { ObjectId } from 'mongodb';
import { MfaService } from '@/auth/services/mfa.service';
import { verifySessionSignature } from '@/auth/crypto/token';
import { getEnv } from '@/auth/config/env';

export async function POST(request: Request) {
  try {
    const cookieStore = await cookies();
    const pending = cookieStore.get('cws_2fa_pending') ?? cookieStore.get('cws_stepup_pending');
    
    if (!pending?.value) {
      return NextResponse.json({ error: 'Session expired' }, { status: 401 });
    }

    const userIdStr = verifySessionSignature(pending.value, getEnv().SESSION_SECRET);
    if (!userIdStr) {
      return NextResponse.json({ error: 'Invalid session' }, { status: 401 });
    }

    const mfaService = new MfaService();
    const options = await mfaService.generateWebAuthnAuthenticationOptions(new ObjectId(userIdStr));
    
    // Store challenge in cookie for verification step
    cookieStore.set('cws_webauthn_challenge', options.challenge, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 5 * 60, // 5 minutes
    });

    return NextResponse.json(options);
  } catch (err) {
    console.error('WebAuthn options error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
