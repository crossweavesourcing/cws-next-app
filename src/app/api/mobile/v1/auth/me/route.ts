import type { NextRequest } from 'next/server';
import { authenticateBearerRequest, mobileJson, mobileOptions } from '@/auth/lib/mobile';

export const runtime = 'nodejs';

export function OPTIONS(request: Request) { return mobileOptions(request); }

export async function GET(request: NextRequest) {
  const auth = await authenticateBearerRequest(request);
  if (!auth) return mobileJson(request, { error: 'Unauthorized.' }, { status: 401 });
  return mobileJson(request, {
    id: auth.user._id.toHexString(),
    role: auth.user.role,
    status: auth.user.status,
    profile: {
      displayName: auth.user.profile.displayName,
      firstName: auth.user.profile.firstName,
      lastName: auth.user.profile.lastName,
      employeeId: auth.user.profile.employeeId,
      department: auth.user.profile.department,
    },
  });
}
