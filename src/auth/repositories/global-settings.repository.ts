import { ObjectId } from 'mongodb';
import { getGlobalSettingsCollection } from '@/database/collections';
import type { GlobalSettingsDocument } from '@/types/seo';

export class GlobalSettingsRepository {
  async getSettings(): Promise<GlobalSettingsDocument> {
    const collection = await getGlobalSettingsCollection();
    let settings = await collection.findOne({});
    
    if (!settings) {
      const now = new Date();
      const doc: GlobalSettingsDocument = {
        _id: new ObjectId(),
        updatedAt: now,
        updatedBy: null,
      };
      await collection.insertOne(doc);
      settings = doc;
    }
    
    return settings;
  }

  async updateSettings(
    data: Partial<Omit<GlobalSettingsDocument, '_id' | 'updatedAt' | 'updatedBy'>>,
    userId: ObjectId
  ): Promise<GlobalSettingsDocument> {
    const collection = await getGlobalSettingsCollection();
    const settings = await this.getSettings();
    const now = new Date();
    
    await collection.updateOne(
      { _id: settings._id },
      { 
        $set: { 
          ...data,
          updatedAt: now,
          updatedBy: userId 
        } 
      }
    );
    
    return this.getSettings();
  }
}
