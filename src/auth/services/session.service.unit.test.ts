import { describe, it, expect, beforeAll, beforeEach, afterEach, vi } from 'vitest';
import { ObjectId } from 'mongodb';
import type {
  SessionDocument,
  RefreshTokenDocument,
  UserDocument,
  LoginMethod,
} from '@/types/auth';
import { hashToken } from '@/auth/crypto/token';

// ─── Shared, hoisted in-memory stores (accessible to both the test body and the
//     vi.mock factories below). ────────────────────────────────────────────────
const stores = vi.hoisted(() => ({
  sessions: new Map<string, SessionDocument>(),
  refreshes: new Map<string, RefreshTokenDocument>(),
  user: null as UserDocument | null,
  // In-memory `devices` keyed by recordId (string form of devices._id).
  devices: new Map<string, { _id: string; userId: string; blocked: boolean; deviceId: string }>(),
}));

// Mock the DB collection accessors the service reaches directly (e.g. the
// background last-activity write in validateSession uses getSessionsCollection).
vi.mock('@/database', () => {
  const fakeColl = {
    async updateOne() {
      return { matchedCount: 1, modifiedCount: 1 };
    },
    async updateMany() {
      return { modifiedCount: 0 };
    },
    async findOne() {
      return null;
    },
    async insertOne() {
      return { insertedId: new ObjectId() };
    },
    async find() {
      return { toArray: async () => [] };
    },
  };
  const getter = async () => fakeColl;
  return {
    getDb: async () => ({}),
    getMongoClient: async () => ({}),
    getUsersCollection: getter,
    getUserEmailsCollection: getter,
    getUserPhonesCollection: getter,
    getOAuthAccountsCollection: getter,
    getDevicesCollection: getter,
    getSessionsCollection: getter,
    getRefreshTokensCollection: getter,
    getVerificationTokensCollection: getter,
    getPasswordPoliciesCollection: getter,
    getPasswordHistoryCollection: getter,
    getOtpCodesCollection: getter,
    getAuditLogsCollection: getter,
    getLoginAttemptsCollection: getter,
  };
});

// Mock the repositories with in-memory behavior backed by `stores`.
vi.mock('@/auth/repositories/session.repository', () => ({
  SessionRepository: class {
    async createSession(data: Record<string, unknown>) {
      const doc = {
        ...(data as unknown as SessionDocument),
        _id: new ObjectId(),
        createdAt: new Date(),
      } as SessionDocument;
      stores.sessions.set(doc._id.toString(), doc);
      return doc;
    }
    async findById(id: ObjectId) {
      return stores.sessions.get(id.toString()) ?? null;
    }
    async findActiveByUserId() {
      return [];
    }
    async revokeSession(id: ObjectId, by: string, reason: string) {
      const s = stores.sessions.get(id.toString());
      if (s) {
        s.revoked = true;
        s.revokedBy = by as SessionDocument['revokedBy'];
        s.revokedReason = reason;
        s.revokedAt = new Date();
      }
    }
    async setLatestRefreshToken(id: ObjectId, rid: ObjectId) {
      const s = stores.sessions.get(id.toString());
      if (s) s.latestRefreshTokenId = rid;
    }
    async touchRefresh(id: ObjectId, nowMs: number) {
      const s = stores.sessions.get(id.toString());
      if (s) {
        s.refreshCount += 1;
        s.lastRefreshAt = new Date(nowMs);
      }
    }
    async renewAccessSession(
      id: ObjectId,
      expiresAt: Date,
      lastActivityAt: Date
    ) {
      const s = stores.sessions.get(id.toString());
      if (s) {
        s.expiresAt = expiresAt;
        s.lastActivityAt = lastActivityAt;
      }
    }
  },
}));

