'use server';

import { revalidatePath } from 'next/cache';
import { requireActiveSession, getEffectivePermissions } from '@/auth/dal';
import { withCsrfGuard } from '@/auth/lib/csrf';
import { CatalogDocumentService } from '@/auth/services/catalog-document.service';
import { CategoryRepository } from '@/auth/repositories/category.repository';
import { ProductRepository } from '@/auth/repositories/product.repository';
import { randomUUID } from 'crypto';
import { classifyCatalogError, toCatalogActionFailure, type CatalogActionFailure } from '@/lib/catalog-errors';

async function webActor(referenceId: string) {
  console.info(JSON.stringify({ level: 'info', event: 'catalog.operation.stage', stage: 'actor.start', referenceId }));
  const session = await requireActiveSession();
  const effective = await getEffectivePermissions(session.userId);
  console.info(JSON.stringify({ level: 'info', event: 'catalog.operation.stage', stage: 'actor.complete', referenceId, userId: session.userId.toString() }));
  return { userId: session.userId, sessionId: session._id, permissions: effective.permissions, source: 'web' as const, operationId: referenceId };
}

function safeFailure(error: unknown, stage: string, referenceId: string): CatalogActionFailure {
  const classified = classifyCatalogError(error);
  console.error(JSON.stringify({
    level: 'error', event: 'catalog.operation.failed', stage, referenceId, code: classified.code,
    errorName: error instanceof Error ? error.name : 'UnknownError',
    errorMessage: error instanceof Error ? error.message : 'Unknown catalog error',
  }));
  return toCatalogActionFailure(error, referenceId);
}

function revalidateCatalogPaths(catalog?: { slug: string; categoryId: string | null; productId: string | null }) {
  revalidatePath('/dashboard/categories'); revalidatePath('/dashboard/products');
  if (catalog) { revalidatePath(`/catalogs/${catalog.slug}`); if (catalog.productId) revalidatePath(`/products`, 'layout'); }
}

async function _initializeCatalogUpload(input: unknown) {
  const referenceId = randomUUID();
  try {
    const actor = await webActor(referenceId);
    console.info(JSON.stringify({ level: 'info', event: 'catalog.operation.stage', stage: 'upload.initialize', referenceId }));
    return { success: true as const, error: undefined, upload: await new CatalogDocumentService().initializeUpload(actor, input) };
  } catch (error) { return safeFailure(error, 'upload.initialize', referenceId); }
}
export const initializeCatalogUploadAction = withCsrfGuard(_initializeCatalogUpload);

async function _finalizeCatalogCreate(input: unknown, publicId: string) {
  const referenceId = randomUUID();
  try {
    const actor = await webActor(referenceId);
    // Phase 1: fast insert with status 'processing' — returns in < 2s
    const catalog = await new CatalogDocumentService().finalizeCreate(actor, input, publicId);
    // Phase 2: fire the Netlify Background Function, fire-and-forget.
    // Background Functions have a 15-minute timeout — unlike Next.js API routes
    // which are Netlify Functions with a 10s limit.
    // URL: /.netlify/functions/catalog-process-background
    // The client polls /api/catalog/status/[jobId] every 2s for completion.
    const appUrl = process.env.APP_URL ?? ''; // security-scan-ignore
    const secret = process.env.CATALOG_PROCESS_SECRET ?? ''; // security-scan-ignore
    if (appUrl && secret) {
      // We MUST await the fetch here so Next.js does not destroy the Server Action execution context
      // before the fetch begins (which causes an out-of-band 500 error / Dynamic Server Error).
      // The background function returns 202 Accepted immediately (<50ms).
      await fetch(`${appUrl}/.netlify/functions/catalog-process-background`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-catalog-secret': secret },
        body: JSON.stringify({ catalogId: catalog._id, publicId, actorUserId: actor.userId.toString() }),
      }).catch((err: unknown) => {
        console.error(JSON.stringify({ level: 'error', event: 'catalog.process.trigger.failed', catalogId: catalog._id, errorMessage: err instanceof Error ? err.message : 'Unknown' }));
      });
    } else {
      console.warn(JSON.stringify({ level: 'warn', event: 'catalog.process.trigger.skipped', reason: 'APP_URL or CATALOG_PROCESS_SECRET not set' }));
    }
    revalidateCatalogPaths(catalog);
    return { success: true as const, error: undefined, catalog, jobId: catalog._id };
  } catch (error) { return safeFailure(error, 'create.finalize', referenceId); }
}
export const finalizeCatalogCreateAction = withCsrfGuard(_finalizeCatalogCreate);

