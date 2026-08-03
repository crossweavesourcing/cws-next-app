import { ObjectId } from 'mongodb';
import { getRedirectsCollection } from '@/database/collections';
import type { RedirectDocument } from '@/types/seo';

export class RedirectRepository {
  async findAll(): Promise<RedirectDocument[]> {
    const collection = await getRedirectsCollection();
    return collection.find({}).sort({ createdAt: -1 }).toArray();
  }

  async findActiveBySource(source: string): Promise<RedirectDocument | null> {
    const collection = await getRedirectsCollection();
    return collection.findOne({ source, active: true });
  }

  async findBySource(source: string): Promise<RedirectDocument | null> {
    const collection = await getRedirectsCollection();
    return collection.findOne({ source });
  }

  async findById(id: string | ObjectId): Promise<RedirectDocument | null> {
    const collection = await getRedirectsCollection();
    return collection.findOne({ _id: new ObjectId(id) });
  }

  async create(
    data: Omit<RedirectDocument, '_id' | 'createdAt' | 'updatedAt' | 'createdBy' | 'updatedBy'>,
    userId: ObjectId
  ): Promise<RedirectDocument> {
    const collection = await getRedirectsCollection();
    const now = new Date();
    const doc: RedirectDocument = {
      ...data,
      _id: new ObjectId(),
      createdAt: now,
      createdBy: userId,
      updatedAt: now,
      updatedBy: userId,
    };
    await collection.insertOne(doc);
    return doc;
  }

  async update(
    id: string | ObjectId,
    data: Partial<Omit<RedirectDocument, '_id' | 'createdAt' | 'createdBy' | 'updatedAt' | 'updatedBy'>>,
    userId: ObjectId
  ): Promise<boolean> {
    const collection = await getRedirectsCollection();
    const result = await collection.updateOne(
      { _id: new ObjectId(id) },
      { $set: { ...data, updatedAt: new Date(), updatedBy: userId } }
    );
    return result.matchedCount > 0;
  }

  async delete(id: string | ObjectId): Promise<boolean> {
    const collection = await getRedirectsCollection();
    const result = await collection.deleteOne({ _id: new ObjectId(id) });
    return result.deletedCount > 0;
  }
}