vi.mock('@/auth/repositories/refresh-token.repository', () => ({
  RefreshTokenRepository: class {
    async create(data: Record<string, unknown>) {
      const doc = {
        ...data,
        _id: new ObjectId(),
        createdAt: new Date(),
      } as unknown as RefreshTokenDocument;
      stores.refreshes.set(doc.tokenHash, doc);
      return doc;
    }
    async findByHash(tokenHash: string) {
      return stores.refreshes.get(tokenHash) ?? null;
    }
    async markReplaced(oldHash: string, replacedBy: ObjectId) {
      const t = stores.refreshes.get(oldHash);
      if (t) {
        t.replacedBy = replacedBy;
        t.revoked = true;
        t.revokedReason = 'rotated';
        t.revokedAt = new Date();
      }
    }
    async atomicReplace(oldHash: string, newId: ObjectId, now: Date) {
      const t = stores.refreshes.get(oldHash);
      if (!t || t.replacedBy !== null) return null;
      t.replacedBy = newId;
      t.revoked = true;
      t.revokedReason = 'rotated';
      t.revokedAt = now;
      return t;
    }
    async markReuseDetected(tokenHash: string) {
      const t = stores.refreshes.get(tokenHash);
      if (t) {
        t.reuseDetected = true;
        t.revoked = true;
        t.revokedReason = 'reuse_detected';
        t.revokedAt = new Date();
      }
    }
    async revokeBySession(_id: ObjectId, _reason: string) {}
  },
}));

vi.mock('@/auth/repositories/user.repository', () => ({
  UserRepository: class {
    async findById() {
      return stores.user;
    }
    async findPrimaryEmail() {
      return null;
    }
    async incrementFailedAndGet(userId: ObjectId, threshold: number) {
      const u = stores.user;
      if (!u) return null;
      if ((u.security?.failedLoginAttempts ?? 0) >= threshold) return null;
      u.security = u.security ?? {
        failedLoginAttempts: 0,
        lockedUntil: null,
        mfaEnabled: false,
        lastPasswordResetRequestAt: null,
        forcePasswordChange: false,
        accountSecurityVersion: 1,
      };
      u.security.failedLoginAttempts = (u.security.failedLoginAttempts ?? 0) + 1;
      u.updatedAt = new Date();
      return u;
    }
    async incrementFailedAttempts() {}
  },
}));

vi.mock('@/auth/repositories/device.repository', () => ({
  DeviceRepository: class {
    static isValidDeviceId() {
      return false;
    }
    async findByIdForUser() {
      return null;
    }
    async findByServerDeviceId(recordId: { toString(): string }, userId: { toString(): string }) {
      return stores.devices.get(recordId.toString()) ?? null;
    }
  },
}));

vi.mock('@/auth/services/device.service', () => ({
  DeviceService: class {
    async registerLogin(params: { serverDeviceId?: ObjectId | null }) {
      // Simulate the repo returning the server-issued record id as the bound
      // device. When none is supplied (brand-new), mint one like the real repo.
      return { isNew: false, deviceObjectId: params.serverDeviceId ?? new ObjectId() };
    }
  },
}));

vi.mock('@/auth/repositories/audit-log.repository', () => ({
  AuditLogRepository: class {
    async log() {
      return {};
    }
  },
}));

// `validateSession` schedules a background last-activity write via Next.js
// `after()`, which throws "called outside a request scope" in a plain node test.
// Stub it to synchronously invoke the callback so the unit test can exercise the
// full validateSession path without a Next request context.
vi.mock('next/server', () => ({
  after: (cb: () => void | Promise<void>) => {
    void Promise.resolve(cb()).catch(() => {});
  },
}));

// Import the service under test AFTER mocks are declared.
const { SessionService } = await import('@/auth/services/session.service');
const { signSessionId } = await import('@/auth/crypto/token');

const ACCESS_TTL = 15 * 60 * 1000;
const IDLE_TTL = 30 * 60 * 1000;
const REFRESH_TTL = 7 * 24 * 60 * 60 * 1000;

