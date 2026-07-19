import { getMobileJwks } from '@/auth/services/mobile-token.service';
import { mobileJson, mobileOptions } from '@/auth/lib/mobile';

export const runtime = 'nodejs';

export function OPTIONS(request: Request) { return mobileOptions(request); }

export async function GET(request: Request) {
  try {
    return mobileJson(request, await getMobileJwks(), { headers: { 'Cache-Control': 'public, max-age=300' } });
  } catch {
    return mobileJson(request, { error: 'Mobile authentication is not configured.' }, { status: 503 });
  }
}
