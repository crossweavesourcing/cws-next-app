import { getClientIp } from '@/auth/lib/request';
import { MobileAuthService } from '@/auth/services/mobile-auth.service';
import { mobileJson, mobileOptions, requireJson } from '@/auth/lib/mobile';

export const runtime = 'nodejs';

export function OPTIONS(request: Request) { return mobileOptions(request); }

export async function POST(request: Request) {
  if (!requireJson(request)) return mobileJson(request, { error: 'Content-Type must be application/json.' }, { status: 415 });
  let body: { challengeToken?: unknown; code?: unknown };
  try { body = await request.json() as typeof body; } catch { return mobileJson(request, { error: 'Invalid request.' }, { status: 400 }); }
  if (typeof body.challengeToken !== 'string' || typeof body.code !== 'string') return mobileJson(request, { error: 'Invalid request.' }, { status: 400 });
  const result = await new MobileAuthService().completeEmail(body.challengeToken, body.code, await getClientIp(), request.headers.get('user-agent'));
  if (!result) return mobileJson(request, { error: 'Invalid or expired verification challenge.' }, { status: 401 });
  return mobileJson(request, result);
}
