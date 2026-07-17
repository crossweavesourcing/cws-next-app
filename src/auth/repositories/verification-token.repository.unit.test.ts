import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ObjectId } from 'mongodb';
import { hashToken } from '@/auth/crypto/token';

type VerificationTokenDoc = {
  _id: ObjectId;
  userId: ObjectId | null;
  type: string;
  tokenHash: string;
  payload: Record<string, unknown>;
  expiresAt: Date;
  used: boolean;
  usedAt: Date | null;
  createdAt: Date;
};

const store = vi.hoisted(() => ({
  tokens: new Map<string, VerificationTokenDoc>(),
}));

vi.mock('@/database', () => ({
  getVerificationTokensCollection: async () => ({
    async insertOne(doc: VerificationTokenDoc) {
      store.tokens.set(doc.tokenHash, doc);
      return { insertedId: doc._id };
    },
    async findOneAndUpdate(
      filter: { tokenHash: string; used: false; expiresAt: { $gt: Date } },
      update: { $set: { used: boolean; usedAt: Date } }
    ) {
      const doc = store.tokens.get(filter.tokenHash);
      if (!doc || doc.used || doc.expiresAt <= filter.expiresAt.$gt) {
        return null;
      }
      doc.used = update.$set.used;
      doc.usedAt = update.$set.usedAt;
      return doc;
    },
    async findOne(filter: { userId: ObjectId; type: string; used: false; expiresAt: { $gt: Date } }) {
      return (
        [...store.tokens.values()].find(
          (doc) =>
            doc.userId?.equals(filter.userId) &&
            doc.type === filter.type &&
            doc.used === false &&
            doc.expiresAt > filter.expiresAt.$gt
        ) ?? null
      );
    },
    async updateMany(filter: { userId: ObjectId; type: string; used: false }) {
      for (const doc of store.tokens.values()) {
        if (doc.userId?.equals(filter.userId) && doc.type === filter.type && doc.used === false) {
          doc.used = true;
          doc.usedAt = new Date();
        }
      }
      return { modifiedCount: 1 };
    },
  }),
}));

const { VerificationTokenRepository } = await import('./verification-token.repository');

describe('VerificationTokenRepository.redeem', () => {
  beforeEach(() => {
    store.tokens.clear();
  });

  it('redeems a token only once under parallel calls', async () => {
    const repo = new VerificationTokenRepository();
    const raw = 'reset-token';
    const userId = new ObjectId();
    store.tokens.set(hashToken(raw), {
      _id: new ObjectId(),
      userId,
      type: 'password_reset',
      tokenHash: hashToken(raw),
      payload: { email: 'admin@example.com' },
      expiresAt: new Date(Date.now() + 60_000),
      used: false,
      usedAt: null,
      createdAt: new Date(),
    });

    const [first, second] = await Promise.all([
      repo.redeem(hashToken(raw)),
      repo.redeem(hashToken(raw)),
    ]);

    expect([first, second].filter(Boolean)).toHaveLength(1);
    expect(first?.userId?.toString() ?? second?.userId?.toString()).toBe(userId.toString());
  });

  it('returns null for expired or already-used tokens', async () => {
    const repo = new VerificationTokenRepository();
    const expired = hashToken('expired');
    const used = hashToken('used');
    store.tokens.set(expired, {
      _id: new ObjectId(),
      userId: new ObjectId(),
      type: 'password_reset',
      tokenHash: expired,
      payload: {},
      expiresAt: new Date(Date.now() - 1),
      used: false,
      usedAt: null,
      createdAt: new Date(),
    });
    store.tokens.set(used, {
      _id: new ObjectId(),
      userId: new ObjectId(),
      type: 'two_factor',
      tokenHash: used,
      payload: {},
      expiresAt: new Date(Date.now() + 60_000),
      used: true,
      usedAt: new Date(),
      createdAt: new Date(),
    });

    await expect(repo.redeem(expired)).resolves.toBeNull();
    await expect(repo.redeem(used)).resolves.toBeNull();
  });
});
