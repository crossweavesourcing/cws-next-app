import { getClientIp } from '@/auth/lib/request';
import { MobileAuthService } from '@/auth/services/mobile-auth.service';
import { mobileJson, mobileOptions, requireJson } from '@/auth/lib/mobile';

export const runtime = 'nodejs';

export function OPTIONS(request: Request) { return mobileOptions(request); }

export async function POST(request: Request) {
  if (!requireJson(request)) return mobileJson(request, { error: 'Content-Type must be application/json.' }, { status: 415 });
  let body: unknown;
  try { body = await request.json(); } catch { return mobileJson(request, { error: 'Invalid request.' }, { status: 400 }); }
  try {
    const result = await new MobileAuthService().passwordLogin(
      body,
      await getClientIp(),
      request.headers.get('user-agent')
    );
    if (result.status === 'force_change') return mobileJson(request, { error: 'Password change required.' }, { status: 403 });
    if (result.status === 'mfa_required') return mobileJson(request, result, { status: 202 });
    return mobileJson(request, result);
  } catch {
    return mobileJson(request, { error: 'Invalid credentials.' }, { status: 401 });
  }
}
