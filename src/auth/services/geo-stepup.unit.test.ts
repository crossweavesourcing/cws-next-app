import { describe, it, expect, beforeAll, beforeEach, afterEach, vi } from 'vitest';
import { ObjectId } from 'mongodb';
import type { SessionDocument, RefreshTokenDocument, UserDocument } from '@/types/auth';
import { lookupGeo } from '@/auth/lib/geoip';

// getEnv() memoizes its parsed result, so toggling STEP_UP_ENABLED / GEOIP_LOOKUP_URL
// via process.env between tests has no effect. Mock it to recompute the two Item 9
// vars per call (plus the fields createSession + geoip actually read), so the tests
// can flip the step-up flag on/off.
vi.mock('@/auth/config/env', () => ({
  getEnv: () => ({
    MONGODB_URI: 'mongodb://localhost:27017/test',
    SESSION_SECRET: 'test-session-secret-at-least-thirty-two-chars!!',
    APP_URL: 'http://localhost:3000',
    ACCESS_SESSION_TTL_MS: 15 * 60 * 1000,
    REFRESH_TOKEN_TTL_MS: 7 * 24 * 60 * 60 * 1000,
    STEP_UP_ENABLED: process.env.STEP_UP_ENABLED === 'true' || process.env.STEP_UP_ENABLED === '1',
    GEOIP_LOOKUP_URL: process.env.GEOIP_LOOKUP_URL ?? undefined,
  }),
}));

/**
 * Shared in-memory stores for the SessionService step-up tests.
 * Mirrors the patterns in session.service.unit.test.ts but focused on the
 * Item 9 geo-IP + step-up behavior.
 */
const stores = vi.hoisted(() => ({
  sessions: new Map<string, SessionDocument>(),
  refreshes: new Map<string, RefreshTokenDocument>(),
  user: null as UserDocument | null,
  devices: new Map<string, { _id: string; userId: string; blocked: boolean; deviceId: string }>(),
}));

