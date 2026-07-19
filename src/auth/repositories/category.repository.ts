import { ObjectId } from 'mongodb';
import { getCategoriesCollection } from '@/database/collections';
import type { CategoryDocument } from '@/types/catalog';

export class CategoryRepository {
  async findAll(filter: Partial<CategoryDocument> = {}): Promise<CategoryDocument[]> {
    const categories = await getCategoriesCollection();
    return categories.find(filter).sort({ name: 1 }).toArray();
  }

  async findById(id: string | ObjectId): Promise<CategoryDocument | null> {
    const categories = await getCategoriesCollection();
    return categories.findOne({ _id: new ObjectId(id) });
  }

  async findBySlug(slug: string): Promise<CategoryDocument | null> {
    const categories = await getCategoriesCollection();
    return categories.findOne({ slug });
  }

  async create(data: Omit<CategoryDocument, '_id' | 'createdAt' | 'updatedAt'>): Promise<CategoryDocument> {
    const categories = await getCategoriesCollection();
    const now = new Date();
    const doc: CategoryDocument = {
      ...data,
      _id: new ObjectId(),
      createdAt: now,
      updatedAt: now,
    };
    await categories.insertOne(doc);
    return doc;
  }

  async update(id: string | ObjectId, data: Partial<Omit<CategoryDocument, '_id' | 'createdAt' | 'updatedAt'>>): Promise<boolean> {
    const categories = await getCategoriesCollection();
    const result = await categories.updateOne(
      { _id: new ObjectId(id) },
      { $set: { ...data, updatedAt: new Date() } }
    );
    return result.matchedCount > 0;
  }

  async delete(id: string | ObjectId): Promise<boolean> {
    const categories = await getCategoriesCollection();
    const result = await categories.deleteOne({ _id: new ObjectId(id) });
    return result.deletedCount > 0;
  }
}
