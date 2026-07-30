import { mobileJson, mobileOptions } from '@/auth/lib/mobile';

export const runtime = 'nodejs';

export function OPTIONS(request: Request) { return mobileOptions(request); }

export async function POST(request: Request) {
  return mobileJson(
    request,
    { error: 'Passkeys are available for passwordless sign-in only. Use email code for verification.' },
    { status: 410 }
  );
}
