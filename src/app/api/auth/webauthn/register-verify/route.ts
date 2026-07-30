import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { revalidatePath } from 'next/cache';
import { requireActiveSession } from '@/auth/dal';
import { MfaService } from '@/auth/services/mfa.service';
import { WebAuthnChallengeRepository } from '@/auth/repositories/webauthn-challenge.repository';
import { AuditLogRepository } from '@/auth/repositories/audit-log.repository';
import { assertSameOriginStrict, CsrfError, getClientIp } from '@/auth/lib/request';
import { getDeviceId } from '@/auth/lib/device';
import { challengeFromClientDataJSON, parseRegistrationResponse } from '@/auth/lib/webauthn';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  const ipAddress = await getClientIp();
  const userAgent = (await headers()).get('user-agent');
  try {
    await assertSameOriginStrict();
    const session = await requireActiveSession();
    const body = parseRegistrationResponse(await request.json().catch(() => null));
    const challenge = body ? challengeFromClientDataJSON(body.response.clientDataJSON) : null;
    if (!body || !challenge) return NextResponse.json({ error: 'Invalid passkey response.' }, { status: 400 });

    const challengeDoc = await new WebAuthnChallengeRepository().consume({
      challenge,
      purpose: 'registration',
      userId: session.userId,
    });
    if (!challengeDoc) return NextResponse.json({ error: 'Passkey setup expired. Try again.' }, { status: 401 });
    const device = await getDeviceId();
    if (
      !device?.serverDeviceId ||
      !challengeDoc.deviceObjectId ||
      !challengeDoc.deviceObjectId.equals(device.serverDeviceId)
    ) {
      return NextResponse.json({ error: 'This passkey setup belongs to another device. Start setup again on this device.' }, { status: 401 });
    }

    const success = await new MfaService().verifyWebAuthnRegistration(
      session.userId,
      body,
      challengeDoc.challenge,
      challengeDoc.deviceObjectId
    );
    await new AuditLogRepository().log({
      userId: session.userId,
      sessionId: session._id,
      action: success ? 'auth.passkey.registered' : 'auth.passkey.registration_failed',
      status: success ? 'SUCCESS' : 'FAILURE',
      errorCode: success ? null : 'WEBAUTHN_REGISTRATION_FAILED',
      actor: { type: 'user', id: session.userId },
      source: { platform: 'web', appVersion: '0.1.0' },
      correlationId: null,
      requestId: null,
      resource: null,
      metadata: null,
      ipAddress,
      userAgent,
    });

    if (!success) return NextResponse.json({ error: 'Passkey setup could not be verified.' }, { status: 400 });
    revalidatePath('/dashboard/account-security');
    return NextResponse.json({ success: true });
  } catch (err) {
    if (err instanceof CsrfError) return NextResponse.json({ error: 'Request blocked.' }, { status: 403 });
    console.error('WebAuthn registration verify error:', err instanceof Error ? err.name : 'UnknownError');
    return NextResponse.json({ error: 'Unable to finish passkey setup.' }, { status: 500 });
  }
}
