import { ObjectId, type Filter } from 'mongodb';
import { getCatalogDocumentsCollection } from '@/database';
import type { CatalogDocument } from '@/types/catalog';

export class CatalogDocumentRepository {
  async findById(id: string) { return ObjectId.isValid(id) ? (await getCatalogDocumentsCollection()).findOne({ _id: new ObjectId(id) }) : null; }
  async findBySlug(slug: string, publishedOnly = false) { return (await getCatalogDocumentsCollection()).findOne({ slug, ...(publishedOnly ? { status: 'published' as const } : {}) }); }
  async findAll(filter: { categoryId?: string; productId?: string; publishedOnly?: boolean } = {}) {
    const query: Filter<CatalogDocument> = {};
    if (filter.categoryId && ObjectId.isValid(filter.categoryId)) query.categoryId = new ObjectId(filter.categoryId);
    if (filter.productId && ObjectId.isValid(filter.productId)) query.productId = new ObjectId(filter.productId);
    if (filter.publishedOnly) query.status = 'published';
    return (await getCatalogDocumentsCollection()).find(query).sort({ updatedAt: -1 }).toArray();
  }
  async slugExists(slug: string, excludeId?: ObjectId) { return Boolean(await (await getCatalogDocumentsCollection()).findOne({ slug, ...(excludeId ? { _id: { $ne: excludeId } } : {}) }, { projection: { _id: 1 } })); }
  async create(document: CatalogDocument) { await (await getCatalogDocumentsCollection()).insertOne(document); return document; }
  async update(id: ObjectId, update: Partial<CatalogDocument>) { return (await getCatalogDocumentsCollection()).findOneAndUpdate({ _id: id }, { $set: update }, { returnDocument: 'after' }); }
  async delete(id: ObjectId) { return (await getCatalogDocumentsCollection()).findOneAndDelete({ _id: id }); }
  async findAssociated(kind: 'categoryId' | 'productId', id: ObjectId) { return (await getCatalogDocumentsCollection()).find({ [kind]: id }).toArray(); }
}