// Minimal DB collection mock (enough for createSession + step-up revocation).
vi.mock('@/database', () => {
  const fakeColl = {
    async updateOne() { return { matchedCount: 1, modifiedCount: 1 }; },
    async updateMany() { return { modifiedCount: 0 }; },
    async findOne() { return null; },
    async insertOne() { return { insertedId: new ObjectId() }; },
    async find() { return { toArray: async () => [] }; },
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

vi.mock('@/auth/repositories/session.repository', () => ({
  SessionRepository: class {
    async createSession(data: Record<string, unknown>) {
      const doc = { ...(data as unknown as SessionDocument), _id: new ObjectId(), createdAt: new Date() } as SessionDocument;
      stores.sessions.set(doc._id.toString(), doc);
      return doc;
    }
    async findById(id: ObjectId) { return stores.sessions.get(id.toString()) ?? null; }
    async findActiveByUserId() { return []; }
    async revokeSession(id: ObjectId, by: string, reason: string) {
      const s = stores.sessions.get(id.toString());
      if (s) { s.revoked = true; s.revokedBy = by as SessionDocument['revokedBy']; s.revokedReason = reason; s.revokedAt = new Date(); }
    }
    async setLatestRefreshToken(id: ObjectId, rid: ObjectId) {
      const s = stores.sessions.get(id.toString());
      if (s) s.latestRefreshTokenId = rid;
    }
    async touchRefresh(id: ObjectId, nowMs: number) {
      const s = stores.sessions.get(id.toString());
      if (s) { s.refreshCount += 1; s.lastRefreshAt = new Date(nowMs); }
    }
    async renewAccessSession(id: ObjectId, expiresAt: Date, lastActivityAt: Date) {
      const s = stores.sessions.get(id.toString());
      if (s) { s.expiresAt = expiresAt; s.lastActivityAt = lastActivityAt; }
    }
  },
}));

vi.mock('@/auth/repositories/refresh-token.repository', () => ({
  RefreshTokenRepository: class {
    async create(data: Record<string, unknown>) {
      const doc = { ...data, _id: new ObjectId(), createdAt: new Date() } as unknown as RefreshTokenDocument;
      stores.refreshes.set(doc.tokenHash, doc);
      return doc;
    }
    async findByHash(tokenHash: string) { return stores.refreshes.get(tokenHash) ?? null; }
    async markReplaced() {}
    async markReuseDetected() {}
    async revokeBySession() {}
  },
}));

vi.mock('@/auth/repositories/user.repository', () => ({
  UserRepository: class {
    async findById() { return stores.user; }
    async findPrimaryEmail() { return null; }
    async incrementFailedAttempts() {}
  },
}));

vi.mock('@/auth/repositories/device.repository', () => ({
  DeviceRepository: class {
    static isValidDeviceId() { return false; }
    async findByIdForUser() { return null; }
    async findByServerDeviceId(recordId: { toString(): string }) {
      return stores.devices.get(recordId.toString()) ?? null;
    }
  },
}));

// DeviceService: control isNew + countryChanged so we can drive step-up triggers.
const deviceBehavior = vi.hoisted(() => ({
  isNew: false,
  countryChanged: false,
  throwOnRegister: false,
}));
vi.mock('@/auth/services/device.service', () => ({
  DeviceService: class {
    async registerLogin(params: { serverDeviceId?: ObjectId | null }) {
      if (deviceBehavior.throwOnRegister) throw new Error('device boom');
      return {
        isNew: deviceBehavior.isNew,
        countryChanged: deviceBehavior.countryChanged,
        deviceObjectId: params.serverDeviceId ?? new ObjectId(),
      };
    }
  },
}));

vi.mock('@/auth/repositories/audit-log.repository', () => ({
  AuditLogRepository: class {
    async log() { return {}; }
  },
}));

// Import the service under test AFTER mocks are declared.
const { SessionService } = await import('@/auth/services/session.service');

function makeUser(): UserDocument {
  return {
    _id: new ObjectId(),
    profile: { displayName: 'Test', firstName: 'Test', lastName: 'User', avatar: null, timezone: null, locale: null, employeeId: null, department: null },
    password: null,
    passwordChangedAt: null,
    passwordExpiresAt: null,
    role: 'admin',
    status: 'active',
    loginMethods: ['password'],
    security: { failedLoginAttempts: 0, lockedUntil: null, mfaEnabled: false, lastPasswordResetRequestAt: null, forcePasswordChange: false, accountSecurityVersion: 1 },
    metadata: { invitedBy: null, invitedAt: null, notes: null },
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
  } as unknown as UserDocument;
}

// ─────────────────────────────────────────────────────────────────────────────
// lookupGeo (Item 9)
// ─────────────────────────────────────────────────────────────────────────────
describe('Item 9 — lookupGeo', () => {
  beforeAll(() => {
    process.env.MONGODB_URI = 'mongodb://localhost:27017/test';
    process.env.SESSION_SECRET = 'test-session-secret-at-least-thirty-two-chars!!';
    process.env.APP_URL = 'http://localhost:3000';
  });

  afterEach(() => {
    delete process.env.GEOIP_LOOKUP_URL;
    vi.restoreAllMocks();
  });

  it('returns null for loopback / private IPs (no lookup attempted)', async () => {
    expect(await lookupGeo('127.0.0.1')).toEqual({ country: null, region: null, city: null });
    expect(await lookupGeo('::1')).toEqual({ country: null, region: null, city: null });
    expect(await lookupGeo('10.0.0.5')).toEqual({ country: null, region: null, city: null });
    expect(await lookupGeo('192.168.1.1')).toEqual({ country: null, region: null, city: null });
    expect(await lookupGeo('172.16.0.1')).toEqual({ country: null, region: null, city: null });
  });

  it('fails open to null when no lookup is configured (no GEOIP_LOOKUP_URL, no offline DB)', async () => {
    // No GEOIP_LOOKUP_URL and geoip-lite is not installed in this env → null.
    expect(await lookupGeo('203.0.113.9')).toEqual({ country: null, region: null, city: null });
  });

  it('resolves real geo from GEOIP_LOOKUP_URL (?ip= form)', async () => {
    process.env.GEOIP_LOOKUP_URL = 'https://geo.test/lookup?ip=';
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string | URL) => {
        expect(String(url)).toContain('ip=203.0.113.9');
        return new Response(JSON.stringify({ country: 'US', region: 'CA', city: 'San Francisco' }), { status: 200 });
      })
    );
    const geo = await lookupGeo('203.0.113.9');
    expect(geo).toEqual({ country: 'US', region: 'CA', city: 'San Francisco' });
  });

  it('resolves real geo from GEOIP_LOOKUP_URL ({ip} placeholder form)', async () => {
    process.env.GEOIP_LOOKUP_URL = 'https://geo.test/lookup/{ip}';
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string | URL) => {
        expect(String(url)).toContain('lookup/203.0.113.9');
        return new Response(JSON.stringify({ country: 'DE' }), { status: 200 });
      })
    );
    const geo = await lookupGeo('203.0.113.9');
    expect(geo).toEqual({ country: 'DE', region: null, city: null });
  });

  it('fails open to null on a non-OK response (never throws)', async () => {
    process.env.GEOIP_LOOKUP_URL = 'https://geo.test/lookup?ip=';
    vi.stubGlobal('fetch', vi.fn(async () => new Response('nope', { status: 500 })));
    expect(await lookupGeo('203.0.113.9')).toEqual({ country: null, region: null, city: null });
  });

  it('fails open to null on timeout (abort) and does not throw', async () => {
    process.env.GEOIP_LOOKUP_URL = 'https://geo.test/lookup?ip=';
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        const err = new Error('aborted');
        err.name = 'AbortError';
        throw err;
      })
    );
    expect(await lookupGeo('203.0.113.9')).toEqual({ country: null, region: null, city: null });
  });
});


