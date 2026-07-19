import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

/**
 * Verifies Acceptance Criterion 1 against the REAL env module:
 * in production, `getEnv()` (via `validateSecurityConfig`) REFUSES TO BOOT
 * when SECURE_COOKIES is not explicitly `'true'`. This is the fail-closed
 * guard for the cookie `Secure` flag (Item 14).
 *
 * The real `env.ts` memoizes its parsed result in `cachedEnv`, so we reset the
 * module registry between cases and control NODE_ENV / SECURE_COOKIES (plus the
 * other required production vars) via `vi.stubEnv` BEFORE each (re)import.
 * No Redis / shared state.
 */

// Base vars required by envSchema for BOTH dev and prod (MONGODB_URI,
// SESSION_SECRET, APP_URL are non-optional). These let `getEnv()` reach the
// SECURE_COOKIES fail-closed guard so we can assert on it specifically.
function stubBaseEnv() {
  vi.stubEnv('MONGODB_URI', 'mongodb://localhost:27017/test');
  vi.stubEnv('SESSION_SECRET', 'test-session-secret-at-least-thirty-two-chars!!');
  vi.stubEnv('APP_URL', 'https://example.com');
  vi.stubEnv('ARGON2_SECRET', 'argon2_secret_pepper_min_16');
  vi.stubEnv('ADMIN_SEED_PASSWORD', 'SeedPassword123!');
  vi.stubEnv('TRUSTED_PROXY_IP_HEADER', 'x-vercel-proxied-for');
}

describe('SECURE_COOKIES fail-closed production boot guard (real env.ts)', () => {
  beforeEach(() => {
    vi.resetModules();
    stubBaseEnv();
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('SECURE_COOKIES', '');
    delete process.env.SECURE_COOKIES;
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it('throws when NODE_ENV=production and SECURE_COOKIES is unset', async () => {
    delete process.env.SECURE_COOKIES;
    vi.stubEnv('NODE_ENV', 'production');
    const { getEnv } = await import('@/auth/config/env');
    expect(() => getEnv()).toThrow(/SECURE_COOKIES/);
  });

  it('throws when NODE_ENV=production and SECURE_COOKIES=false', async () => {
    vi.stubEnv('SECURE_COOKIES', 'false');
    vi.stubEnv('NODE_ENV', 'production');
    const { getEnv } = await import('@/auth/config/env');
    expect(() => getEnv()).toThrow(/SECURE_COOKIES/);
  });

  it('does NOT throw when NODE_ENV=production and SECURE_COOKIES=true', async () => {
    vi.stubEnv('SECURE_COOKIES', 'true');
    vi.stubEnv('NODE_ENV', 'production');
    const { getEnv } = await import('@/auth/config/env');
    expect(() => getEnv()).not.toThrow();
    expect(getEnv().SECURE_COOKIES).toBe(true);
  });

  it('does NOT throw in dev when SECURE_COOKIES is unset (local HTTP works)', async () => {
    delete process.env.SECURE_COOKIES;
    // Dev boot. The zod SCHEMA still requires valid-shaped values for the
    // non-optional/length-constrained vars (mirrors the committed .env.example
    // placeholders), but the prod-only fail-closed guards are warn-only, so
    // boot succeeds and SECURE_COOKIES resolves to `undefined` (→ dev = false).
    vi.stubEnv('NODE_ENV', 'development');
    vi.stubEnv('ARGON2_SECRET', 'argon2_secret_pepper_min_16');
    vi.stubEnv('ADMIN_SEED_PASSWORD', 'SeedPassword123!');
    vi.stubEnv('TRUSTED_PROXY_IP_HEADER', 'x-vercel-proxied-for');
    const { getEnv } = await import('@/auth/config/env');
    expect(() => getEnv()).not.toThrow();
    // Zod's `.optional().transform(v => v === 'true')` yields `false` (not
    // `undefined`) when unset; `isSecureCookies()` then does
    // `false ?? (NODE_ENV==='production')` → `false` in dev, so cookies work
    // over plain HTTP. (The production guard still throws because `false !== true`.)
    expect(getEnv().SECURE_COOKIES).toBe(false);
  });

  it('treats an empty optional admin seed password as unset in development', async () => {
    vi.stubEnv('NODE_ENV', 'development');
    vi.stubEnv('ADMIN_SEED_PASSWORD', '');
    const { getEnv } = await import('@/auth/config/env');

    expect(() => getEnv()).not.toThrow();
    expect(getEnv().ADMIN_SEED_PASSWORD).toBeUndefined();
  });

  it('still rejects an empty admin seed password in production', async () => {
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('SECURE_COOKIES', 'true');
    vi.stubEnv('ADMIN_SEED_PASSWORD', '');
    const { getEnv } = await import('@/auth/config/env');

    expect(() => getEnv()).toThrow(/ADMIN_SEED_PASSWORD/);
  });

  it('derives WebAuthn RP config from APP_URL by default', async () => {
    vi.stubEnv('SECURE_COOKIES', 'true');
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('APP_URL', 'https://admin.example.com');
    const { getWebAuthnConfig } = await import('@/auth/config/env');

    expect(getWebAuthnConfig()).toMatchObject({
      rpID: 'admin.example.com',
      origin: 'https://admin.example.com',
    });
  });

  it('throws when production WebAuthn origin is not HTTPS', async () => {
    vi.stubEnv('SECURE_COOKIES', 'true');
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('WEBAUTHN_ORIGIN', 'http://admin.example.com');
    const { getEnv } = await import('@/auth/config/env');

    expect(() => getEnv()).toThrow(/WebAuthn origin must use HTTPS/i);
  });

  it('throws when WebAuthn RP ID is not valid for the origin host', async () => {
    vi.stubEnv('SECURE_COOKIES', 'true');
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('WEBAUTHN_ORIGIN', 'https://admin.example.com');
    vi.stubEnv('WEBAUTHN_RP_ID', 'evil.example.net');
    const { getEnv } = await import('@/auth/config/env');

    expect(() => getEnv()).toThrow(/WebAuthn RP ID/i);
  });

  it('rejects a WebAuthn origin containing a path', async () => {
    vi.stubEnv('SECURE_COOKIES', 'true');
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('WEBAUTHN_ORIGIN', 'https://admin.example.com/dashboard');
    const { getEnv } = await import('@/auth/config/env');

    expect(() => getEnv()).toThrow(/origin only/i);
  });
});