function makeUser(): UserDocument {
  return {
    _id: new ObjectId(),
    profile: {
      displayName: 'Test User',
      firstName: 'Test',
      lastName: 'User',
      avatar: null,
      timezone: null,
      locale: null,
      employeeId: null,
      department: null,
    },
    password: null,
    passwordChangedAt: null,
    passwordExpiresAt: null,
    role: 'admin',
    status: 'active',
    loginMethods: ['password'],
    security: {
      failedLoginAttempts: 0,
      lockedUntil: null,
      mfaEnabled: false,
      lastPasswordResetRequestAt: null,
      forcePasswordChange: false,
      accountSecurityVersion: 1,
    },
    metadata: { invitedBy: null, invitedAt: null, notes: null },
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
  } as unknown as UserDocument;
}

function seedSessionAndRefresh(
  baseTime: number,
  overrides: Partial<SessionDocument> = {}
): { sessionId: ObjectId; tokenHash: string } {
  const sessionId = new ObjectId();
  const refreshId = new ObjectId();
  const token = 'plaintext-refresh-token-' + sessionId.toString();
  const tokenHash = hashToken(token);

  const session: SessionDocument = {
    _id: sessionId,
    userId: new ObjectId(),
    deviceId: null,
    latestRefreshTokenId: refreshId,
    loginMethod: 'password' as LoginMethod,
    device: 'Chrome',
    platform: 'web',
    browser: 'Chrome',
    operatingSystem: 'macOS',
    userAgent: 'test-agent',
    ipAddress: '127.0.0.1',
    location: null,
    refreshCount: 0,
    lastRefreshAt: null,
    lastActivityAt: new Date(baseTime),
    lastFullAuthAt: new Date(baseTime),
    expiresAt: new Date(baseTime + ACCESS_TTL),
    revoked: false,
    revokedBy: null,
    revokedReason: null,
    revokedAt: null,
    accountSecurityVersion: 1,
    createdAt: new Date(baseTime),
    ...overrides,
  };

  const refresh: RefreshTokenDocument = {
    _id: refreshId,
    sessionId,
    userId: session.userId,
    tokenHash,
    rotationNumber: 0,
    rotatedFrom: null,
    replacedBy: null,
    reuseDetected: false,
    revoked: false,
    revokedAt: null,
    revokedReason: null,
    lastUsedAt: null,
    lastUsedIp: null,
    lastUsedUserAgent: null,
    expiresAt: new Date(baseTime + REFRESH_TTL),
    createdAt: new Date(baseTime),
  };

  stores.sessions.set(sessionId.toString(), session);
  stores.refreshes.set(tokenHash, refresh);
  // Seed a user matching the session's account-security version.
  const user = makeUser();
  (user as { _id: ObjectId })._id = session.userId;
  user.security.accountSecurityVersion = session.accountSecurityVersion ?? 1;
  stores.user = user;

  return { sessionId, tokenHash };
}

