import { describe, it, expect, beforeEach, vi } from 'vitest';
import { RateLimitError } from '../errors/auth-errors';
import { UNTRUSTED_IP_SENTINEL } from '../lib/ip';

// ─── In-memory login-attempt store, shared with the mocked repository. ─────────
type Attempt = {
  ipAddress: string;
  identifier: string;
  success: boolean;
  createdAt: Date;
  lockExpiresAt: Date | null;
};

const stores = vi.hoisted(() => ({
  attempts: [] as {
    ipAddress: string;
    identifier: string;
    success: boolean;
    createdAt: Date;
    lockExpiresAt: Date | null;
  }[],
}));

// Mock the repository with in-memory behavior mirroring the real Mongo queries
// (failed attempts within a time window, and active lockouts by identifier).
vi.mock('../repositories/login-attempt.repository', () => ({
  LoginAttemptRepository: class {
    async countRecentByIp(ip: string, windowMs: number) {
      const threshold = Date.now() - windowMs;
      return stores.attempts.filter(
        (a) => a.ipAddress === ip && !a.success && a.createdAt.getTime() >= threshold
      ).length;
    }
    async countRecentByIdentifier(identifier: string, windowMs: number) {
      const threshold = Date.now() - windowMs;
      const id = identifier.trim().toLowerCase();
      return stores.attempts.filter(
        (a) => a.identifier === id && !a.success && a.createdAt.getTime() >= threshold
      ).length;
    }
    async getActiveLockout(identifier: string): Promise<Date | null> {
      const now = Date.now();
      const id = identifier.trim().toLowerCase();
      const active = stores.attempts
        .filter((a) => a.identifier === id && a.lockExpiresAt && a.lockExpiresAt.getTime() > now)
        .sort((a, b) => b.lockExpiresAt!.getTime() - a.lockExpiresAt!.getTime());
      return active[0]?.lockExpiresAt ?? null;
    }
  },
}));

// Import AFTER the mock so the service picks up the mocked repository.
import { RateLimitService } from './rate-limit.service';

function seedFailure(opts: Partial<Attempt> & { ipAddress: string; identifier: string }) {
  stores.attempts.push({
    success: false,
    createdAt: new Date(),
    lockExpiresAt: null,
    ...opts,
    identifier: opts.identifier.trim().toLowerCase(),
  });
}

describe('RateLimitService.checkRateLimit', () => {
  beforeEach(() => {
    stores.attempts.length = 0;
  });

  it('does NOT block a fresh real user after 30 failed logins across 30 different emails (untrusted sentinel IP)', async () => {
    const service = new RateLimitService();

    // Simulate 30 distinct users each failing once — all coming through the
    // untrusted sentinel IP (prod-without-trusted-proxy / dev fallback). This
    // used to accumulate into one global 0.0.0.0 bucket and lock out everyone.
    for (let i = 0; i < 30; i++) {
      seedFailure({ ipAddress: UNTRUSTED_IP_SENTINEL, identifier: `user${i}@example.com` });
    }

    // The 31st real user (never failed before) must still be allowed.
    await expect(
      service.checkRateLimit(UNTRUSTED_IP_SENTINEL, 'user31@example.com')
    ).resolves.toBeUndefined();
  });

  it('still enforces the per-identifier limit even when the IP is the untrusted sentinel', async () => {
    const service = new RateLimitService();

    // 10 failures for the SAME email (IDENTIFIER_MAX_ATTEMPTS = 10) via sentinel IP.
    for (let i = 0; i < 10; i++) {
      seedFailure({ ipAddress: UNTRUSTED_IP_SENTINEL, identifier: 'victim@example.com' });
    }

    await expect(
      service.checkRateLimit(UNTRUSTED_IP_SENTINEL, 'victim@example.com')
    ).rejects.toBeInstanceOf(RateLimitError);
  });

  it('still enforces the per-IP limit for a real, resolvable IP', async () => {
    const service = new RateLimitService();

    // 20 failures from one real IP (IP_MAX_ATTEMPTS = 20) across different emails.
    for (let i = 0; i < 20; i++) {
      seedFailure({ ipAddress: '203.0.113.7', identifier: `user${i}@example.com` });
    }

    await expect(
      service.checkRateLimit('203.0.113.7', 'newuser@example.com')
    ).rejects.toBeInstanceOf(RateLimitError);
  });

  it('a burst from 30 distinct real IPs does not trigger a platform-wide lockout', async () => {
    const service = new RateLimitService();

    // 30 different real IPs each fail once for a different email.
    for (let i = 0; i < 30; i++) {
      seedFailure({ ipAddress: `198.51.100.${i}`, identifier: `user${i}@example.com` });
    }

    // A fresh user from a fresh real IP is unaffected.
    await expect(
      service.checkRateLimit('198.51.100.200', 'fresh@example.com')
    ).resolves.toBeUndefined();
  });

  it('rejects when an active account lockout exists for the identifier', async () => {
    const service = new RateLimitService();

    seedFailure({
      ipAddress: '203.0.113.8',
      identifier: 'locked@example.com',
      lockExpiresAt: new Date(Date.now() + 5 * 60 * 1000),
    });

    await expect(
      service.checkRateLimit('203.0.113.8', 'locked@example.com')
    ).rejects.toBeInstanceOf(RateLimitError);
  });

  it('allows a normal login with a real IP and no prior failures', async () => {
    const service = new RateLimitService();
    await expect(
      service.checkRateLimit('203.0.113.9', 'ok@example.com')
    ).resolves.toBeUndefined();
  });
});
