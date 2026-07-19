import { getClientIp } from '@/auth/lib/request';
import { MobileAuthService } from '@/auth/services/mobile-auth.service';
import { mobileJson, mobileOptions, requireJson } from '@/auth/lib/mobile';

export const runtime = 'nodejs';

export function OPTIONS(request: Request) { return mobileOptions(request); }

export async function POST(request: Request) {
  if (!requireJson(request)) return mobileJson(request, { error: 'Content-Type must be application/json.' }, { status: 415 });
  let body: { challengeToken?: unknown; response?: unknown };
  try { body = await request.json() as typeof body; } catch { return mobileJson(request, { error: 'Invalid request.' }, { status: 400 }); }
  if (typeof body.challengeToken !== 'string' || !body.response || typeof body.response !== 'object') {
    return mobileJson(request, { error: 'Invalid request.' }, { status: 400 });
  }
  const result = await new MobileAuthService().completeWebAuthn(
    body.challengeToken,
    body.response as Parameters<import('@/auth/services/mfa.service').MfaService['verifyWebAuthnAuthentication']>[1],
    await getClientIp(),
    request.headers.get('user-agent')
  );
  if (!result) return mobileJson(request, { error: 'Invalid or expired verification challenge.' }, { status: 401 });
  return mobileJson(request, result);
}
