import type { NextRequest } from 'next/server';
import { MfaService } from '@/auth/services/mfa.service';
import { authenticateBearerRequest, mobileJson, mobileOptions } from '@/auth/lib/mobile';

export const runtime = 'nodejs';

export function OPTIONS(request: Request) { return mobileOptions(request); }

export async function GET(request: NextRequest) {
  const auth = await authenticateBearerRequest(request);
  if (!auth) return mobileJson(request, { error: 'Unauthorized.' }, { status: 401 });
  const passkeys = await new MfaService().listWebAuthnCredentials(auth.user._id);
  return mobileJson(request, { passkeys });
}
