'use server';

import { ObjectId } from 'mongodb';
import { revalidatePath } from 'next/cache';
import { requireActiveSession } from '@/auth/dal';
import { withCsrfGuard } from '@/auth/lib/csrf';
import { MfaService } from '@/auth/services/mfa.service';
import { AuditLogRepository } from '@/auth/repositories/audit-log.repository';

export type PasskeyActionResult = {
  success: boolean;
  error?: string;
};

function parseCredentialId(value: string): ObjectId | null {
  return ObjectId.isValid(value) ? new ObjectId(value) : null;
}

async function renamePasskeyActionImpl(id: string, name: string): Promise<PasskeyActionResult> {
  const credentialId = parseCredentialId(id);
  if (!credentialId) return { success: false, error: 'Invalid passkey.' };
  const normalized = name.trim();
  if (normalized.length > 80) return { success: false, error: 'Passkey name is too long.' };

  const session = await requireActiveSession();
  const renamed = await new MfaService().renameWebAuthnCredential(
    session.userId,
    credentialId,
    normalized || null
  );
  if (!renamed) return { success: false, error: 'Passkey was not found.' };

  await new AuditLogRepository().log({
    userId: session.userId,
    sessionId: session._id,
    action: 'auth.passkey.renamed',
    status: 'SUCCESS',
    errorCode: null,
    actor: { type: 'user', id: session.userId },
    source: { platform: 'web', appVersion: '0.1.0' },
    correlationId: null,
    requestId: null,
    resource: { type: 'webauthn_credential', id },
    metadata: null,
    ipAddress: session.ipAddress,
    userAgent: session.userAgent,
  });

  revalidatePath('/dashboard/account-security');
  return { success: true };
}

async function removePasskeyActionImpl(id: string): Promise<PasskeyActionResult> {
  const credentialId = parseCredentialId(id);
  if (!credentialId) return { success: false, error: 'Invalid passkey.' };

  const session = await requireActiveSession();
  const service = new MfaService();
  const passkeys = await service.listWebAuthnCredentials(session.userId);
  const { UserRepository } = await import('@/auth/repositories/user.repository');
  const user = await new UserRepository().findById(session.userId);
  if (
    passkeys.length <= 1 &&
    !user?.security?.totpEnabled &&
    user?.security?.requireTwoFactor
  ) {
    return { success: false, error: 'Add another strong verification method before removing this passkey.' };
  }

  await service.removeWebAuthnCredential(session.userId, credentialId);
  await new AuditLogRepository().log({
    userId: session.userId,
    sessionId: session._id,
    action: 'auth.passkey.removed',
    status: 'SUCCESS',
    errorCode: null,
    actor: { type: 'user', id: session.userId },
    source: { platform: 'web', appVersion: '0.1.0' },
    correlationId: null,
    requestId: null,
    resource: { type: 'webauthn_credential', id },
    metadata: null,
    ipAddress: session.ipAddress,
    userAgent: session.userAgent,
  });

  revalidatePath('/dashboard/account-security');
  return { success: true };
}

export const renamePasskeyAction = withCsrfGuard(renamePasskeyActionImpl);
export const removePasskeyAction = withCsrfGuard(removePasskeyActionImpl);
