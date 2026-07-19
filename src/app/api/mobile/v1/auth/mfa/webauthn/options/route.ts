import { MobileAuthService } from '@/auth/services/mobile-auth.service';
import { mobileJson, mobileOptions, requireJson } from '@/auth/lib/mobile';

export const runtime = 'nodejs';

export function OPTIONS(request: Request) { return mobileOptions(request); }

export async function POST(request: Request) {
  if (!requireJson(request)) return mobileJson(request, { error: 'Content-Type must be application/json.' }, { status: 415 });
  let body: { challengeToken?: unknown };
  try { body = await request.json() as typeof body; } catch { return mobileJson(request, { error: 'Invalid request.' }, { status: 400 }); }
  if (typeof body.challengeToken !== 'string') return mobileJson(request, { error: 'Invalid request.' }, { status: 400 });
  const options = await new MobileAuthService().webAuthnOptions(body.challengeToken);
  if (!options) return mobileJson(request, { error: 'Invalid or expired verification challenge.' }, { status: 401 });
  return mobileJson(request, options);
}
