import { describe, it, expect, beforeAll, beforeEach, afterEach, vi } from 'vitest';
import { ObjectId } from 'mongodb';
import type { SessionDocument, RefreshTokenDocument, UserDocument } from '@/types/auth';

vi.mock('@/auth/config/env', () => ({
  getEnv: () => ({
    MONGODB_URI: 'mongodb://localhost:27017/test',
    SESSION_SECRET: 'test-session-secret-at-least-thirty-two-chars!!',
    APP_URL: 'http://localhost:3000',
    ACCESS_SESSION_TTL_MS: 15 * 60 * 1000,
    REFRESH_TOKEN_TTL_MS: 7 * 24 * 60 * 60 * 1000,
  }),
}));

const stores = vi.hoisted(() => ({
  sessions: new Map<string, SessionDocument>(),
  refreshes: new Map<string, RefreshTokenDocument>(),
  user: null as UserDocument | null,
}));

vi.mock('@/database', () => {
  const fakeColl = {
    async updateOne() { return { matchedCount: 1, modifiedCount: 1 }; },
    async updateMany() { return { modifiedCount: 0 }; },
    async findOne() { return null; },
    async insertOne() { return { insertedId: new ObjectId() }; },
    async find() { return { toArray: async () => [] }; },
  };
  return {
    getDb: async () => ({ collection: () => fakeColl }),
    getSessionsCollection: async () => ({
      async insertOne(doc: SessionDocument) {
        stores.sessions.set(doc._id.toString(), { ...doc });
        return { insertedId: doc._id };
      },
      find() { return { toArray: async () => [] }; },
      async updateOne(filter: { _id: ObjectId }, update: { $set: Partial<SessionDocument> }) {
        const idStr = filter._id.toString();
        const s = stores.sessions.get(idStr);
        if (s) {
          if (update.$set) Object.assign(s, update.$set);
          stores.sessions.set(idStr, s);
        }
        return { matchedCount: s ? 1 : 0, modifiedCount: s ? 1 : 0 };
      },
    }),
    getRefreshTokensCollection: async () => ({
      async insertOne(doc: RefreshTokenDocument) {
        stores.refreshes.set(doc._id.toString(), { ...doc });
        return { insertedId: doc._id };
      },
      async updateMany() { return { modifiedCount: 0 }; },
    }),
    getUsersCollection: async () => ({
      async findOne() { return stores.user; },
    }),
    getDevicesCollection: async () => fakeColl,
    getAuditLogsCollection: async () => fakeColl,
  };
});

vi.mock('@/auth/repositories/user.repository', () => ({
  UserRepository: class {
    async findById() { return stores.user; }
  },
}));

vi.mock('@/auth/repositories/device.repository', () => ({
  DeviceRepository: class {
    async registerDevice() {
      return { deviceObjectId: new ObjectId(), isNew: false, countryChanged: false };
    }
  },
}));

vi.mock('@/auth/lib/geoip', () => ({
  lookupGeo: async () => ({ country: null, region: null, city: null }),
}));

vi.mock('@/auth/repositories/audit-log.repository', () => ({
  AuditLogRepository: class {
    async log() {}
  },
}));

const { SessionService } = await import('./session.service');

describe('SessionService.createSession — Centralized Risk Policy Architecture', () => {
  const userId = new ObjectId();

  beforeEach(() => {
    stores.sessions.clear();
    stores.refreshes.clear();
    stores.user = {
      _id: userId,
      status: 'active',
      security: { mfaEnabled: false, forcePasswordChange: false },
      profile: {},
      role: 'user',
      createdAt: new Date(),
      updatedAt: new Date(),
    } as any;
  });

  it('creates an authenticated session directly when invoked', async () => {
    const service = new SessionService();
    const result = await service.createSession(userId, '1.2.3.4', 'agent', 'password', null);
    expect(result.status).toBe('authenticated');
    expect(stores.sessions.size).toBe(1);
    expect([...stores.sessions.values()][0].revoked).toBe(false);
  });
});
