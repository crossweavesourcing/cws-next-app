import { requireActiveSession, getEffectivePermissions } from '@/auth/dal';
import { CatalogDocumentService } from '@/auth/services/catalog-document.service';
import { catalogSourceResponse } from '@/lib/catalog-source-response';

export const dynamic = 'force-dynamic';

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireActiveSession();
  const effective = await getEffectivePermissions(session.userId);
  const catalog = await new CatalogDocumentService().getManaged({ userId: session.userId, sessionId: session._id, permissions: effective.permissions, source: 'web' }, (await params).id);
  if (!catalog) return new Response('Catalog not found.', { status: 404 });
  return catalogSourceResponse(catalog.asset.publicId, request);
}
