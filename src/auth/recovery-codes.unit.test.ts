import { describe, it, expect, beforeAll, beforeEach, vi } from 'vitest';
import { ObjectId } from 'mongodb';
import type { RecoveryCodeDocument } from '@/types/auth';
import { hashToken } from '@/auth/crypto/token';

// ─── Shared in-memory stores (accessible to the vi.mock factories below). ──────
const stores = vi.hoisted(() => ({
  // In-memory recovery_codes collection keyed by codeHash.
  recoveryCodes: new Map<string, RecoveryCodeDocument>(),
  // In-memory verification_tokens collection keyed by tokenHash.
  verificationTokens: new Map<
    string,
    { _id: ObjectId; userId: ObjectId | null; type: string; tokenHash: string; used: boolean; expiresAt: Date }
  >(),
  // Audit trail of logged actions.
  audit: [] as string[],
  // 2FA failure count keyed by userId.
  failures: new Map<string, number>(),
}));

// Mock the DB collection accessors the repositories reach through `@/database`.
vi.mock('@/database', () => {
  const makeColl = (store: Map<string, unknown>) => ({
    async deleteMany(filter: { userId?: ObjectId }) {
      for (const [k, v] of store) {
        if (!filter.userId || (v as { userId: ObjectId }).userId.equals(filter.userId)) {
          store.delete(k);
        }
      }
      return { deletedCount: 1 };
    },
    async insertMany(docs: RecoveryCodeDocument[]) {
      for (const d of docs) store.set(d.codeHash, d);
      return { insertedCount: docs.length };
    },
    async updateOne(filter: Record<string, unknown>, update: Record<string, unknown>) {
      // Find a doc matching filter (used/codeHash/userId) for redeem.
      let matched = false;
      for (const v of store.values()) {
        const doc = v as RecoveryCodeDocument;
        const codeMatch = filter.codeHash ? doc.codeHash === filter.codeHash : true;
        const userMatch = filter.userId ? doc.userId.equals(filter.userId as ObjectId) : true;
        const usedMatch = 'used' in filter ? doc.used === filter.used : true;
        if (codeMatch && userMatch && usedMatch) {
          matched = true;
          Object.assign(doc, (update as { $set: Record<string, unknown> }).$set);
          break;
        }
      }
      return { matchedCount: matched ? 1 : 0, modifiedCount: matched ? 1 : 0 };
    },
    async countDocuments(filter: { userId?: ObjectId; used?: boolean }) {
      let n = 0;
      for (const v of store.values()) {
        const doc = v as RecoveryCodeDocument;
        if (filter.userId && !doc.userId.equals(filter.userId)) continue;
        if (typeof filter.used === 'boolean' && doc.used !== filter.used) continue;
        n++;
      }
      return n;
    },
    async findOne(filter: { userId?: ObjectId; used?: boolean }) {
      for (const v of store.values()) {
        const doc = v as RecoveryCodeDocument;
        if (filter.userId && !doc.userId.equals(filter.userId)) continue;
        if (typeof filter.used === 'boolean' && doc.used !== filter.used) continue;
        return doc;
      }
      return null;
    },
  });

  return {
    getDb: async () => ({}),
    getRecoveryCodesCollection: async () => makeColl(stores.recoveryCodes),
    getVerificationTokensCollection: async () => ({
      async insertOne(doc: unknown) {
        const d = doc as { tokenHash: string; userId: ObjectId | null; type: string; expiresAt: Date; used: boolean };
        stores.verificationTokens.set(d.tokenHash, { _id: new ObjectId(), ...d });
        return { insertedId: new ObjectId() };
      },
      async findOne(filter: { tokenHash?: string; used?: boolean }) {
        for (const v of stores.verificationTokens.values()) {
          if (filter.tokenHash && v.tokenHash !== filter.tokenHash) continue;
          if (typeof filter.used === 'boolean' && v.used !== filter.used) continue;
          return v;
        }
        return null;
      },
      async updateOne(filter: { tokenHash: string }, update: Record<string, unknown>) {
        const v = stores.verificationTokens.get(filter.tokenHash);
        if (!v) return { matchedCount: 0, modifiedCount: 0 };
        Object.assign(v, (update as { $set: Record<string, unknown> }).$set);
        return { matchedCount: 1, modifiedCount: 1 };
      },
      async updateMany() {
        return { modifiedCount: 0 };
      },
    }),
  };
});

// Mock the repos the TwoFactorService depends on (other than recovery-code).
vi.mock('@/auth/repositories/user.repository', () => ({
  UserRepository: class {
    async findById() {
      return null;
    }
    async findPrimaryEmail() {
      return null;
    }
  },
}));

vi.mock('@/auth/repositories/audit-log.repository', () => ({
  AuditLogRepository: class {
    async log(entry: { action: string }) {
      stores.audit.push(entry.action);
    }
  },
}));

vi.mock('@/auth/repositories/login-attempt.repository', () => ({
  LoginAttemptRepository: class {
    async record2FAAttempt() {}
    async countRecent2FAFailures(userId: ObjectId) {
      return stores.failures.get(userId.toString()) ?? 0;
    }
  },
}));

vi.mock('@/auth/services/mailer', () => ({
  sendMail: async () => {},
}));

vi.mock('@/auth/lib/request', () => ({
  getClientIp: async () => '127.0.0.1',
}));

vi.mock('next/headers', () => ({
  headers: async () => new Map([['user-agent', 'test-agent']]),
}));

