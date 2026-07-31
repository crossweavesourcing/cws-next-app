import type { NextRequest } from 'next/server';
import { mobileJson, mobileOptions, requireJson } from '@/auth/lib/mobile';
import { CatalogDocumentService } from '@/auth/services/catalog-document.service';
import { catalogMobileActor, catalogMobileError } from '../_utils';

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) { const actor = await catalogMobileActor(request); if (actor instanceof Response) return actor; try { const catalog = await new CatalogDocumentService().getManaged(actor, (await params).id); return catalog ? mobileJson(request, { success: true, catalog }) : mobileJson(request, { error: 'Catalog not found.' }, { status: 404 }); } catch (error) { return catalogMobileError(request, error); } }
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) { const actor = await catalogMobileActor(request); if (actor instanceof Response) return actor; if (!requireJson(request)) return mobileJson(request, { error: 'Content-Type must be application/json' }, { status: 415 }); try { return mobileJson(request, { success: true, catalog: await new CatalogDocumentService().updateMetadata(actor, (await params).id, await request.json()) }); } catch (error) { return catalogMobileError(request, error); } }
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) { const actor = await catalogMobileActor(request); if (actor instanceof Response) return actor; try { await new CatalogDocumentService().delete(actor, (await params).id); return mobileJson(request, { success: true }); } catch (error) { return catalogMobileError(request, error); } }
export function OPTIONS(request: NextRequest) { return mobileOptions(request); }
