import { ObjectId } from 'mongodb';
import { getPasswordHistoryCollection } from '@/database';
import type { HashAlgorithm } from '@/types/auth';

/**
 * Stores past password hashes so users cannot reuse recent passwords.
 */
export class PasswordHistoryRepository {
  /**
   * Returns up to `limit` most-recent password hashes for a user (newest first).
   */
  async getRecent(userId: ObjectId, limit: number): Promise<Array<{ hash: string; algorithm: HashAlgorithm }>> {
    const coll = await getPasswordHistoryCollection();
    const docs = await coll
      .find({ userId }, { projection: { hash: 1, algorithm: 1, _id: 0 } })
      .sort({ createdAt: -1 })
      .limit(limit)
      .toArray();
    return docs as Array<{ hash: string; algorithm: HashAlgorithm }>;
  }

  /**
   * Records a new password hash in the history (capped to `maxEntries`).
   */
  async record(userId: ObjectId, hash: string, algorithm: HashAlgorithm, maxEntries: number): Promise<void> {
    const coll = await getPasswordHistoryCollection();
    await coll.insertOne({ _id: new ObjectId(), userId, hash, algorithm, createdAt: new Date() });

    // Trim history beyond the policy limit (keep most-recent `maxEntries`).
    if (maxEntries > 0) {
      const overflow = await coll
        .find<{ _id: ObjectId }>({ userId }, { projection: { _id: 1 }, sort: { createdAt: -1 } })
        .skip(maxEntries)
        .toArray();
      if (overflow.length > 0) {
        await coll.deleteMany({ _id: { $in: overflow.map((d) => d._id) } });
      }
    }
  }

  /**
   * Removes all history for a user (e.g. after a forced admin reset).
   */
  async clear(userId: ObjectId): Promise<void> {
    const coll = await getPasswordHistoryCollection();
    await coll.deleteMany({ userId });
  }
}
