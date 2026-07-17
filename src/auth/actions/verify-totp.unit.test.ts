import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ObjectId } from 'mongodb';

const stores = vi.hoisted(() => ({
  attempts: [] as Array<{
    userId: ObjectId | null;
    identifierType: string;
    identifier: string;
    ipAddress: string;
    userAgent: string | null;
    success: boolean;
    failureReason: string | null;
    createdAt: Date;
  }>,
  cookies: new Map<string, { value: string; opts: Record<string, unknown> }>(),
}));

vi.mock('@/database', () => ({
  withRetry: async <T>(fn: () => Promise<T>) => fn(),
  getLoginAttemptsCollection: async () => ({
    async insertOne(doc: Record<string, unknown>) {
      stores.attempts.push({
        userId: doc.userId as ObjectId | null,
        identifierType: doc.identifierType as string,
        identifier: doc.identifier as string,
        ipAddress: doc.ipAddress as string,
        userAgent: (doc.userAgent as string) ?? null,
        success: doc.success as boolean,
        failureReason: (doc.failureReason as string) ?? null,
        createdAt: new Date(),
      });
      return { insertedId: new ObjectId() };
    },
    async countDocuments(filter: Record<string, unknown>) {
      const createdAt = filter.createdAt as { $gte?: Date } | undefined;
      return stores.attempts.filter((attempt) => {
        if (filter.identifier && attempt.identifier !== filter.identifier) return false;
        if (filter.success === false && attempt.success !== false) return false;
        if (createdAt?.$gte && attempt.createdAt < createdAt.$gte) return false;
        return true;
      }).length;
    },
  }),
  getAuditLogsCollection: async () => ({
    async insertOne() {
      return { insertedId: new ObjectId() };
    },
  }),
}));

vi.mock('@/auth/lib/request', () => ({
  getClientIp: async () => '203.0.113.10',
  assertSameOrigin: async () => {},
  CsrfError: class extends Error {},
}));

vi.mock('@/auth/services/mfa.service', () => ({
  MfaService: class {
    async verifyTotpLogin() {
      return false;
    }
  },
}));

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
  ensureDeviceId: async () => null,
  setServerDeviceToken: async () => {},
}));

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

vi.mock('@/auth/config/env', () => ({
  getEnv: () => ({ SESSION_SECRET, APP_URL: 'http://localhost:3000' }),
}));

const { verifyTotpAction } = await import('./verify-totp');

function formData(): FormData {
  const fd = new FormData();
  fd.set('code', '000000');
  return fd;
}

describe('verifyTotpAction — rate limiting', () => {
  beforeEach(() => {
    stores.attempts.length = 0;
    stores.cookies.clear();
  });

  it('blocks the 6th failed TOTP attempt and clears the pending cookie', async () => {
    for (let i = 0; i < 5; i++) {
      const res = await verifyTotpAction({}, formData());
      expect(res.error).toBeDefined();
      expect(res.error).not.toContain('Too many attempts');
    }

    const blocked = await verifyTotpAction({}, formData());
    expect(blocked.error).toContain('Too many attempts');
    expect(stores.cookies.get('cws_2fa_pending')?.value).toBe('');
  });
});
