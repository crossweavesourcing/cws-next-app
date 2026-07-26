import type { NextRequest } from 'next/server';
import { SectionService } from '@/auth/services/section.service';
import { authenticateBearerRequest, mobileJson, mobileOptions } from '@/auth/lib/mobile';

export async function OPTIONS(request: NextRequest) {
  return mobileOptions(request);
}

export async function GET(request: NextRequest) {
  const auth = await authenticateBearerRequest(request);
  if (!auth) return mobileJson(request, { error: 'Unauthorized' }, { status: 401 });
  if (auth.user.role !== 'admin') return mobileJson(request, { error: 'Forbidden' }, { status: 403 });
  try {
    const sections = await new SectionService().getAdminSections({ userId: auth.user._id, sessionId: auth.session._id, source: 'mobile' });
    return mobileJson(request, { success: true, sections }, { status: 200 });
  } catch {
    return mobileJson(request, { error: 'Internal server error' }, { status: 500 });
  }
}
