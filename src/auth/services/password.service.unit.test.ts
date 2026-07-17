import { describe, it, expect, beforeAll, beforeEach, vi } from 'vitest';
import { ObjectId } from 'mongodb';

// ─── Shared in-memory stores (accessible to the vi.mock factories below). ──────
const stores = vi.hoisted(() => ({
  // users collection keyed by _id.toString()
  users: new Map<string, any>(),
  // password_history entries
  history: [] as Array<{ _id: ObjectId; userId: ObjectId; hash: string; algorithm: string; createdAt: Date }>,
  // active password policy (null → repo returns the DEFAULT_PASSWORD_POLICY)
  policy: null as any,
  // password_policies seed presence
  policySeeded: false as boolean,
  audit: [] as string[],
}));

// Apply a Mongo-style $set (supports dotted paths like 'security.forcePasswordChange').
function applySet(target: any, set: Record<string, unknown>): void {
  for (const [key, value] of Object.entries(set)) {
    if (key.includes('.')) {
      const parts = key.split('.');
      let node = target;
      for (let i = 0; i < parts.length - 1; i++) {
        const part = parts[i];
        if (typeof node[part] !== 'object' || node[part] === null) node[part] = {};
        node = node[part];
      }
      node[parts[parts.length - 1]] = value;
    } else {
      target[key] = value;
    }
  }
}

// Mock the database layer with in-memory collections.
vi.mock('@/database', () => ({
  getUsersCollection: async () => ({
    async findOne(filter: { _id: ObjectId }) {
      return stores.users.get(filter._id.toString()) ?? null;
    },
    async updateOne(filter: { _id: ObjectId }, update: { $set: Record<string, unknown> }) {
      const user = stores.users.get(filter._id.toString());
      if (!user) return { matchedCount: 0, modifiedCount: 0 };
      applySet(user, update.$set);
      return { matchedCount: 1, modifiedCount: 1 };
    },
  }),
  getPasswordHistoryCollection: async () => ({
    async insertOne(doc: any) {
      const d = { _id: new ObjectId(), ...doc };
      stores.history.push(d);
      return { insertedId: d._id };
    },
    find(filter: { userId: ObjectId }) {
      // Materialize the result set (newest first) and expose a Mongo-like
      // chainable cursor so .sort().skip().limit().toArray() works.
      let docs = stores.history
        .filter((h) => h.userId.equals(filter.userId))
        .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
        .map((d) => ({ hash: d.hash, algorithm: d.algorithm, _id: d._id }));
      const cursor = {
        sort() {
          return cursor;
        },
        skip(n: number) {
          docs = docs.slice(n);
          return cursor;
        },
        limit(n: number) {
          docs = docs.slice(0, n);
          return cursor;
        },
        async toArray() {
          return docs;
        },
      };
      return cursor;
    },
    async deleteMany(filter: { _id: { $in: ObjectId[] } }) {
      const ids = new Set(filter._id.$in.map((i) => i.toString()));
      stores.history = stores.history.filter((h) => !ids.has(h._id.toString()));
      return { deletedCount: ids.size };
    },
  }),
  getPasswordPoliciesCollection: async () => ({
    async findOne(_filter: { name: string }) {
      if (!stores.policySeeded) return null;
      return stores.policy;
    },
    async updateOne() {
      return { upsertedCount: 1 };
    },
  }),
}));

// Mock the side-effecting / external repos + services the PasswordService uses.
vi.mock('@/auth/repositories/user.repository', () => ({
  UserRepository: class {
    async findById(userId: ObjectId) {
      return stores.users.get(userId.toString()) ?? null;
    }
    async findPrimaryEmail() {
      return null;
    }
    async findByEmail() {
      return null;
    }
  },
}));

vi.mock('@/auth/repositories/verification-token.repository', () => ({
  VerificationTokenRepository: class {
    async redeem() {
      return { userId: null, payload: {} };
    }
    async invalidateAll() {}
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
    async countRecentResetRequests() {
      return 0;
    }
    async recordResetRequest() {}
  },
}));

vi.mock('@/auth/repositories/session.repository', () => ({
  SessionRepository: class {
    async revokeAllUserSessionsExcept() {}
  },
}));

vi.mock('@/auth/services/alerting.service', () => ({
  AlertingService: class {
    async alertPasswordResetSuccess() {}
  },
}));

vi.mock('@/auth/services/mailer', () => ({
  sendMail: async () => {},
}));

vi.mock('@/auth/lib/request', () => ({
  getClientIp: async () => '127.0.0.1',
}));

// `server-only` throws outside RSC; stub it so imports work under vitest.
vi.mock('server-only', () => ({}));

const { PasswordService } = await import('@/auth/services/password.service');

