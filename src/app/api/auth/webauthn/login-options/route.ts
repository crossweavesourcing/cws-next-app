import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { MfaService } from '@/auth/services/mfa.service';
import { UserRepository } from '@/auth/repositories/user.repository';
import { WebAuthnChallengeRepository } from '@/auth/repositories/webauthn-challenge.repository';
import { assertSameOriginStrict, CsrfError, getClientIp } from '@/auth/lib/request';
import { getDeviceId } from '@/auth/lib/device';

export async function POST(request: Request) {
  try {
    await assertSameOriginStrict();
    const mfaService = new MfaService();
    const device = await getDeviceId();
    const body = await request.json().catch(() => null) as { email?: unknown } | null;
    const email = typeof body?.email === 'string' ? body.email.trim().toLowerCase() : '';
    if (!email) {
      return NextResponse.json({ error: 'Enter your email before using a passkey.' }, { status: 400 });
    }

    if (!device?.serverDeviceId) {
      return NextResponse.json(
        { error: 'This passkey is saved for another device. Add a passkey on this device or sign in with email and password.' },
        { status: 401 }
      );
    }

    const user = await new UserRepository().findByEmail(email);
    if (!user || user.status !== 'active') {
      return NextResponse.json({ error: 'No passkey is available for this email on this device.' }, { status: 404 });
    }

    const options = await mfaService.generateWebAuthnPasswordlessOptions(user._id, device.serverDeviceId);
    if (!options) {
      return NextResponse.json({ error: 'No passkey is available for this email on this device.' }, { status: 404 });
    }

    await new WebAuthnChallengeRepository().create({
      challenge: options.challenge,
      purpose: 'passwordless_login',
      userId: user._id,
      deviceObjectId: device.serverDeviceId,
      platform: 'web',
      ipAddress: await getClientIp(),
      userAgent: (await headers()).get('user-agent'),
    });
    return NextResponse.json(options);
  } catch (err) {
    if (err instanceof CsrfError) return NextResponse.json({ error: 'Request blocked.' }, { status: 403 });
    console.error('WebAuthn options error:', err instanceof Error ? err.name : 'UnknownError');
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
