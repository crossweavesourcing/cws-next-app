import { ObjectId } from 'mongodb';
import type { CmsPermission } from '@/types/auth';
import type { CatalogDocument } from '@/types/catalog';
import { CatalogDocumentRepository } from '@/auth/repositories/catalog-document.repository';
import { CategoryRepository } from '@/auth/repositories/category.repository';
import { ProductRepository } from '@/auth/repositories/product.repository';
import { AuditLogRepository } from '@/auth/repositories/audit-log.repository';
import { catalogMetadataSchema, catalogMetadataUpdateSchema, generateCatalogMarkdown, generateSemanticCatalogMarkdown, serializeCatalog, slugifyCatalog, validateCatalogPages, validateCatalogScene } from '@/lib/catalog-documents';
import { createCatalogUploadSignature, deleteCatalogAsset, inspectAndRenderCatalogPdf } from '@/lib/catalog-cloudinary';
import { CatalogOperationError } from '@/lib/catalog-errors';
import { SeoService } from './seo.service';

export type CatalogActor = { userId: ObjectId; sessionId: ObjectId | null; permissions: CmsPermission[]; source: 'web' | 'mobile'; operationId?: string };

export class CatalogValidationError extends Error { constructor(message: string) { super(message); this.name = 'CatalogValidationError'; } }
export class CatalogForbiddenError extends Error { constructor() { super('You do not have permission to manage this catalog.'); this.name = 'CatalogForbiddenError'; } }

export class CatalogDocumentService {
  private repo = new CatalogDocumentRepository();
  private categories = new CategoryRepository();
  private products = new ProductRepository();
  private audit = new AuditLogRepository();

  private async isPubliclyViewable(document: CatalogDocument) {
    try {
      validateCatalogPages(document.pages, document.asset.pages);
    } catch {
      return false;
    }

    const { category, product } = await this.validateAssociations(document.categoryId?.toString() ?? null, document.productId?.toString() ?? null);
    if (!category && !product) return false;
    if (category && !category.visible) return false;
    if (product && !product.visible) return false;
    return true;
  }

  private validateProcessedContent(document: CatalogDocument) {
    validateCatalogPages(document.pages, document.asset.pages);
    if (document.sceneVersion === 1 && document.scene) {
      validateCatalogScene(document.scene, document.asset.pages);
      if (generateSemanticCatalogMarkdown(document.scene) !== document.markdown) throw new CatalogValidationError('Catalog content failed validation.');
      return;
    }
    if (generateCatalogMarkdown(document.pages) !== document.markdown) throw new CatalogValidationError('Catalog content failed validation.');
  }

  private requireAssociations(actor: CatalogActor, categoryId: string | null, productId: string | null) {
    if (categoryId && !actor.permissions.includes('categories')) throw new CatalogForbiddenError();
    if (productId && !actor.permissions.includes('products')) throw new CatalogForbiddenError();
    if (!categoryId && !productId) throw new CatalogValidationError('A catalog must belong to a category, a product, or both.');
  }

  private async validateAssociations(categoryId: string | null, productId: string | null) {
    const [category, product] = await Promise.all([categoryId ? this.categories.findById(categoryId) : null, productId ? this.products.findById(productId) : null]);
    if (categoryId && !category) throw new CatalogOperationError('ASSOCIATION_NOT_FOUND', 'The selected category no longer exists.');
    if (productId && !product) throw new CatalogOperationError('ASSOCIATION_NOT_FOUND', 'The selected product no longer exists.');
    return { category, product };
  }

  private async uniqueSlug(title: string, excludeId?: ObjectId) {
    const base = slugifyCatalog(title);
    let slug = base;
    for (let suffix = 2; await this.repo.slugExists(slug, excludeId); suffix += 1) slug = `${base}-${suffix}`;
    return slug;
  }

  private async writeAudit(actor: CatalogActor, action: string, catalogId: ObjectId, metadata: Record<string, unknown> | null = null) {
    await this.audit.log({ userId: actor.userId, sessionId: actor.sessionId, action, status: 'SUCCESS', errorCode: null, actor: { type: 'admin', id: actor.userId }, source: { platform: actor.source === 'web' ? 'web' : 'mobile', appVersion: null }, correlationId: null, requestId: null, resource: { type: 'catalog_document', id: catalogId.toString() }, metadata, ipAddress: null, userAgent: null });
  }

  async initializeUpload(actor: CatalogActor, input: unknown) {
    console.info(JSON.stringify({ level: 'info', event: 'catalog.operation.stage', stage: 'metadata.validate', referenceId: actor.operationId ?? null }));
    const parsed = catalogMetadataSchema.parse(input);
    this.requireAssociations(actor, parsed.categoryId, parsed.productId);
    console.info(JSON.stringify({ level: 'info', event: 'catalog.operation.stage', stage: 'associations.validate', referenceId: actor.operationId ?? null }));
    await this.validateAssociations(parsed.categoryId, parsed.productId);
    console.info(JSON.stringify({ level: 'info', event: 'catalog.operation.stage', stage: 'upload.sign', referenceId: actor.operationId ?? null }));
    return createCatalogUploadSignature(actor.userId.toString());
  }

