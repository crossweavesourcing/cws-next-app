import { CatalogDocumentService } from '@/auth/services/catalog-document.service';
import { catalogSourceResponse } from '@/lib/catalog-source-response';

export const dynamic = 'force-dynamic';

export async function GET(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const catalog = await new CatalogDocumentService().getPublicBySlug((await params).slug);
  if (!catalog) return new Response('Catalog not found.', { status: 404 });
  return catalogSourceResponse(catalog.asset.publicId, request);
}