// ─────────────────────────────────────────────────────────────────────────────
// SessionService step-up (Item 9)
// ─────────────────────────────────────────────────────────────────────────────
describe('Item 9 — SessionService.createSession step-up', () => {
  beforeAll(() => {
    process.env.MONGODB_URI = 'mongodb://localhost:27017/test';
    process.env.SESSION_SECRET = 'test-session-secret-at-least-thirty-two-chars!!';
    process.env.APP_URL = 'http://localhost:3000';
  });

  beforeEach(() => {
    stores.sessions.clear();
    stores.refreshes.clear();
    stores.user = makeUser();
    stores.devices.clear();
    deviceBehavior.isNew = false;
    deviceBehavior.countryChanged = false;
    deviceBehavior.throwOnRegister = false;
    delete process.env.GEOIP_LOOKUP_URL;
  });

  async function createWith(device: { serverDeviceId: ObjectId | null; clientDeviceId: string | null }) {
    const service = new SessionService();
    return service.createSession(new ObjectId(), '203.0.113.9', 'test-agent', 'password', {
      ...device,
      hasServerToken: device.serverDeviceId !== null,
    });
  }

  it('ACCEPTANCE: step-up is OFF by default — new device yields a normal authenticated session (no revocation)', async () => {
    delete process.env.STEP_UP_ENABLED;
    deviceBehavior.isNew = true;

    const result = await createWith({ serverDeviceId: new ObjectId(), clientDeviceId: null });
    expect(result.status).toBe('authenticated');
    expect(stores.sessions.size).toBe(1);
    expect([...stores.sessions.values()][0].revoked).toBe(false);
  });

  it('ACCEPTANCE: when STEP_UP_ENABLED=true, a NEW device triggers step_up and the session is revoked', async () => {
    process.env.STEP_UP_ENABLED = 'true';
    deviceBehavior.isNew = true;

    const result = await createWith({ serverDeviceId: new ObjectId(), clientDeviceId: null });
    expect(result.status).toBe('step_up');
    expect('userId' in result).toBe(true);
    // Session + refresh created then immediately revoked → no usable session.
    expect(stores.sessions.size).toBe(1);
    expect([...stores.sessions.values()][0].revoked).toBe(true);
  });

  it('ACCEPTANCE: when STEP_UP_ENABLED=true, a country change (resolvable) triggers step_up', async () => {
    process.env.STEP_UP_ENABLED = 'true';
    deviceBehavior.isNew = false;
    deviceBehavior.countryChanged = true;
    // Country change only fires when geo is resolvable; stub the lookup.
    process.env.GEOIP_LOOKUP_URL = 'https://geo.test/lookup?ip=';
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ country: 'FR' }), { status: 200 })));

    const result = await createWith({ serverDeviceId: new ObjectId(), clientDeviceId: null });
    expect(result.status).toBe('step_up');
  });

  it('never blocks login when device registration throws (fail open, no step-up)', async () => {
    process.env.STEP_UP_ENABLED = 'true';
    deviceBehavior.throwOnRegister = true;

    const result = await createWith({ serverDeviceId: new ObjectId(), clientDeviceId: null });
    expect(result.status).toBe('authenticated');
  });

  it('does not step up when STEP_UP_ENABLED=true but there is no positive signal', async () => {
    process.env.STEP_UP_ENABLED = 'true';
    deviceBehavior.isNew = false;
    deviceBehavior.countryChanged = false;

    const result = await createWith({ serverDeviceId: new ObjectId(), clientDeviceId: null });
    expect(result.status).toBe('authenticated');
  });

  afterEach(() => {
    vi.restoreAllMocks();
    delete process.env.STEP_UP_ENABLED;
  });
});

