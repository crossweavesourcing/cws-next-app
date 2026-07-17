import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ObjectId } from 'mongodb';

/**
 * Unit test for the 2FA verification rate limit (Implementation 15).
 *
 * It exercises the REAL enforcement logic in `verify2faActionImpl`:
 *   - the failed-attempt counter is persisted in an in-memory `login_attempts`
 *     collection (mirroring MongoDB semantics), and
 *   - after N (5) failed verifications the N+1th is rejected with a generic
 *     error and the pending cookie is cleared (force re-auth).
 *
 * No Redis, no real DB, no network. The counter is the same code path the
 * production MongoDB-backed repository uses.
 */

// ─── In-memory login_attempts store, faithful to MongoDB count/insert. ────────
const stores = vi.hoisted(() => ({
  attempts: [] as Array<{
    _id: ObjectId;
    userId: ObjectId | null;
    identifierType: string;
    identifier: string;
    ipAddress: string;
    userAgent: string | null;
    device: string | null;
    success: boolean;
    failureReason: string | null;
    lockExpiresAt: Date | null;
    createdAt: Date;
  }>,
  cookies: new Map<string, { value: string; opts: Record<string, unknown> }>(),
  clientIp: '203.0.113.9',
}));

vi.mock('@/database', () => ({
  getDb: async () => ({}),
  getLoginAttemptsCollection: async () => ({
    async insertOne(doc: Record<string, unknown>) {
      stores.attempts.push({
        _id: new ObjectId(),
        userId: doc.userId as ObjectId | null,
        identifierType: doc.identifierType as string,
        identifier: doc.identifier as string,
        ipAddress: doc.ipAddress as string,
        userAgent: (doc.userAgent as string) ?? null,
        device: (doc.device as string) ?? null,
        success: doc.success as boolean,
        failureReason: (doc.failureReason as string) ?? null,
        lockExpiresAt: (doc.lockExpiresAt as Date) ?? null,
        createdAt: doc.createdAt ? new Date(doc.createdAt as Date) : new Date(),
      });
      return { insertedId: new ObjectId() };
    },
    async countDocuments(filter: Record<string, unknown>) {
      const now = Date.now();
      let n = 0;
      for (const a of stores.attempts) {
        if (filter.identifier && a.identifier !== filter.identifier) continue;
        if (filter.success === false && a.success !== false) continue;
        if (filter.ipAddress && a.ipAddress !== filter.ipAddress) continue;
        if (filter.identifierType && a.identifierType !== filter.identifierType) continue;
        const createdAt = a.createdAt.getTime();
        const win = filter.createdAt as { $gte?: Date } | undefined;
        if (win?.$gte && createdAt < win.$gte.getTime()) continue;
        // sanity: only count attempts within the last hour of the test
        if (now - createdAt > 60 * 60 * 1000) continue;
        n++;
      }
      return n;
    },
  }),
}));

// getClientIp → fixed test IP. Also stub assertSameOrigin (used by the
// withCsrfGuard wrapper) so the test is not gated by origin checks.
vi.mock('@/auth/lib/request', () => ({
  getClientIp: async () => stores.clientIp,
  assertSameOrigin: async () => {},
  CsrfError: class extends Error {},
}));

// TwoFactorService.verify → always fails (simulates a wrong code).
vi.mock('@/auth/services/two-factor.service', () => ({
  TwoFactorService: class {
    async verify() {
      return false;
    }
    async sendCode() {}
  },
}));

// UserRepository / SessionService / device — not exercised on the failure path.
vi.mock('@/auth/repositories/user.repository', () => ({
  UserRepository: class {
    async findById() {
      return { _id: new ObjectId(), status: 'active', security: {}, profile: {} };
    }
  },
}));
vi.mock('@/auth/services/session.service', () => ({
  SessionService: class {
    async createSession() {
      return { status: 'authenticated', sessionCookie: 's', refreshToken: 'r', deviceObjectId: null };
    }
  },
}));
vi.mock('@/auth/lib/device', () => ({
  ensureDeviceId: async () => 'dev',
  setServerDeviceToken: async () => {},
}));

// next/headers: mock cookies() (with a valid signed pending cookie) + headers().
const SESSION_SECRET = 'unit_test_secret_that_is_long_enough_32b';
vi.mock('next/headers', async () => {
  const { signSessionId } = await import('@/auth/crypto/token');
  const userId = new ObjectId('665f1a2b3c4d5e6f70819293');
  const pending = signSessionId(userId.toString(), SESSION_SECRET);
  const cookieMap = new Map<string, { value: string }>([
    ['cws_2fa_pending', { value: pending }],
  ]);
  const cookieStore = {
    get: (k: string) => cookieMap.get(k) ?? null,
    set: (k: string, v: string, opts: Record<string, unknown>) => {
      stores.cookies.set(k, { value: v, opts });
    },
  };
  return {
    cookies: async () => cookieStore,
    headers: async () => ({
      get: (k: string) => (k === 'user-agent' ? 'test-agent' : null),
    }),
  };
});

vi.mock('@/auth/lib/cookies', () => ({
  setAuthCookies: async () => {},
  clearingCookieOpts: () => ({ httpOnly: true, secure: false, sameSite: 'strict', path: '/', expires: new Date(0) }),
}));

// getEnv → minimal shape with SESSION_SECRET.
vi.mock('@/auth/config/env', () => ({
  getEnv: () => ({ SESSION_SECRET, APP_URL: 'http://localhost:3000' }),
}));

const { verify2faAction } = await import('./verify-2fa');

const TWO_FA_MAX_FAILS = 5;

function failFormData(): FormData {
  const fd = new FormData();
  fd.set('code', '000000');
  return fd;
}

describe('verify2faAction — rate limiting', () => {
  beforeEach(() => {
    stores.attempts.length = 0;
    stores.cookies.clear();
  });

  it('blocks the N+1th failed 2FA attempt and forces re-auth', async () => {
    // First N attempts should be "rejected with the wrong-code" message but
    // still counted (each returns the generic invalid-code error).
    for (let i = 0; i < TWO_FA_MAX_FAILS; i++) {
      const res = await verify2faAction({}, failFormData());
      expect(res.error).toBeDefined();
      expect(res.error).not.toContain('Too many attempts');
    }

    // Counter must reflect exactly N recorded failures.
    expect(stores.attempts.filter((a) => a.success === false).length).toBe(TWO_FA_MAX_FAILS);

    // N+1th attempt → rejected with the generic rate-limit error.
    const blocked = await verify2faAction({}, failFormData());
    expect(blocked.error).toContain('Too many attempts');

    // The pending cookie must be cleared (force re-auth), not just looped on.
    const cleared = stores.cookies.get('cws_2fa_pending');
    expect(cleared).toBeDefined();
    expect(cleared?.value).toBe('');
  });

  it('does not block before the threshold is reached', async () => {
    for (let i = 0; i < TWO_FA_MAX_FAILS - 1; i++) {
      const res = await verify2faAction({}, failFormData());
      expect(res.error).toBeDefined();
      expect(res.error).not.toContain('Too many attempts');
    }
  });
});
