import { describe, it, expect, beforeEach, afterEach, vi, type MockInstance } from 'vitest';
import * as crypto from 'crypto';
import { OAuthService, __resetJwksCacheForTest, type GoogleProfile } from './oauth.service';
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

type TestEnv = ReturnType<typeof fakeEnv>;
type OAuthServiceHarness = {
  verifyIdToken(idToken: string, env: TestEnv, expectedNonce: string): Promise<GoogleProfile>;
  exchangeCode(code: string, codeVerifier: string, env: TestEnv): Promise<{ id_token: string }>;
};

function verifyIdToken(
  service: OAuthService,
  idToken: string,
  env: TestEnv,
  expectedNonce = 'expected-nonce'
) {
  return (service as unknown as OAuthServiceHarness).verifyIdToken(idToken, env, expectedNonce);
}

function exchangeCode(service: OAuthService, env: TestEnv) {
  return (service as unknown as OAuthServiceHarness).exchangeCode('oauth-code', 'pkce-verifier', env);
}

describe('OAuthService.verifyIdToken — JWKS cache (Prompt 21)', () => {
  let fetchSpy: MockInstance<typeof globalThis.fetch>;
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
    const profile1 = await verifyIdToken(service, token1, env);
    expect(profile1.sub).toBe('google-sub-123');

    // Second verify (same kid, same cache window) — should reuse cache.
    const token2 = makeIdToken(keyA.kid, keyA.privateKey);
    await verifyIdToken(service, token2, env);

    // One fetch for the first verify; the second must hit the cache.
    const jwksCalls = fetchSpy.mock.calls.filter((call) => String(call[0]).includes(GOOGLE_JWKS_URL));
    expect(jwksCalls.length).toBe(1);
  });

  it('C2: a missing kid (key rotation) triggers a fresh fetch and verifies', async () => {
    const service = new OAuthService();
    const env = fakeEnv();

    // First call seeds cache with only keyA.
    await verifyIdToken(
      service,
      makeIdToken(keyA.kid, keyA.privateKey),
      env
    );

    // Now Google rotates: the next JWKS response contains only keyB.
    fetchSpy.mockResolvedValue(jwksResponse([{ kid: keyB.kid, ...keyB.jwk }]));

    // A token signed by keyB (not in cached set) must trigger a refetch and
    // verify successfully — NOT be rejected as an unknown kid.
    const rotatedToken = makeIdToken(keyB.kid, keyB.privateKey);
    const profile = await verifyIdToken(service, rotatedToken, env);

    expect(profile.sub).toBe('google-sub-123');
    const jwksCalls = fetchSpy.mock.calls.filter((call) => String(call[0]).includes(GOOGLE_JWKS_URL));
    expect(jwksCalls.length).toBe(2);
  });

  it('C3: a Google outage during fetch yields a safe OAuthProviderUnavailableError', async () => {
    const service = new OAuthService();
    const env = fakeEnv();

    fetchSpy.mockRejectedValue(new Error('network down'));

    await expect(
      verifyIdToken(service, makeIdToken(keyA.kid, keyA.privateKey), env)
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
      verifyIdToken(service, makeIdToken(keyA.kid, keyA.privateKey), env)
    ).rejects.toBeInstanceOf(OAuthProviderUnavailableError);
  });

  it('C4: signature is always verified (tampered token is rejected)', async () => {
    const service = new OAuthService();
    const env = fakeEnv();

    const good = makeIdToken(keyA.kid, keyA.privateKey);
    const [h, p, s] = good.split('.');
    const tampered = `${h}.${p}.${s.slice(0, -2)}AA`; // corrupt signature

    await expect(verifyIdToken(service, tampered, env)).rejects.toThrow(
      /signature verification failed/i
    );
  });

  it('C4: nonce mismatch is rejected (replay protection intact)', async () => {
    const service = new OAuthService();
    const env = fakeEnv();

    const token = makeIdToken(keyA.kid, keyA.privateKey, { nonce: 'wrong-nonce' });
    await expect(verifyIdToken(service, token, env)).rejects.toThrow(
      /nonce mismatch/i
    );
  });

  it('C4: wrong audience is rejected', async () => {
    const service = new OAuthService();
    const env = fakeEnv();

    const token = makeIdToken(keyA.kid, keyA.privateKey, { aud: 'some-other-client' });
    await expect(verifyIdToken(service, token, env)).rejects.toThrow(
      /aud/i
    );
  });

  it('C4: wrong issuer is rejected', async () => {
    const service = new OAuthService();
    const env = fakeEnv();

    const token = makeIdToken(keyA.kid, keyA.privateKey, { iss: 'https://evil.example.com' });
    await expect(verifyIdToken(service, token, env)).rejects.toThrow(/iss/i);
  });

  it('C4: issuer must be an exact Google issuer, not a substring match', async () => {
    const service = new OAuthService();
    const env = fakeEnv();

    const token = makeIdToken(keyA.kid, keyA.privateKey, {
      iss: 'https://accounts.google.com.evil.example.com',
    });
    await expect(verifyIdToken(service, token, env)).rejects.toThrow(/iss/i);
  });

  it('C4: non-RS256 alg is rejected before verification', async () => {
    const service = new OAuthService();
    const env = fakeEnv();

    const token = signJwt(
      { alg: 'HS256', typ: 'JWT', kid: keyA.kid },
      {
        iss: 'https://accounts.google.com',
        aud: CLIENT_ID,
        exp: Math.floor(Date.now() / 1000) + 3600,
        nonce: 'expected-nonce',
        sub: 'google-sub-123',
        email: 'admin@example.com',
        email_verified: true,
      },
      keyA.privateKey
    );

    await expect(verifyIdToken(service, token, env)).rejects.toThrow(/alg/i);
  });

  it('C4: missing exp is rejected', async () => {
    const service = new OAuthService();
    const env = fakeEnv();

    const token = makeIdToken(keyA.kid, keyA.privateKey, { exp: undefined });
    await expect(verifyIdToken(service, token, env)).rejects.toThrow(
      /expired/i
    );
  });

  it('C5: cache honors max-age — after expiry a fresh fetch occurs', async () => {
    const service = new OAuthService();
    const env = fakeEnv();

    // Short max-age (1s) so the cache expires quickly.
    fetchSpy.mockResolvedValue(jwksResponse([{ kid: keyA.kid, ...keyA.jwk }], 'max-age=1'));

    await verifyIdToken(service, makeIdToken(keyA.kid, keyA.privateKey), env);

    // Wait past the 1s max-age window.
    await new Promise((r) => setTimeout(r, 1100));

    await verifyIdToken(service, makeIdToken(keyA.kid, keyA.privateKey), env);

    const jwksCalls = fetchSpy.mock.calls.filter((call) => String(call[0]).includes(GOOGLE_JWKS_URL));
    expect(jwksCalls.length).toBe(2);
  });
});

