import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

/**
 * Tests for Implementation Prompt 14 — `isSecureCookies()` single source of truth.
 *
 * Acceptance criteria covered:
 *   - C2: a single helper drives every auth cookie's `secure` flag.
 *   - C4: local dev (no SECURE_COOKIES var) still resolves to `false` when
 *     NODE_ENV is not 'production' (cookies work over plain HTTP).
 *   - C5: SECURE_COOKIES='true' -> true, SECURE_COOKIES='false' -> false, and when
 *     unset the helper falls back to `NODE_ENV === 'production'`.
 *
 * No Redis / shared state — only env vars + the helper are exercised.
 *
 * NOTE: `getEnv()` memoizes its parsed result, so we mock it to RE-COMPUTE
 * SECURE_COOKIES from process.env on every call, and we control process.env
 * (including the read-only NODE_ENV) via vitest's `vi.stubEnv`.
 */

// Mock the env module so SECURE_COOKIES is read live from process.env.
vi.mock('@/auth/config/env', () => ({
  getEnv: () => ({
    MONGODB_URI: 'mongodb://localhost:27017/test',
    SESSION_SECRET: 'test-session-secret-at-least-thirty-two-chars!!',
    APP_URL: 'http://localhost:3000',
    ACCESS_SESSION_TTL_MS: 15 * 60 * 1000,
    REFRESH_TOKEN_TTL_MS: 7 * 24 * 60 * 60 * 1000,
    SECURE_COOKIES:
      process.env.SECURE_COOKIES === undefined
        ? undefined
        : process.env.SECURE_COOKIES === 'true',
  }),
}));

// Imported AFTER the mock is registered.
const { isSecureCookies } = await import('@/auth/lib/cookies');

describe('isSecureCookies() — explicit SECURE_COOKIES control', () => {
  beforeEach(() => {
    // Start each test from a clean, non-production baseline.
    vi.stubEnv('SECURE_COOKIES', '');
    delete process.env.SECURE_COOKIES;
    vi.stubEnv('NODE_ENV', 'development');
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('returns true when SECURE_COOKIES=true (explicit, fail-closed)', () => {
    vi.stubEnv('SECURE_COOKIES', 'true');
    vi.stubEnv('NODE_ENV', 'development'); // even in dev, explicit true wins
    expect(isSecureCookies()).toBe(true);
  });

  it('returns false when SECURE_COOKIES=false (explicit, allows local HTTP)', () => {
    vi.stubEnv('SECURE_COOKIES', 'false');
    vi.stubEnv('NODE_ENV', 'production'); // explicit false overrides production default
    expect(isSecureCookies()).toBe(false);
  });

  it('falls back to false in dev when SECURE_COOKIES is unset (works over HTTP)', () => {
    delete process.env.SECURE_COOKIES;
    vi.stubEnv('NODE_ENV', 'development');
    expect(isSecureCookies()).toBe(false);
  });

  it('falls back to true in production when SECURE_COOKIES is unset', () => {
    delete process.env.SECURE_COOKIES;
    vi.stubEnv('NODE_ENV', 'production');
    expect(isSecureCookies()).toBe(true);
  });
});
