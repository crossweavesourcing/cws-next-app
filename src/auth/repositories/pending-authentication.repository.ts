import { ObjectId } from 'mongodb';
import { getDb } from '@/database';

export interface PendingAuthenticationDocument {
  _id: ObjectId;
  userId: ObjectId;
  deviceObjectId: ObjectId | null;
  primaryAuthenticationMethod: 'password' | 'google' | 'passkey';
  requiredAction: 'require_2fa' | 'require_strong_2fa';
  riskLevel: 'low' | 'medium' | 'high' | 'critical' | null;
  riskScore: number | null;
  riskReasonCodes: string[] | null;
  tokenHash: string;
  attemptsRemaining: number;
  createdAt: Date;
  expiresAt: Date;
  consumedAt: Date | null;
}

export class PendingAuthenticationRepository {
  private async getCollection() {
    const db = await getDb();
    return db.collection<PendingAuthenticationDocument>('pending_authentications');
  }

  async create(record: Omit<PendingAuthenticationDocument, '_id'>): Promise<PendingAuthenticationDocument> {
    const coll = await this.getCollection();
    const doc: PendingAuthenticationDocument = {
      _id: new ObjectId(),
      ...record,
    };
    await coll.insertOne(doc);
    return doc;
  }

  async findByTokenHash(tokenHash: string): Promise<PendingAuthenticationDocument | null> {
    const coll = await this.getCollection();
    return coll.findOne({ tokenHash });
  }

  async decrementAttempts(id: ObjectId): Promise<number> {
    const coll = await this.getCollection();
    const result = await coll.findOneAndUpdate(
      { _id: id, attemptsRemaining: { $gt: 0 } },
      { $inc: { attemptsRemaining: -1 } },
      { returnDocument: 'after' }
    );
    return result?.attemptsRemaining ?? 0;
  }

  async consume(id: ObjectId): Promise<boolean> {
    const coll = await this.getCollection();
    const result = await coll.updateOne(
      { _id: id, consumedAt: null },
      { $set: { consumedAt: new Date() } }
    );
    return result.modifiedCount > 0;
  }
}
