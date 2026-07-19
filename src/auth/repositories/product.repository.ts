import { ObjectId } from 'mongodb';
import { getProductsCollection } from '@/database/collections';
import type { ProductDocument } from '@/types/catalog';

export class ProductRepository {
  async findAll(filter: Partial<ProductDocument> = {}): Promise<ProductDocument[]> {
    const products = await getProductsCollection();
    return products.find(filter).sort({ name: 1 }).toArray();
  }

  async findById(id: string | ObjectId): Promise<ProductDocument | null> {
    const products = await getProductsCollection();
    return products.findOne({ _id: new ObjectId(id) });
  }

  async findBySlug(slug: string): Promise<ProductDocument | null> {
    const products = await getProductsCollection();
    return products.findOne({ slug });
  }

  async findByCategoryId(categoryId: string | ObjectId): Promise<ProductDocument[]> {
    const products = await getProductsCollection();
    return products.find({ categoryId: new ObjectId(categoryId) }).sort({ name: 1 }).toArray();
  }

  async create(data: Omit<ProductDocument, '_id' | 'createdAt' | 'updatedAt'>): Promise<ProductDocument> {
    const products = await getProductsCollection();
    const now = new Date();
    const doc: ProductDocument = {
      ...data,
      categoryId: data.categoryId ? new ObjectId(data.categoryId) : null,
      _id: new ObjectId(),
      createdAt: now,
      updatedAt: now,
    };
    await products.insertOne(doc);
    return doc;
  }

  async update(id: string | ObjectId, data: Partial<Omit<ProductDocument, '_id' | 'createdAt' | 'updatedAt'>>): Promise<boolean> {
    const products = await getProductsCollection();
    
    // Ensure categoryId is an ObjectId if it's being updated
    const updateData = { ...data };
    if (updateData.categoryId !== undefined) {
      updateData.categoryId = updateData.categoryId ? new ObjectId(updateData.categoryId) : null;
    }
    
    const result = await products.updateOne(
      { _id: new ObjectId(id) },
      { $set: { ...updateData, updatedAt: new Date() } }
    );
    return result.matchedCount > 0;
  }

  async delete(id: string | ObjectId): Promise<boolean> {
    const products = await getProductsCollection();
    const result = await products.deleteOne({ _id: new ObjectId(id) });
    return result.deletedCount > 0;
  }
}
