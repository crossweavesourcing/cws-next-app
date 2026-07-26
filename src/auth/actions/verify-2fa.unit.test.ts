import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ObjectId } from 'mongodb';
import * as crypto from 'crypto';

/**
 * Unit test for the 2FA verification rate limit.
 */

const stores = vi.hoisted(() => ({
  pendingAuths: new Map<string, any>(),
  cookies: new Map<string, { value: string; opts: Record<string, unknown> }>(),
  clientIp: '203.0.113.9',
}));

const mockUserId = new ObjectId('665f1a2b3c4d5e6f70819293');
const opaqueToken = 'test_opaque_pending_token_32_bytes_hex';
const tokenHash = crypto.createHash('sha256').update(opaqueToken).digest('hex');

vi.mock('@/auth/repositories/pending-authentication.repository', () => ({
  PendingAuthenticationRepository: class {
    async findByTokenHash(hash: string) {
      if (hash !== tokenHash) return null;
      return stores.pendingAuths.get(hash) ?? null;
    }
    async decrementAttempts(id: ObjectId) {
      const doc = Array.from(stores.pendingAuths.values()).find(d => d._id.equals(id));
      if (doc) {
        doc.attemptsRemaining = Math.max(0, doc.attemptsRemaining - 1);
        return doc.attemptsRemaining;
      }
      return 0;
    }
    async consume(id: ObjectId) {
      const doc = Array.from(stores.pendingAuths.values()).find(d => d._id.equals(id));
      if (doc) {
        doc.consumedAt = new Date();
        return true;
      }
      return false;
    }
  },
}));

vi.mock('@/auth/lib/request', () => ({
  getClientIp: async () => stores.clientIp,
  assertSameOrigin: async () => {},
  CsrfError: class extends Error {},
}));

vi.mock('@/auth/services/two-factor.service', () => ({
  TwoFactorService: class {
    async verify() {
      return false;
    }
    async sendCode() {}
  },
}));

vi.mock('@/auth/repositories/user.repository', () => ({
  UserRepository: class {
    async findById() {
      return { _id: mockUserId, status: 'active', security: {}, profile: {} };
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

vi.mock('next/headers', async () => {
  const cookieMap = new Map<string, { value: string }>([
    ['cws_2fa_pending', { value: opaqueToken }],
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

vi.mock('@/auth/config/env', () => ({
  getEnv: () => ({ SESSION_SECRET: 'unit_test_secret', APP_URL: 'http://localhost:3000' }),
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
    stores.pendingAuths.clear();
    stores.cookies.clear();

    stores.pendingAuths.set(tokenHash, {
      _id: new ObjectId(),
      userId: mockUserId,
      primaryAuthenticationMethod: 'password',
      requiredAction: 'require_2fa',
      tokenHash,
      attemptsRemaining: TWO_FA_MAX_FAILS,
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + 15 * 60 * 1000),
      consumedAt: null,
    });
  });

  it('blocks the N+1th failed 2FA attempt and forces re-auth', async () => {
    for (let i = 0; i < TWO_FA_MAX_FAILS; i++) {
      const res = await verify2faAction({}, failFormData());
      expect(res.error).toBeDefined();
    }

    const blocked = await verify2faAction({}, failFormData());
    expect(blocked.error).toContain('Too many attempts');

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
