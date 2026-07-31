import type { NextRequest } from 'next/server';
import { authenticateBearerRequest, hasCmsPermission, mobileJson } from '@/auth/lib/mobile';
import type { CatalogActor } from '@/auth/services/catalog-document.service';
import { classifyCatalogError } from '@/lib/catalog-errors';

export async function catalogMobileActor(request: NextRequest): Promise<CatalogActor | Response> {
  const auth = await authenticateBearerRequest(request);
  if (!auth) return mobileJson(request, { error: 'Unauthorized' }, { status: 401 });
  const permissions = (['categories', 'products'] as const).filter((permission) => hasCmsPermission(auth.user, permission));
  if (!permissions.length) return mobileJson(request, { error: 'Forbidden' }, { status: 403 });
  return { userId: auth.user._id, sessionId: auth.session._id, permissions, source: 'mobile' };
}

export function catalogMobileError(request: NextRequest, error: unknown) {
  console.error('Mobile catalog operation failed', error);
  const classified = classifyCatalogError(error);
  const status = classified.code === 'FORBIDDEN' ? 403
    : ['INVALID_INPUT', 'ASSOCIATION_NOT_FOUND', 'PDF_INVALID', 'UPLOAD_REJECTED'].includes(classified.code) ? 400
      : classified.code === 'STORAGE_NOT_CONFIGURED' || classified.code === 'PDF_RENDERING_UNAVAILABLE' ? 503 : 500;
  return mobileJson(request, { error: classified.message }, { status });
}
