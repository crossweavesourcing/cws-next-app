import { mobileJson, mobileOptions } from '@/auth/lib/mobile';

export const runtime = 'nodejs';

export function OPTIONS(request: Request) { return mobileOptions(request); }

export async function POST(request: Request) {
  return mobileJson(
    request,
    { error: 'Mobile passkeys are temporarily unavailable until device binding is supported.' },
    { status: 410 }
  );
}