export async function listCatalogsAction(filter: { categoryId?: string; productId?: string }) {
  const referenceId = randomUUID();
  try { return { success: true as const, catalogs: await new CatalogDocumentService().list(await webActor(referenceId), filter) }; }
  catch (error) { return { ...safeFailure(error, 'catalog.list', referenceId), catalogs: [] }; }
}

export async function getCatalogOptionsAction() {
  const referenceId = randomUUID();
  try {
    const actor = await webActor(referenceId);
    const [categories, products] = await Promise.all([actor.permissions.includes('categories') ? new CategoryRepository().findAll() : [], actor.permissions.includes('products') ? new ProductRepository().findAll() : []]);
    return { success: true as const, categories: categories.map((item) => ({ id: item._id.toString(), name: item.name })), products: products.map((item) => ({ id: item._id.toString(), name: item.name })) };
  } catch (error) { return { ...safeFailure(error, 'catalog.options', referenceId), categories: [], products: [] }; }
}

async function _setCatalogPublished(id: string, published: boolean) { const referenceId = randomUUID(); try { const catalog = await new CatalogDocumentService().setPublished(await webActor(referenceId), id, published); revalidateCatalogPaths(catalog); return { success: true as const, error: undefined, catalog }; } catch (error) { return safeFailure(error, 'publication.update', referenceId); } }
export const setCatalogPublishedAction = withCsrfGuard(_setCatalogPublished);

async function _deleteCatalog(id: string) { const referenceId = randomUUID(); try { await new CatalogDocumentService().delete(await webActor(referenceId), id); revalidateCatalogPaths(); return { success: true as const, error: undefined }; } catch (error) { return safeFailure(error, 'catalog.delete', referenceId); } }
export const deleteCatalogAction = withCsrfGuard(_deleteCatalog);

async function _updateCatalogMetadata(id: string, input: unknown) { const referenceId = randomUUID(); try { const catalog = await new CatalogDocumentService().updateMetadata(await webActor(referenceId), id, input); revalidateCatalogPaths(catalog); return { success: true as const, error: undefined, catalog }; } catch (error) { return safeFailure(error, 'metadata.update', referenceId); } }
export const updateCatalogMetadataAction = withCsrfGuard(_updateCatalogMetadata);

async function _updateCatalogAssociations(id: string, input: { categoryId: string | null; productId: string | null }) { const referenceId = randomUUID(); try { const catalog = await new CatalogDocumentService().updateAssociations(await webActor(referenceId), id, input); revalidateCatalogPaths(catalog); return { success: true as const, error: undefined, catalog }; } catch (error) { return safeFailure(error, 'associations.update', referenceId); } }
export const updateCatalogAssociationsAction = withCsrfGuard(_updateCatalogAssociations);

async function _replaceCatalogPdf(id: string, publicId: string) {
  const referenceId = randomUUID();
  try {
    const actor = await webActor(referenceId);
    const catalog = await new CatalogDocumentService().replacePdf(actor, id, publicId);
    const appUrl = process.env.APP_URL ?? ''; // security-scan-ignore
    const secret = process.env.CATALOG_PROCESS_SECRET ?? ''; // security-scan-ignore
    if (appUrl && secret) {
      // Must be awaited to prevent Next.js from destroying the context too early,
      // which causes a Dynamic Server Error / 500 when fetch reads tracing headers.
      await fetch(`${appUrl}/api/catalog/process`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-catalog-secret': secret },
        body: JSON.stringify({ catalogId: catalog._id, publicId, actorUserId: actor.userId.toString() }),
      }).catch((err: unknown) => {
        console.error(JSON.stringify({ level: 'error', event: 'catalog.process.replace.trigger.failed', catalogId: catalog._id, errorMessage: err instanceof Error ? err.message : 'Unknown' }));
      });
    } else {
      console.warn(JSON.stringify({ level: 'warn', event: 'catalog.process.replace.trigger.skipped', reason: 'APP_URL or CATALOG_PROCESS_SECRET not set' }));
    }
    revalidateCatalogPaths(catalog);
    return { success: true as const, error: undefined, catalog, jobId: catalog._id };
  } catch (error) {
    return safeFailure(error, 'pdf.replace', referenceId);
  }
}
export const replaceCatalogPdfAction = withCsrfGuard(_replaceCatalogPdf);