describe('Atomic helpers — RefreshTokenRepository.atomicReplace & UserRepository.incrementFailedAndGet', () => {
  beforeAll(() => {
    process.env.MONGODB_URI = 'mongodb://localhost:27017/test';
    process.env.SESSION_SECRET = 'test-session-secret-at-least-thirty-two-chars!!';
    process.env.APP_URL = 'http://localhost:3000';
  });

  beforeEach(() => {
    stores.sessions.clear();
    stores.refreshes.clear();
    stores.user = null;
    stores.devices.clear();
  });

  it('atomicReplace: two concurrent callers — first wins, loser returns null (no second live token)', async () => {
    const { RefreshTokenRepository } = await import('@/auth/repositories/refresh-token.repository');
    const repo = new RefreshTokenRepository();

    const tokenHash = 'live-token-hash';
    const liveId = new ObjectId();
    const newIdA = new ObjectId();
    const newIdB = new ObjectId();
    const now = new Date();
    stores.refreshes.set(tokenHash, {
      _id: liveId,
      sessionId: new ObjectId(),
      userId: new ObjectId(),
      tokenHash,
      rotationNumber: 0,
      rotatedFrom: null,
      replacedBy: null,
      reuseDetected: false,
      revoked: false,
      revokedAt: null,
      revokedReason: null,
      lastUsedAt: null,
      lastUsedIp: null,
      lastUsedUserAgent: null,
      expiresAt: now,
      createdAt: now,
    } as unknown as RefreshTokenDocument);

    const winner = await repo.atomicReplace(tokenHash, newIdA, now);
    const loser = await repo.atomicReplace(tokenHash, newIdB, now);

    expect(winner).not.toBeNull();
    expect((winner as RefreshTokenDocument).replacedBy?.toString()).toBe(newIdA.toString());
    expect(loser).toBeNull();

    const stored = stores.refreshes.get(tokenHash)!;
    expect(stored.revoked).toBe(true);
    expect(stored.replacedBy?.toString()).toBe(newIdA.toString());
  });

  it('incrementFailedAndGet: threshold boundary — increments up to threshold, then no-ops at threshold', async () => {
    const { UserRepository } = await import('@/auth/repositories/user.repository');
    const repo = new UserRepository();
    const userId = new ObjectId();
    const THRESHOLD = 5;

    stores.user = makeUser();
    (stores.user as { _id: ObjectId })._id = userId;
    stores.user.security.failedLoginAttempts = 0;

    for (let i = 1; i <= 4; i++) {
      const updated = await repo.incrementFailedAndGet(userId, THRESHOLD);
      expect(updated).not.toBeNull();
      expect((updated as UserDocument).security.failedLoginAttempts).toBe(i);
    }

    const atThreshold = await repo.incrementFailedAndGet(userId, THRESHOLD);
    expect(atThreshold).not.toBeNull();
    expect((atThreshold as UserDocument).security.failedLoginAttempts).toBe(THRESHOLD);

    const locked = await repo.incrementFailedAndGet(userId, THRESHOLD);
    expect(locked).toBeNull();
    expect(stores.user.security.failedLoginAttempts).toBe(THRESHOLD);
  });
});