  async finalizeCreate(actor: CatalogActor, input: unknown, publicId: string) {
    console.info(JSON.stringify({ level: 'info', event: 'catalog.operation.stage', stage: 'pdf.inspect', referenceId: actor.operationId ?? null }));
    const parsed = catalogMetadataSchema.parse(input);
    this.requireAssociations(actor, parsed.categoryId, parsed.productId);
    await this.validateAssociations(parsed.categoryId, parsed.productId);
    let processed: Awaited<ReturnType<typeof inspectAndRenderCatalogPdf>> | null = null;
    try {
      processed = await inspectAndRenderCatalogPdf(publicId, actor.userId.toString());
      validateCatalogPages(processed.pages, processed.asset.pages);
      console.info(JSON.stringify({ level: 'info', event: 'catalog.operation.stage', stage: 'database.insert', referenceId: actor.operationId ?? null, pageCount: processed.pages.length }));
      const now = new Date();
      const document: CatalogDocument = { _id: new ObjectId(), categoryId: parsed.categoryId ? new ObjectId(parsed.categoryId) : null, productId: parsed.productId ? new ObjectId(parsed.productId) : null, title: parsed.title, slug: await this.uniqueSlug(parsed.title), description: parsed.description, status: 'draft', asset: processed.asset, pages: processed.pages, markdown: processed.markdown, sceneVersion: processed.scene.version, scene: processed.scene, processingError: null, publishedAt: null, createdBy: actor.userId, updatedBy: actor.userId, createdAt: now, updatedAt: now, seoOverrides: parsed.seoOverrides };
      await this.repo.create(document);
      await this.writeAudit(actor, 'catalog.create', document._id, { categoryId: parsed.categoryId, productId: parsed.productId, pageCount: document.pages.length });
      return serializeCatalog(document);
    } catch (error) {
      await deleteCatalogAsset(publicId).catch((cleanupError) => console.error('Catalog provisional asset cleanup failed', cleanupError));
      throw error;
    }
  }

  async list(actor: CatalogActor, filter: { categoryId?: string; productId?: string } = {}) {
    if (filter.categoryId) this.requireAssociations(actor, filter.categoryId, null);
    if (filter.productId) this.requireAssociations(actor, null, filter.productId);
    return Promise.all((await this.repo.findAll(filter)).filter((doc) => (!doc.categoryId || actor.permissions.includes('categories')) && (!doc.productId || actor.permissions.includes('products'))).map(async (doc) => serializeCatalog(doc)));
  }

  async getManaged(actor: CatalogActor, id: string) {
    const document = await this.repo.findById(id);
    if (!document) return null;
    this.requireAssociations(actor, document.categoryId?.toString() ?? null, document.productId?.toString() ?? null);
    return serializeCatalog(document);
  }

  async updateMetadata(actor: CatalogActor, id: string, input: unknown) {
    const document = await this.repo.findById(id); if (!document) throw new CatalogValidationError('Catalog not found.');
    this.requireAssociations(actor, document.categoryId?.toString() ?? null, document.productId?.toString() ?? null);
    const parsed = catalogMetadataUpdateSchema.parse(input);
    const nextSlug = parsed.slug ?? (parsed.title === document.title ? document.slug : await this.uniqueSlug(parsed.title, document._id));
    const updated = await this.repo.update(document._id, { ...parsed, slug: nextSlug, updatedBy: actor.userId, updatedAt: new Date(), processingError: null });
    if (!updated) throw new CatalogValidationError('Catalog not found.');
    if (nextSlug !== document.slug) {
      await new SeoService().createRedirect({
        source: `/catalogs/${document.slug}`,
        destination: `/catalogs/${nextSlug}`,
        statusCode: 301,
        active: true,
        reason: 'Automatic catalog slug change',
      }, actor.userId).catch((error) => {
        console.warn(JSON.stringify({ level: 'warn', event: 'catalog.slug_redirect.skipped', catalogId: id, errorName: error instanceof Error ? error.name : 'UnknownError' }));
      });
    }
    await this.writeAudit(actor, 'catalog.metadata.updated', document._id, { seoFieldsUpdated: Boolean(parsed.seoOverrides), slugChanged: nextSlug !== document.slug });
    return serializeCatalog(updated);
  }

