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
  try { const body = await request.json(); const service = new CatalogDocumentService(); if (body.operation === 'initialize') return mobileJson(request, { success: true, upload: await service.initializeUpload(actor, body.catalog) }); if (body.operation === 'finalize') return mobileJson(request, { success: true, catalog: await service.finalizeCreate(actor, body.catalog, body.publicId) }, { status: 201 }); return mobileJson(request, { error: 'Invalid operation.' }, { status: 400 }); } catch (error) { return catalogMobileError(request, error); }
}
export function OPTIONS(request: NextRequest) { return mobileOptions(request); }
