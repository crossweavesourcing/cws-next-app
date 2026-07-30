import type { NextRequest } from 'next/server';
import { ObjectId } from 'mongodb';
import { MfaService } from '@/auth/services/mfa.service';
import { authenticateBearerRequest, mobileJson, mobileOptions, requireJson } from '@/auth/lib/mobile';

export const runtime = 'nodejs';

export function OPTIONS(request: Request) { return mobileOptions(request); }

function parseId(id: string): ObjectId | null {
  return ObjectId.isValid(id) ? new ObjectId(id) : null;
}

export async function PATCH(request: NextRequest, props: { params: Promise<{ id: string }> }) {
  if (!requireJson(request)) return mobileJson(request, { error: 'Content-Type must be application/json.' }, { status: 415 });
  const auth = await authenticateBearerRequest(request);
  if (!auth) return mobileJson(request, { error: 'Unauthorized.' }, { status: 401 });
  const { id } = await props.params;
  const credentialId = parseId(id);
  if (!credentialId) return mobileJson(request, { error: 'Invalid passkey.' }, { status: 400 });
  let body: { name?: unknown };
  try { body = await request.json() as typeof body; } catch { return mobileJson(request, { error: 'Invalid request.' }, { status: 400 }); }
  if (typeof body.name !== 'string') return mobileJson(request, { error: 'Invalid request.' }, { status: 400 });
  const renamed = await new MfaService().renameWebAuthnCredential(auth.user._id, credentialId, body.name);
  if (!renamed) return mobileJson(request, { error: 'Passkey not found.' }, { status: 404 });
  return mobileJson(request, { success: true });
}

export async function DELETE(request: NextRequest, props: { params: Promise<{ id: string }> }) {
  const auth = await authenticateBearerRequest(request);
  if (!auth) return mobileJson(request, { error: 'Unauthorized.' }, { status: 401 });
  const { id } = await props.params;
  const credentialId = parseId(id);
  if (!credentialId) return mobileJson(request, { error: 'Invalid passkey.' }, { status: 400 });
  const service = new MfaService();
  const passkeys = await service.listWebAuthnCredentials(auth.user._id);
  if (
    passkeys.length <= 1 &&
    !auth.user.security?.totpEnabled &&
    auth.user.security?.requireTwoFactor
  ) {
    return mobileJson(request, { error: 'Add another strong verification method before removing this passkey.' }, { status: 400 });
  }
  await service.removeWebAuthnCredential(auth.user._id, credentialId);
  return mobileJson(request, { success: true });
}