describe('PasswordService — policy + history enforcement', () => {
  let userId: ObjectId;
  let service: InstanceType<typeof PasswordService>;

  beforeAll(() => {
    process.env.MONGODB_URI = 'mongodb://localhost:27017/test';
    process.env.SESSION_SECRET = 'test-session-secret-at-least-thirty-two-chars!!';
    process.env.APP_URL = 'http://localhost:3000';
  });

  beforeEach(() => {
    stores.users.clear();
    stores.history = [];
    stores.policy = null;
    stores.policySeeded = false;
    stores.audit.length = 0;
    userId = new ObjectId();
    service = new PasswordService();
  });

  function seedUser(passwordHash: string, currentPassword: string) {
    stores.users.set(userId.toString(), {
      _id: userId,
      password: { hash: passwordHash, algorithm: 'argon2id' },
      passwordChangedAt: new Date(),
      currentPassword, // track the known plaintext for the change-password authn check
      security: {
        forcePasswordChange: true,
        accountSecurityVersion: 1,
        lockedUntil: null,
      },
      updatedAt: new Date(),
    });
  }

  it('rejects a password that violates the active policy (too short)', async () => {
    const { hashPassword } = await import('@/auth/crypto/password');
    // Seed a current (valid) password so the "current password" check would pass.
    const currentHash = await hashPassword('OldPassw0rd!2024');
    seedUser(currentHash, 'OldPassw0rd!2024');

    await expect(
      service.changePassword(userId, 'OldPassw0rd!2024', 'short1!', userId.toString())
    ).rejects.toThrow(/does not meet the account requirements/i);

    // No write happened: user hash is unchanged + no history recorded.
    expect(stores.users.get(userId.toString()).password.hash).toBe(currentHash);
    expect(stores.history.filter((h) => h.userId.equals(userId))).toHaveLength(0);
  });

  it('rejects a password that reuses one of the last N stored hashes', async () => {
    const { hashPassword } = await import('@/auth/crypto/password');
    const reused = 'ReuseMePassw0rd!99';
    const reusedHash = await hashPassword(reused);

    // Seed current password AND a history entry with the same reused value.
    seedUser(reusedHash, reused);
    stores.history.push({
      _id: new ObjectId(),
      userId,
      hash: reusedHash,
      algorithm: 'argon2id',
      createdAt: new Date(),
    });

    await expect(
      service.changePassword(userId, reused, reused, userId.toString())
    ).rejects.toThrow(/does not meet the account requirements/i);

    // History count stays at 1 (no new entry written on rejection).
    expect(stores.history.filter((h) => h.userId.equals(userId))).toHaveLength(1);
  });

  it('accepts a fresh valid password, records it in history, and clears forcePasswordChange', async () => {
    const { hashPassword } = await import('@/auth/crypto/password');
    const current = await hashPassword('OldPassw0rd!2024');
    seedUser(current, 'OldPassw0rd!2024');

    const fresh = 'BrandNewPassw0rd!2026';

    await service.changePassword(userId, 'OldPassw0rd!2024', fresh, userId.toString());

    const user = stores.users.get(userId.toString());
    // User password updated to the new hash.
    expect(user.password.hash).not.toBe(current);
    // forcePasswordChange cleared.
    expect(user.security.forcePasswordChange).toBe(false);
    // Exactly one history entry recorded (the new password).
    const entries = stores.history.filter((h) => h.userId.equals(userId));
    expect(entries).toHaveLength(1);
    // History stores the SAME peppered Argon2 hash — never plaintext.
    expect(entries[0].hash).toBe(user.password.hash);
    expect(entries[0].hash).toMatch(/^\$argon2id\$/);
    expect(entries[0].hash).not.toBe(fresh);
  });

  it('caps stored history at the active policy historyCount', async () => {
    const { hashPassword } = await import('@/auth/crypto/password');

    // Pin a policy with historyCount = 2 (override the default of 5).
    stores.policySeeded = true;
    stores.policy = {
      name: 'default',
      minLength: 12,
      maxLength: 128,
      requireUppercase: true,
      requireLowercase: true,
      requireNumber: true,
      requireSpecialChar: true,
      expirationDays: 0,
      historyCount: 2,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const current = await hashPassword('OldPassw0rd!2024');
    seedUser(current, 'OldPassw0rd!2024');

    // Perform 4 successful changes; each new password is unique and valid, and
    // we track the live plaintext so the change-password authn check passes.
    const passwords = [
      'FirstNewPass1!',
      'SecondNewPas1!',
      'ThirdNewPass1!',
      'FourthNewPa1!',
    ];
    let knownPlain = 'OldPassw0rd!2024';
    for (const pw of passwords) {
      await service.changePassword(userId, knownPlain, pw, userId.toString());
      knownPlain = pw;
    }

    const entries = stores.history.filter((h) => h.userId.equals(userId));
    // Capped at historyCount (2): only the two most recent remain.
    expect(entries.length).toBe(2);
  });
});