describe('OAuthService.exchangeCode — provider outage handling', () => {
  let fetchSpy: MockInstance<typeof globalThis.fetch>;

  beforeEach(() => {
    __resetJwksCacheForTest();
    fetchSpy = vi.spyOn(globalThis, 'fetch');
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('wraps token endpoint network failures in OAuthProviderUnavailableError', async () => {
    fetchSpy.mockRejectedValue(new Error('network down'));

    await expect(exchangeCode(new OAuthService(), fakeEnv())).rejects.toBeInstanceOf(
      OAuthProviderUnavailableError
    );
  });

  it('wraps token endpoint 5xx responses in OAuthProviderUnavailableError', async () => {
    fetchSpy.mockResolvedValue({
      ok: false,
      status: 503,
      headers: { get: () => null },
      json: async () => ({}),
    } as unknown as Response);

    await expect(exchangeCode(new OAuthService(), fakeEnv())).rejects.toBeInstanceOf(
      OAuthProviderUnavailableError
    );
  });

  it('wraps malformed token endpoint JSON in OAuthProviderUnavailableError', async () => {
    fetchSpy.mockResolvedValue({
      ok: true,
      status: 200,
      headers: { get: () => null },
      json: async () => {
        throw new Error('bad json');
      },
    } as unknown as Response);

    await expect(exchangeCode(new OAuthService(), fakeEnv())).rejects.toBeInstanceOf(
      OAuthProviderUnavailableError
    );
  });

  it('fails safe when token endpoint omits id_token', async () => {
    fetchSpy.mockResolvedValue({
      ok: true,
      status: 200,
      headers: { get: () => null },
      json: async () => ({}),
    } as unknown as Response);

    await expect(exchangeCode(new OAuthService(), fakeEnv())).rejects.toThrow(/missing id_token/i);
  });
});