describe('SessionService.rotateRefreshToken — rolling access session', () => {
  beforeAll(() => {
    process.env.MONGODB_URI = 'mongodb://localhost:27017/test';
    process.env.SESSION_SECRET =
      'test-session-secret-at-least-thirty-two-chars!!';
    process.env.APP_URL = 'http://localhost:3000';
  });

  beforeEach(() => {
    stores.sessions.clear();
    stores.refreshes.clear();
    stores.user = null;
    stores.devices.clear();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('ACCEPTANCE: refresh after 16 min keeps the session alive past the 15-min mark and validateSession returns non-null', async () => {
    const service = new SessionService();
    const baseTime = Date.now();

    // Login happens "now".
    vi.setSystemTime(new Date(baseTime));
    const { sessionId, tokenHash } = seedSessionAndRefresh(baseTime);

    // 16 minutes later the client refreshes.
    vi.setSystemTime(new Date(baseTime + 16 * 60 * 1000));

    const result = await service.rotateRefreshToken(
      tokenHash,
      '203.0.113.7',
      'test-agent'
    );

    expect(result).not.toBeNull();
    expect('expired' in (result as object)).toBe(false);

    // The persisted session must have been rolled forward.
    const stored = stores.sessions.get(sessionId.toString())!;
    expect(stored.expiresAt.getTime()).toBeGreaterThan(
      baseTime + ACCESS_TTL // survived past the ORIGINAL 15-min mark
    );
    expect(stored.lastActivityAt.getTime()).toBe(baseTime + 16 * 60 * 1000);

    // And validateSession must now treat the session as valid.
    const cookie = (result as { sessionCookie: string }).sessionCookie;
    const validated = await service.validateSession(cookie);
    expect(validated).not.toBeNull();
    expect(validated!._id.toString()).toBe(sessionId.toString());
  });

  it('expiresAt never exceeds the 7-day absolute cap (lastFullAuthAt + REFRESH_TTL)', async () => {
    const service = new SessionService();
    const baseTime = Date.now();
    vi.setSystemTime(new Date(baseTime));
    const { sessionId } = seedSessionAndRefresh(baseTime);

    const stored = stores.sessions.get(sessionId.toString())!;
    expect(stored.expiresAt.getTime()).toBeLessThanOrEqual(
      (stored.lastFullAuthAt?.getTime() ?? 0) + REFRESH_TTL
    );

    // After a refresh the new window is still bounded by the cap.
    vi.setSystemTime(new Date(baseTime + 5 * 60 * 1000));
    await service.rotateRefreshToken(
      hashToken('plaintext-refresh-token-' + sessionId.toString()),
      '203.0.113.7',
      'test-agent'
    );
    const after = stores.sessions.get(sessionId.toString())!;
    expect(after.expiresAt.getTime()).toBeLessThanOrEqual(
      (after.lastFullAuthAt?.getTime() ?? 0) + REFRESH_TTL
    );
  });

  it('FIX-C2: refuses a refresh when the absolute 7-day window since last full auth has elapsed', async () => {
    const service = new SessionService();
    const baseTime = Date.now();

    // lastFullAuthAt was 8 days ago; only 16 minutes of "wall clock" have passed.
    vi.setSystemTime(new Date(baseTime));
    const { sessionId } = seedSessionAndRefresh(baseTime, {
      lastFullAuthAt: new Date(baseTime - 8 * 24 * 60 * 60 * 1000),
      lastActivityAt: new Date(baseTime),
    });

    const result = await service.rotateRefreshToken(
      hashToken('plaintext-refresh-token-' + sessionId.toString()),
      '203.0.113.7',
      'test-agent'
    );

    expect(result).toEqual({ expired: true });
  });

  it('returns null when the session is already revoked (reuse detection), keeping validateSession null', async () => {
    const service = new SessionService();
    const baseTime = Date.now();
    vi.setSystemTime(new Date(baseTime));
    const { sessionId, tokenHash } = seedSessionAndRefresh(baseTime, {
      revoked: true,
    });

    const result = await service.rotateRefreshToken(
      tokenHash,
      '203.0.113.7',
      'test-agent'
    );
    expect(result).toBeNull();

    const cookie = signSessionId(
      sessionId.toString(),
      process.env.SESSION_SECRET!
    );
    const validated = await service.validateSession(cookie);
    expect(validated).toBeNull();
  });

  it('idle timeout still revokes at refresh time (FIX-C2 gate mirrors validateSession) even though the rolling access expiresAt is still in the future', async () => {
    const service = new SessionService();
    const baseTime = Date.now();
    vi.setSystemTime(new Date(baseTime));
    const { sessionId, tokenHash } = seedSessionAndRefresh(baseTime, {
      lastActivityAt: new Date(baseTime - IDLE_TTL - 1000), // already idle
      lastFullAuthAt: new Date(baseTime),
    });

    // The FIX-C2 gate refuses an idle session at refresh time (rolling access
    // expiresAt is irrelevant to the idle check) and revokes the family.
    const rotated = await service.rotateRefreshToken(
      tokenHash,
      '203.0.113.7',
      'test-agent'
    );
    expect(rotated).toEqual({ expired: true });
    expect(stores.sessions.get(sessionId.toString())!.revoked).toBe(true);

    // And validateSession also returns null for the now-revoked session.
    const cookie = signSessionId(
      sessionId.toString(),
      process.env.SESSION_SECRET!
    );
    const validated = await service.validateSession(cookie);
    expect(validated).toBeNull();
  });
});

describe('SessionService.createSession — server-issued device token block', () => {
  beforeAll(() => {
    process.env.MONGODB_URI = 'mongodb://localhost:27017/test';
    process.env.SESSION_SECRET = 'test-session-secret-at-least-thirty-two-chars!!';
    process.env.APP_URL = 'http://localhost:3000';
  });

  beforeEach(() => {
    stores.sessions.clear();
    stores.refreshes.clear();
    stores.user = null;
    stores.devices.clear();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  /**
   * ACCEPTANCE: a blocked device cannot silently re-login after clearing its
   * cookies. Clearing cookies DOES yield a brand-new server device record (the
   * block is defense-in-depth, not a hard cryptographic boundary), but re-login
   * from the SAME issued server token is still rejected.
   */
  it('rejects re-login when the issued server device token is blocked', async () => {
    const service = new SessionService();
    const userId = new ObjectId();
    const deviceRecordId = new ObjectId();

    // Seed a blocked server device record for this user.
    stores.devices.set(deviceRecordId.toString(), {
      _id: deviceRecordId.toString(),
      userId: userId.toString(),
      blocked: true,
      deviceId: 'c0ffee00-0000-4000-8000-000000000001',
    });

    const device: { serverDeviceId: ObjectId | null; clientDeviceId: string | null; hasServerToken: boolean } = {
      serverDeviceId: deviceRecordId,
      clientDeviceId: 'c0ffee00-0000-4000-8000-000000000001',
      hasServerToken: true,
    };

    // First login attempt with the blocked server token is rejected.
    await expect(
      service.createSession(userId, '203.0.113.9', 'test-agent', 'password', device)
    ).rejects.toThrow(/blocked/i);

    // And no session/refresh was created for the blocked device.
    expect(stores.sessions.size).toBe(0);
    expect(stores.refreshes.size).toBe(0);
  });

  it('allows login from an unblocked server device token and registers the record', async () => {
    const service = new SessionService();
    const userId = new ObjectId();
    const deviceRecordId = new ObjectId();

    // Seed an UNblocked server device record for this user.
    stores.devices.set(deviceRecordId.toString(), {
      _id: deviceRecordId.toString(),
      userId: userId.toString(),
      blocked: false,
      deviceId: 'c0ffee00-0000-4000-8000-000000000002',
    });

    const device: { serverDeviceId: ObjectId | null; clientDeviceId: string | null; hasServerToken: boolean } = {
      serverDeviceId: deviceRecordId,
      clientDeviceId: 'c0ffee00-0000-4000-8000-000000000002',
      hasServerToken: true,
    };

    const result = await service.createSession(
      userId,
      '203.0.113.10',
      'test-agent',
      'password',
      device
    );
    expect(result.status).toBe('authenticated');
    if (result.status !== 'authenticated') throw new Error('expected authenticated');
    expect(result.sessionId).toBeTruthy();
    expect(result.deviceObjectId?.toString()).toBe(deviceRecordId.toString());

    // A session + refresh token were created and bound to the user.
    expect(stores.sessions.size).toBe(1);
    expect(stores.refreshes.size).toBe(1);
    expect([...stores.sessions.values()][0].userId.toString()).toBe(userId.toString());
  });

  it('a brand-new server token (post cookie-clear) maps to an unblocked record and is allowed', async () => {
    const service = new SessionService();
    const userId = new ObjectId();
    const blockedRecordId = new ObjectId();

    // The ORIGINAL device is blocked (simulating "clear cookies + admin block").
    stores.devices.set(blockedRecordId.toString(), {
      _id: blockedRecordId.toString(),
      userId: userId.toString(),
      blocked: true,
      deviceId: 'c0ffee00-0000-4000-8000-000000000003',
    });

    // Re-login from the SAME blocked token is still rejected.
    await expect(
      service.createSession(userId, '203.0.113.11', 'test-agent', 'password', {
        serverDeviceId: blockedRecordId,
        clientDeviceId: 'c0ffee00-0000-4000-8000-000000000003',
        hasServerToken: true,
      })
    ).rejects.toThrow(/blocked/i);

    // But a brand-new server token (no record yet) is treated as a new,
    // unblocked device and is allowed — the block lives on the server record,
    // not on a client-chosen string, so it cannot be reused silently.
    const freshRecordId = new ObjectId();
    const fresh = await service.createSession(
      userId,
      '203.0.113.12',
      'test-agent',
      'password',
      { serverDeviceId: freshRecordId, clientDeviceId: null, hasServerToken: false }
    );
    expect(fresh.status).toBe('authenticated');
    if (fresh.status !== 'authenticated') throw new Error('expected authenticated');
    expect(fresh.sessionId).toBeTruthy();
    expect(stores.sessions.size).toBe(1);
  });
});
