import type { NextRequest } from 'next/server';
import { mobileJson, mobileOptions, requireJson } from '@/auth/lib/mobile';
import { CatalogDocumentService } from '@/auth/services/catalog-document.service';
import { catalogMobileActor, catalogMobileError } from '../../_utils';
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) { const actor = await catalogMobileActor(request); if (actor instanceof Response) return actor; if (!requireJson(request)) return mobileJson(request, { error: 'Content-Type must be application/json' }, { status: 415 }); try { const body = await request.json(); return mobileJson(request, { success: true, catalog: await new CatalogDocumentService().updateAssociations(actor, (await params).id, { categoryId: body.categoryId ?? null, productId: body.productId ?? null }) }); } catch (error) { return catalogMobileError(request, error); } }
export function OPTIONS(request: NextRequest) { return mobileOptions(request); }
