import type { Db, IndexDescription } from 'mongodb';

export const PENDING_AUTHENTICATIONS_COLLECTION = 'pending_authentications';

export const pendingAuthenticationsIndexes: IndexDescription[] = [
  { key: { tokenHash: 1 }, unique: true, name: 'idx_pending_authentications_tokenHash' },
  { key: { userId: 1 }, name: 'idx_pending_authentications_userId' },
  { key: { expiresAt: 1 }, expireAfterSeconds: 0, name: 'idx_pending_authentications_expiresAt' },
];

export async function createPendingAuthenticationsIndexes(db: Db): Promise<void> {
  const collection = db.collection(PENDING_AUTHENTICATIONS_COLLECTION);
  await collection.createIndexes(pendingAuthenticationsIndexes);
}
