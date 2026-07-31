import type { NextRequest } from 'next/server';
import { mobileJson, mobileOptions, requireJson } from '@/auth/lib/mobile';
import { CatalogDocumentService } from '@/auth/services/catalog-document.service';
import { catalogMobileActor, catalogMobileError } from '../../_utils';
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) { const actor = await catalogMobileActor(request); if (actor instanceof Response) return actor; if (!requireJson(request)) return mobileJson(request, { error: 'Content-Type must be application/json' }, { status: 415 }); try { const body = await request.json(); if (typeof body.published !== 'boolean') return mobileJson(request, { error: 'published must be a boolean.' }, { status: 400 }); return mobileJson(request, { success: true, catalog: await new CatalogDocumentService().setPublished(actor, (await params).id, body.published) }); } catch (error) { return catalogMobileError(request, error); } }
export function OPTIONS(request: NextRequest) { return mobileOptions(request); }
