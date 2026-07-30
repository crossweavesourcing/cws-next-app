import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ObjectId } from 'mongodb';
import type { WebAuthnChallengeDocument } from '@/types/auth';

const store = vi.hoisted(() => ({
  docs: [] as WebAuthnChallengeDocument[],
}));

function matchesValue(actual: unknown, expected: unknown): boolean {
  if (expected instanceof ObjectId && actual instanceof ObjectId) return actual.equals(expected);
  if (expected && typeof expected === 'object' && '$gt' in expected) {
    return actual instanceof Date && actual > (expected as { $gt: Date }).$gt;
  }
  return Object.is(actual, expected);
}

function matches(doc: WebAuthnChallengeDocument, filter: Record<string, unknown>): boolean {
  for (const [key, expected] of Object.entries(filter)) {
    if (key === '$expr') {
      if (!(doc.attempts < doc.maxAttempts)) return false;
      continue;
    }
    if (!matchesValue((doc as unknown as Record<string, unknown>)[key], expected)) return false;
  }
  return true;
}

vi.mock('@/database', () => ({
  getWebAuthnChallengesCollection: async () => ({
    insertOne: async (doc: WebAuthnChallengeDocument) => {
      store.docs.push(doc);
    },
    findOneAndUpdate: async (
      filter: Record<string, unknown>,
      update: { $set?: Partial<WebAuthnChallengeDocument>; $inc?: { attempts?: number } }
    ) => {
      const doc = store.docs.find((candidate) => matches(candidate, filter));
      if (!doc) return null;
      const before = { ...doc };
      if (update.$inc?.attempts) doc.attempts += update.$inc.attempts;
      if (update.$set) Object.assign(doc, update.$set);
      return before;
    },
    updateOne: async () => ({ modifiedCount: 0 }),
  }),
}));

const { WebAuthnChallengeRepository } = await import('./webauthn-challenge.repository');

describe('WebAuthnChallengeRepository', () => {
  beforeEach(() => {
    store.docs = [];
  });

  it('creates a challenge and consumes it only once', async () => {
    const repo = new WebAuthnChallengeRepository();
    const userId = new ObjectId();
    const deviceObjectId = new ObjectId();
    await repo.create({
      challenge: 'challenge-1',
      purpose: 'registration',
      userId,
      deviceObjectId,
      platform: 'web',
    });

    await expect(repo.consume({ challenge: 'challenge-1', purpose: 'registration', userId })).resolves.toMatchObject({
      challenge: 'challenge-1',
      purpose: 'registration',
      deviceObjectId,
    });
    await expect(repo.consume({ challenge: 'challenge-1', purpose: 'registration', userId })).resolves.toBeNull();
  });

  it('does not consume a challenge for the wrong purpose', async () => {
    const repo = new WebAuthnChallengeRepository();
    await repo.create({
      challenge: 'challenge-2',
      purpose: 'passwordless_login',
      userId: null,
      platform: 'web',
    });

    await expect(repo.consume({ challenge: 'challenge-2', purpose: 'mfa', userId: null })).resolves.toBeNull();
  });

  it('does not consume an expired challenge', async () => {
    const repo = new WebAuthnChallengeRepository();
    await repo.create({
      challenge: 'challenge-3',
      purpose: 'mfa',
      userId: new ObjectId(),
      platform: 'web',
      ttlMs: -1000,
    });

    await expect(repo.consume({ challenge: 'challenge-3', purpose: 'mfa' })).resolves.toBeNull();
  });
});
