import { ObjectId } from 'mongodb';
import { getDb } from '@/database/client';
import type { PageSeoDocument } from '@/types/seo';
import { PageSeoSchema } from '@/database/schemas/page-seo.schema';

export class PageSeoRepository {
  private async getCollection() {
    const db = await getDb();
    return db.collection<PageSeoDocument>('page_seo');
  }

  async findByPath(path: string): Promise<PageSeoDocument | null> {
    const collection = await this.getCollection();
    return collection.findOne({ path });
  }

  async findAll(): Promise<PageSeoDocument[]> {
    const collection = await this.getCollection();
    return collection.find({}).sort({ path: 1 }).toArray();
  }

  async save(data: Omit<PageSeoDocument, '_id' | 'createdAt' | 'updatedAt' | 'createdBy' | 'updatedBy'>, userId?: ObjectId): Promise<PageSeoDocument> {
    const collection = await this.getCollection();
    const existing = await this.findByPath(data.path);

    const now = new Date();
    
    if (existing) {
      const updateData = {
        ...data,
        updatedAt: now,
        updatedBy: userId ?? null,
      };
      
      const validated = PageSeoSchema.partial().parse(updateData);
      
      await collection.updateOne(
        { _id: existing._id },
        { $set: validated }
      );
      
      return this.findByPath(data.path) as Promise<PageSeoDocument>;
    }

    const insertData = {
      ...data,
      createdAt: now,
      createdBy: userId ?? null,
      updatedAt: now,
      updatedBy: userId ?? null,
    };
    
    const validated = PageSeoSchema.parse(insertData);
    
    const result = await collection.insertOne(validated as PageSeoDocument);
    const inserted = await collection.findOne({ _id: result.insertedId });
    return inserted!;
  }
  
  async deleteById(id: string): Promise<void> {
    const collection = await this.getCollection();
    await collection.deleteOne({ _id: new ObjectId(id) });
  }
}
