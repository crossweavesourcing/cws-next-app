import type { NextRequest } from 'next/server';
import { mobileJson, mobileOptions, requireJson } from '@/auth/lib/mobile';
import { CatalogDocumentService } from '@/auth/services/catalog-document.service';
import { catalogMobileActor, catalogMobileError } from './_utils';

export async function GET(request: NextRequest) {
  const actor = await catalogMobileActor(request); if (actor instanceof Response) return actor;
  try { return mobileJson(request, { success: true, catalogs: await new CatalogDocumentService().list(actor, { categoryId: request.nextUrl.searchParams.get('categoryId') ?? undefined, productId: request.nextUrl.searchParams.get('productId') ?? undefined }) }); } catch (error) { return catalogMobileError(request, error); }
}
export async function POST(request: NextRequest) {
  const actor = await catalogMobileActor(request); if (actor instanceof Response) return actor;
  if (!requireJson(request)) return mobileJson(request, { error: 'Content-Type must be application/json' }, { status: 415 });
  try {
    const body = await request.json() as Record<string, unknown>;
    const service = new CatalogDocumentService();
    if (body.operation === 'initialize') return mobileJson(request, { success: true, upload: await service.initializeUpload(actor, body.catalog) });
    if (body.operation === 'finalize') {
      const catalog = await service.finalizeCreate(actor, body.catalog, body.publicId as string);
      // Fire background processing (same pattern as web Server Action)
      const appUrl = process.env.APP_URL ?? '';
      const secret = process.env.CATALOG_PROCESS_SECRET ?? '';
      if (appUrl && secret) {
        // Await the background fetch to prevent Next.js from throwing an Unhandled Promise Rejection
        // if it tears down the route handler context before the fetch request initializes.
        await fetch(`${appUrl}/api/catalog/process`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-catalog-secret': secret },
          body: JSON.stringify({ catalogId: catalog._id, publicId: body.publicId, actorUserId: actor.userId.toString() }),
        }).catch((error) => console.error(JSON.stringify({ level: 'error', event: 'catalog.process.mobile.trigger.failed', catalogId: catalog._id, errorMessage: error instanceof Error ? error.message : 'Unknown' })));
      }
      return mobileJson(request, { success: true, catalog, jobId: catalog._id }, { status: 201 });
    }
    return mobileJson(request, { error: 'Invalid operation.' }, { status: 400 });
  } catch (error) { return catalogMobileError(request, error); }
}
export function OPTIONS(request: NextRequest) { return mobileOptions(request); }
