import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as crypto from 'crypto';
import { OAuthService, __resetJwksCacheForTest } from './oauth.service';
import { OAuthProviderUnavailableError } from '../errors/auth-errors';

/**
 * Unit tests for Implementation Prompt 21 — JWKS caching + serverless-safe
 * token verification in `OAuthService.verifyIdToken`.
 *
 * Acceptance criteria covered:
 *   - C1: repeated callbacks within the cache window don't refetch (spy on fetch).
 *   - C2: a `kid` not in the cached set triggers a fresh fetch (key rotation)
 *         rather than a rejected login.
 *   - C3: a Google outage during fetch yields a clear, safe error
 *         (OAuthProviderUnavailableError); never accept-without-verify.
 *   - C4: signature / nonce / aud / iss verification is always enforced.
 *   - C5: the in-memory cache is explicitly non-authoritative (resettable).
 *
 * The cache is module-level and non-authoritative, so we reset it between
 * tests via `__resetJwksCacheForTest()` (mirrors a cold start). We spy on the
 * global `fetch` so no real network call is made.
 */

const GOOGLE_JWKS_URL = 'https://www.googleapis.com/oauth2/v3/certs';
const CLIENT_ID = 'test-google-client-id.apps.googleusercontent.com';

// Build a real RSA key pair and expose `{ kid, n, e }` as a JWK (public part).
function makeRsaKey(kid: string) {
  const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
    modulusLength: 2048,
  });
  const jwk = publicKey.export({ format: 'jwk' }) as { n: string; e: string };
  return {
    kid,
    jwk, // { n, e }
    privateKey,
  };
}