// Import the units under test AFTER mocks are declared.
const { RecoveryCodeRepository } = await import('@/auth/repositories/recovery-code.repository');
const { TwoFactorService } = await import('@/auth/services/two-factor.service');

describe('RecoveryCodeRepository — generate / single-use / regenerate', () => {
  let userId: ObjectId;
  let repo: InstanceType<typeof RecoveryCodeRepository>;

  beforeAll(() => {
    process.env.MONGODB_URI = 'mongodb://localhost:27017/test';
    process.env.SESSION_SECRET = 'test-session-secret-at-least-thirty-two-chars!!';
    process.env.APP_URL = 'http://localhost:3000';
  });

  beforeEach(() => {
    stores.recoveryCodes.clear();
    stores.verificationTokens.clear();
    stores.audit.length = 0;
    stores.failures.clear();
    userId = new ObjectId();
    repo = new RecoveryCodeRepository();
  });

  it('generates N codes, returns raw codes once, stores ONLY hashes', async () => {
    const { rawCodes, count } = await repo.generate(userId);

    expect(count).toBe(10);
    expect(rawCodes).toHaveLength(10);

    // Every stored doc must be a hash — never the plaintext.
    for (const v of stores.recoveryCodes.values()) {
      const doc = v as RecoveryCodeDocument;
      expect(doc.codeHash).toMatch(/^[a-f0-9]{64}$/);
      expect(rawCodes).not.toContain(doc.codeHash);
      // And the hash must actually correspond to a raw code.
      const match = rawCodes.some((r: string) => hashToken(r) === doc.codeHash);
      expect(match).toBe(true);
      expect(doc.used).toBe(false);
    }

    // No plaintext code is stored anywhere in the map.
    for (const raw of rawCodes) {
      expect(stores.recoveryCodes.has(raw)).toBe(false);
    }
  });

  it('a recovery code satisfies verification and is single-use (redeemed on use)', async () => {
    const { rawCodes } = await repo.generate(userId);
    const firstCode = rawCodes[0];

    // Redeem succeeds the first time.
    const ok1 = await repo.redeem(firstCode, userId);
    expect(ok1).toBe(true);

    // The same code cannot be used again (now marked used).
    const ok2 = await repo.redeem(firstCode, userId);
    expect(ok2).toBe(false);

    // A wrong code for this user fails.
    const okWrong = await repo.redeem('deadbeef'.repeat(8), userId);
    expect(okWrong).toBe(false);

    // Remaining count dropped by exactly one.
    expect(await repo.countRemaining(userId)).toBe(9);
  });

  it('regeneration invalidates prior codes', async () => {
    const { rawCodes: oldCodes } = await repo.generate(userId);
    expect(await repo.countRemaining(userId)).toBe(10);

    const { rawCodes: newCodes } = await repo.generate(userId);

    // None of the old codes work anymore.
    for (const old of oldCodes) {
      expect(await repo.redeem(old, userId)).toBe(false);
    }
    // All of the new codes do.
    for (const nw of newCodes) {
      expect(await repo.redeem(nw, userId)).toBe(true);
    }

    // Store still holds exactly the new set (old ones deleted → 10 total).
    expect(stores.recoveryCodes.size).toBe(10);
  });
});

describe('TwoFactorService.verify — accepts a recovery code as alt to email 2FA', () => {
  let userId: ObjectId;
  let service: InstanceType<typeof TwoFactorService>;

  beforeAll(() => {
    process.env.MONGODB_URI = 'mongodb://localhost:27017/test';
    process.env.SESSION_SECRET = 'test-session-secret-at-least-thirty-two-chars!!';
    process.env.APP_URL = 'http://localhost:3000';
  });

  beforeEach(() => {
    stores.recoveryCodes.clear();
    stores.verificationTokens.clear();
    stores.audit.length = 0;
    stores.failures.clear();
    userId = new ObjectId();
    service = new TwoFactorService();
  });

  it('rejects an unknown code for the user', async () => {
    const ok = await service.verify(userId, '000000');
    expect(ok).toBe(false);
    expect(stores.audit).toContain('auth.mfa.failed');
  });

  it('accepts an email 2FA code and audits auth.mfa.verified', async () => {
    // Seed a verification token the same way sendCode stores it (hash of code).
    const code = '123456';
    stores.verificationTokens.set(hashToken(code), {
      _id: new ObjectId(),
      userId,
      type: 'two_factor',
      tokenHash: hashToken(code),
      used: false,
      expiresAt: new Date(Date.now() + 5 * 60 * 1000),
    });

    const ok = await service.verify(userId, code);
    expect(ok).toBe(true);
    expect(stores.audit).toContain('auth.mfa.verified');
  });

  it('accepts a recovery code as an alternative and audits auth.mfa.recovery.used', async () => {
    const { rawCodes } = await new RecoveryCodeRepository().generate(userId);
    const recovery = rawCodes[0];

    const ok = await service.verify(userId, recovery);
    expect(ok).toBe(true);
    expect(stores.audit).toContain('auth.mfa.recovery.used');

    // And the recovery code is now consumed (single-use).
    expect(await new RecoveryCodeRepository().countRemaining(userId)).toBe(9);
  });

  it('does NOT accept another user’s recovery code', async () => {
    const other = new ObjectId();
    const { rawCodes } = await new RecoveryCodeRepository().generate(other);
    const recovery = rawCodes[0];

    const ok = await service.verify(userId, recovery);
    expect(ok).toBe(false);
  });
});
