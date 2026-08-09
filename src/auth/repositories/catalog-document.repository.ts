import { ObjectId, type Filter } from 'mongodb';
import { getCatalogDocumentsCollection } from '@/database';
import type { CatalogDocument } from '@/types/catalog';

export class CatalogDocumentRepository {
  async findById(id: string, includeScene = false) { return ObjectId.isValid(id) ? (await getCatalogDocumentsCollection()).findOne({ _id: new ObjectId(id) }, { projection: includeScene ? {} : { scene: 0, markdown: 0 } }) : null; }
  async findBySlug(slug: string, publishedOnly = false, includeScene = false) { return (await getCatalogDocumentsCollection()).findOne({ slug, ...(publishedOnly ? { status: 'published' as const } : {}) }, { projection: includeScene ? {} : { scene: 0, markdown: 0 } }); }
  async findAll(filter: { categoryId?: string; productId?: string; publishedOnly?: boolean; includeScene?: boolean } = {}) {
    const query: Filter<CatalogDocument> = {};
    if (filter.categoryId && ObjectId.isValid(filter.categoryId)) query.categoryId = new ObjectId(filter.categoryId);
    if (filter.productId && ObjectId.isValid(filter.productId)) query.productId = new ObjectId(filter.productId);
    if (filter.publishedOnly) query.status = 'published';
    return (await getCatalogDocumentsCollection()).find(query, { projection: filter.includeScene ? {} : { scene: 0, markdown: 0 } }).sort({ updatedAt: -1 }).toArray();
  }
  /** Lightweight status poll — returns only the fields needed for job-status responses. */
  async getStatus(id: string) {
    if (!ObjectId.isValid(id)) return null;
    return (await getCatalogDocumentsCollection()).findOne(
      { _id: new ObjectId(id) },
      { projection: { _id: 1, status: 1, processingError: 1 } },
    );
  }
  async slugExists(slug: string, excludeId?: ObjectId) { return Boolean(await (await getCatalogDocumentsCollection()).findOne({ slug, ...(excludeId ? { _id: { $ne: excludeId } } : {}) }, { projection: { _id: 1 } })); }
  async create(document: CatalogDocument) { await (await getCatalogDocumentsCollection()).insertOne(document); return document; }
  /** Updates the document and returns the updated record WITHOUT scene/markdown to avoid OOM. */
  async update(id: ObjectId, update: Partial<CatalogDocument>) {
    return (await getCatalogDocumentsCollection()).findOneAndUpdate(
      { _id: id },
      { $set: update },
      { returnDocument: 'after', projection: { scene: 0, markdown: 0 } },
    );
  }
  async delete(id: ObjectId) { return (await getCatalogDocumentsCollection()).findOneAndDelete({ _id: id }); }
  async findAssociated(kind: 'categoryId' | 'productId', id: ObjectId) { return (await getCatalogDocumentsCollection()).find({ [kind]: id }).toArray(); }
}