  async updateAssociations(actor: CatalogActor, id: string, input: { categoryId: string | null; productId: string | null }) {
    const document = await this.repo.findById(id); if (!document) throw new CatalogValidationError('Catalog not found.');
    this.requireAssociations(actor, document.categoryId?.toString() ?? null, document.productId?.toString() ?? null);
    this.requireAssociations(actor, input.categoryId, input.productId);
    await this.validateAssociations(input.categoryId, input.productId);
    const updated = await this.repo.update(document._id, { categoryId: input.categoryId ? new ObjectId(input.categoryId) : null, productId: input.productId ? new ObjectId(input.productId) : null, status: 'draft', publishedAt: null, updatedBy: actor.userId, updatedAt: new Date() });
    if (!updated) throw new CatalogValidationError('Catalog not found.');
    await this.writeAudit(actor, 'catalog.associations.updated', document._id, input);
    return serializeCatalog(updated);
  }

  async setPublished(actor: CatalogActor, id: string, published: boolean) {
    const document = await this.repo.findById(id, true); if (!document) throw new CatalogValidationError('Catalog not found.');
    this.requireAssociations(actor, document.categoryId?.toString() ?? null, document.productId?.toString() ?? null);
    if (published) {
      this.validateProcessedContent(document);
      const { category, product } = await this.validateAssociations(document.categoryId?.toString() ?? null, document.productId?.toString() ?? null);
      if ((!category && !product) || (category && !category.visible) || (product && !product.visible)) throw new CatalogValidationError('Catalog associations must be live before publishing.');
    }
    const updated = await this.repo.update(document._id, { status: published ? 'published' : 'draft', publishedAt: published ? new Date() : null, updatedBy: actor.userId, updatedAt: new Date() });
    if (!updated) throw new CatalogValidationError('Catalog not found.');
    await this.writeAudit(actor, published ? 'catalog.published' : 'catalog.unpublished', document._id);
    return serializeCatalog(updated);
  }

  async replacePdf(actor: CatalogActor, id: string, publicId: string) {
    const document = await this.repo.findById(id); if (!document) throw new CatalogValidationError('Catalog not found.');
    this.requireAssociations(actor, document.categoryId?.toString() ?? null, document.productId?.toString() ?? null);
    try {
      const processed = await inspectAndRenderCatalogPdf(publicId, actor.userId.toString()); validateCatalogPages(processed.pages, processed.asset.pages);
      const updated = await this.repo.update(document._id, { asset: processed.asset, pages: processed.pages, markdown: processed.markdown, sceneVersion: processed.scene.version, scene: processed.scene, status: 'draft', publishedAt: null, processingError: null, updatedBy: actor.userId, updatedAt: new Date() });
      if (!updated) throw new CatalogValidationError('Catalog not found.');
      await deleteCatalogAsset(document.asset.publicId).catch((error) => console.error('Catalog replaced asset cleanup failed', error));
      await this.writeAudit(actor, 'catalog.replaced', document._id, { pageCount: processed.pages.length });
      return serializeCatalog(updated);
    } catch (error) {
      await deleteCatalogAsset(publicId).catch(() => {});
      await this.repo.update(document._id, { processingError: 'The replacement PDF could not be processed.', updatedAt: new Date() });
      throw error;
    }
  }

  async delete(actor: CatalogActor, id: string) {
    const document = await this.repo.findById(id); if (!document) throw new CatalogValidationError('Catalog not found.');
    this.requireAssociations(actor, document.categoryId?.toString() ?? null, document.productId?.toString() ?? null);
    await this.repo.delete(document._id); await deleteCatalogAsset(document.asset.publicId).catch((error) => console.error('Catalog delete asset cleanup failed', error));
    await this.writeAudit(actor, 'catalog.deleted', document._id); return true;
  }

  async getPublicBySlug(slug: string) {
    const doc = await this.repo.findBySlug(slug);
    if (!doc) return null;
    return await this.isPubliclyViewable(doc) ? serializeCatalog(doc) : null;
  }

  async listPublicByProduct(productId: string) {
    const documents = await this.repo.findAll({ productId });
    const visible: ReturnType<typeof serializeCatalog>[] = [];
    for (const document of documents) {
      if (await this.isPubliclyViewable(document)) visible.push(serializeCatalog(document));
    }
    return visible;
  }

  async handleAssociationDeletion(kind: 'categoryId' | 'productId', id: string) {
    if (!ObjectId.isValid(id)) return;
    const documents = await this.repo.findAssociated(kind, new ObjectId(id));
    for (const document of documents) {
      const other = kind === 'categoryId' ? document.productId : document.categoryId;
      if (other) await this.repo.update(document._id, { [kind]: null, status: 'draft', publishedAt: null, updatedAt: new Date() });
      else { await this.repo.delete(document._id); await deleteCatalogAsset(document.asset.publicId).catch((error) => console.error('Catalog association cleanup failed', error)); }
    }
  }
}