function base64url(input: Buffer | string): string {
  return Buffer.from(input)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

/** Sign a JWT header/payload with the given RSA private key. */
function signJwt(header: Record<string, unknown>, payload: Record<string, unknown>, privateKey: crypto.KeyObject): string {
  const headerB64 = base64url(JSON.stringify(header));
  const payloadB64 = base64url(JSON.stringify(payload));
  const signingInput = `${headerB64}.${payloadB64}`;
  const signature = crypto.sign('RSA-SHA256', Buffer.from(signingInput), privateKey);
  return `${signingInput}.${base64url(signature)}`;
}

function makeIdToken(kid: string, privateKey: crypto.KeyObject, overrides: Record<string, unknown> = {}) {
  const now = Math.floor(Date.now() / 1000);
  return signJwt(
    { alg: 'RS256', typ: 'JWT', kid },
    {
      iss: 'https://accounts.google.com',
      aud: CLIENT_ID,
      exp: now + 3600,
      iat: now,
      nonce: 'expected-nonce',
      sub: 'google-sub-123',
      email: 'admin@example.com',
      email_verified: true,
      ...overrides,
    },
    privateKey
  );
}

function jwksResponse(keys: Array<{ kid: string; n: string; e: string }>, cacheControl = 'max-age=3600') {
  return {
    ok: true,
    status: 200,
    headers: { get: (h: string) => (h.toLowerCase() === 'cache-control' ? cacheControl : null) },
    json: async () => ({ keys }),
  } as unknown as Response;
}

function fakeEnv() {
  return {
    GOOGLE_CLIENT_ID: CLIENT_ID,
    GOOGLE_CLIENT_SECRET: 'secret',
    GOOGLE_REDIRECT_URI: 'https://app.example.com/api/auth/callback/google',
  } as unknown as ReturnType<typeof import('../config/env').getEnv>;
}

describe('OAuthService.verifyIdToken — JWKS cache (Prompt 21)', () => {
  let fetchSpy: any;
  let keyA: ReturnType<typeof makeRsaKey>;
  let keyB: ReturnType<typeof makeRsaKey>;

  beforeEach(() => {
    __resetJwksCacheForTest();
    keyA = makeRsaKey('kid-A');
    keyB = makeRsaKey('kid-B');
    // Default: JWKS returns keyA only.
    fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      jwksResponse([{ kid: keyA.kid, ...keyA.jwk }])
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('C1: second verification within the cache window does NOT refetch', async () => {
    const service = new OAuthService();
    const env = fakeEnv();

    const token1 = makeIdToken(keyA.kid, keyA.privateKey);
    const profile1 = await (service as any).verifyIdToken(token1, env, 'expected-nonce');
    expect(profile1.sub).toBe('google-sub-123');

    // Second verify (same kid, same cache window) — should reuse cache.
    const token2 = makeIdToken(keyA.kid, keyA.privateKey);
    await (service as any).verifyIdToken(token2, env, 'expected-nonce');

    // One fetch for the first verify; the second must hit the cache.
    const jwksCalls = fetchSpy.mock.calls.filter((c: any) => String(c[0]).includes(GOOGLE_JWKS_URL));
    expect(jwksCalls.length).toBe(1);
  });

  it('C2: a missing kid (key rotation) triggers a fresh fetch and verifies', async () => {
    const service = new OAuthService();
    const env = fakeEnv();

    // First call seeds cache with only keyA.
    await (service as any).verifyIdToken(
      makeIdToken(keyA.kid, keyA.privateKey),
      env,
      'expected-nonce'
    );

    // Now Google rotates: the next JWKS response contains only keyB.
    fetchSpy.mockResolvedValue(jwksResponse([{ kid: keyB.kid, ...keyB.jwk }]));

    // A token signed by keyB (not in cached set) must trigger a refetch and
    // verify successfully — NOT be rejected as an unknown kid.
    const rotatedToken = makeIdToken(keyB.kid, keyB.privateKey);
    const profile = await (service as any).verifyIdToken(rotatedToken, env, 'expected-nonce');

    expect(profile.sub).toBe('google-sub-123');
    const jwksCalls = fetchSpy.mock.calls.filter((c: any) => String(c[0]).includes(GOOGLE_JWKS_URL));
    expect(jwksCalls.length).toBe(2);
  });

  it('C3: a Google outage during fetch yields a safe OAuthProviderUnavailableError', async () => {
    const service = new OAuthService();
    const env = fakeEnv();

    fetchSpy.mockRejectedValue(new Error('network down'));

    await expect(
      (service as any).verifyIdToken(makeIdToken(keyA.kid, keyA.privateKey), env, 'expected-nonce')
    ).rejects.toBeInstanceOf(OAuthProviderUnavailableError);
  });

  it('C3: a non-200 JWKS response fails safe (no accept-without-verify)', async () => {
    const service = new OAuthService();
    const env = fakeEnv();

    fetchSpy.mockResolvedValue({
      ok: false,
      status: 503,
      headers: { get: () => null },
      json: async () => ({}),
    } as unknown as Response);

    await expect(
      (service as any).verifyIdToken(makeIdToken(keyA.kid, keyA.privateKey), env, 'expected-nonce')
    ).rejects.toBeInstanceOf(OAuthProviderUnavailableError);
  });

  it('C4: signature is always verified (tampered token is rejected)', async () => {
    const service = new OAuthService();
    const env = fakeEnv();

    const good = makeIdToken(keyA.kid, keyA.privateKey);
    const [h, p, s] = good.split('.');
    const tampered = `${h}.${p}.${s.slice(0, -2)}AA`; // corrupt signature

    await expect((service as any).verifyIdToken(tampered, env, 'expected-nonce')).rejects.toThrow(
      /signature verification failed/i
    );
  });

  it('C4: nonce mismatch is rejected (replay protection intact)', async () => {
    const service = new OAuthService();
    const env = fakeEnv();

    const token = makeIdToken(keyA.kid, keyA.privateKey, { nonce: 'wrong-nonce' });
    await expect((service as any).verifyIdToken(token, env, 'expected-nonce')).rejects.toThrow(
      /nonce mismatch/i
    );
  });

  it('C4: wrong audience is rejected', async () => {
    const service = new OAuthService();
    const env = fakeEnv();

    const token = makeIdToken(keyA.kid, keyA.privateKey, { aud: 'some-other-client' });
    await expect((service as any).verifyIdToken(token, env, 'expected-nonce')).rejects.toThrow(
      /aud/i
    );
  });

  it('C4: wrong issuer is rejected', async () => {
    const service = new OAuthService();
    const env = fakeEnv();

    const token = makeIdToken(keyA.kid, keyA.privateKey, { iss: 'https://evil.example.com' });
    await expect((service as any).verifyIdToken(token, env, 'expected-nonce')).rejects.toThrow(/iss/i);
  });

  it('C5: cache honors max-age — after expiry a fresh fetch occurs', async () => {
    const service = new OAuthService();
    const env = fakeEnv();

    // Short max-age (1s) so the cache expires quickly.
    fetchSpy.mockResolvedValue(jwksResponse([{ kid: keyA.kid, ...keyA.jwk }], 'max-age=1'));

    await (service as any).verifyIdToken(makeIdToken(keyA.kid, keyA.privateKey), env, 'expected-nonce');

    // Wait past the 1s max-age window.
    await new Promise((r) => setTimeout(r, 1100));

    await (service as any).verifyIdToken(makeIdToken(keyA.kid, keyA.privateKey), env, 'expected-nonce');

    const jwksCalls = fetchSpy.mock.calls.filter((c: any) => String(c[0]).includes(GOOGLE_JWKS_URL));
    expect(jwksCalls.length).toBe(2);
  });
});
