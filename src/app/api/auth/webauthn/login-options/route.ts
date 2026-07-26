import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { MfaService } from '@/auth/services/mfa.service';
import { PendingAuthenticationRepository } from '@/auth/repositories/pending-authentication.repository';
import * as crypto from 'crypto';
import { isSecureCookies } from '@/auth/lib/cookies';

export async function POST(request: Request) {
  try {
    const cookieStore = await cookies();
    const pending = cookieStore.get('cws_2fa_pending');
    
    if (!pending?.value) {
      return NextResponse.json({ error: 'Session expired' }, { status: 401 });
    }

    const tokenHash = crypto.createHash('sha256').update(pending.value).digest('hex');
    const pendingRepo = new PendingAuthenticationRepository();
    const pendingAuth = await pendingRepo.findByTokenHash(tokenHash);

    if (!pendingAuth || pendingAuth.consumedAt || pendingAuth.expiresAt.getTime() < Date.now()) {
      return NextResponse.json({ error: 'Invalid session' }, { status: 401 });
    }

    const mfaService = new MfaService();
    const options = await mfaService.generateWebAuthnAuthenticationOptions(pendingAuth.userId);
    
    // Store challenge in cookie for verification step
    cookieStore.set('cws_webauthn_challenge', options.challenge, {
      httpOnly: true,
      secure: isSecureCookies(),
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
