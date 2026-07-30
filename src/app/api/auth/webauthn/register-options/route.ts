import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { requireActiveSession } from '@/auth/dal';
import { MfaService } from '@/auth/services/mfa.service';
import { UserRepository } from '@/auth/repositories/user.repository';
import { DeviceRepository } from '@/auth/repositories/device.repository';
import { WebAuthnChallengeRepository } from '@/auth/repositories/webauthn-challenge.repository';
import { assertSameOriginStrict, CsrfError, getClientIp } from '@/auth/lib/request';
import { classifyRequest, ensureDeviceId } from '@/auth/lib/device';

export const runtime = 'nodejs';

export async function POST() {
  try {
    await assertSameOriginStrict();
    const session = await requireActiveSession();
    const userRepo = new UserRepository();
    const email = await userRepo.findPrimaryEmail(session.userId);
    if (!email) return NextResponse.json({ error: 'Primary email is unavailable.' }, { status: 400 });

    const ipAddress = await getClientIp();
    const requestDevice = await ensureDeviceId();
    const classification = await classifyRequest();
    const device = await new DeviceRepository().upsertOnLogin({
      userId: session.userId,
      serverDeviceId: requestDevice.serverDeviceId,
      clientDeviceId: requestDevice.clientDeviceId,
      type: classification.type,
      platform: classification.platform,
      browser: classification.browser,
      operatingSystem: classification.operatingSystem,
      userAgent: classification.userAgent,
      ipAddress,
      location: null,
    });
    const deviceObjectId = device.doc?._id ?? requestDevice.serverDeviceId;
    if (!deviceObjectId) {
      return NextResponse.json({ error: 'Unable to save this device for passkey setup.' }, { status: 400 });
    }

    const options = await new MfaService().generateWebAuthnRegistrationOptions(session.userId, email);
    await new WebAuthnChallengeRepository().create({
      challenge: options.challenge,
      purpose: 'registration',
      userId: session.userId,
      deviceObjectId,
      platform: 'web',
      ipAddress,
      userAgent: (await headers()).get('user-agent'),
    });
    return NextResponse.json(options);
  } catch (err) {
    if (err instanceof CsrfError) return NextResponse.json({ error: 'Request blocked.' }, { status: 403 });
    console.error('WebAuthn registration options error:', err instanceof Error ? err.name : 'UnknownError');
    return NextResponse.json({ error: 'Unable to start passkey setup.' }, { status: 500 });
  }
}
