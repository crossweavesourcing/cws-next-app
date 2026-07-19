import { describe, it, expect, vi } from 'vitest';
import { generateKeyPairSync } from 'crypto';
import { ObjectId } from 'mongodb';

const keys = generateKeyPairSync('ed25519');
const privateKeyB64 = keys.privateKey.export({ type: 'pkcs8', format: 'der' }).toString('base64');
const publicKeyB64 = keys.publicKey.export({ type: 'spki', format: 'der' }).toString('base64');

vi.mock('../config/env', () => ({
  getMobileAuthConfig: () => ({
    keyId: 'test-key',
    privateKeyB64,
    publicKeys: { 'test-key': publicKeyB64 },
    issuer: 'https://example.test/api/mobile/v1',
    googleClientIds: [],
    allowedOrigins: [],
    accessTokenTtlMs: 900_000,
    refreshTokenTtlMs: 604_800_000,
  }),
}));

const { issueMobileAccessToken, verifyMobileAccessToken, getMobileJwks } = await import('./mobile-token.service');

describe('mobile EdDSA access tokens', () => {
  it('issues and verifies the required mobile claims', async () => {
    const userId = new ObjectId();
    const sessionId = new ObjectId();
    const issued = await issueMobileAccessToken(userId, sessionId);
    const claims = await verifyMobileAccessToken(issued.token);
    expect(claims.sub).toBe(userId.toHexString());
    expect(claims.sid).toBe(sessionId.toHexString());
    expect(claims.aud).toBe('cws-mobile');
    expect(claims.typ).toBe('access');
    expect(issued.expiresIn).toBe(900);
  });

  it('rejects a token with a modified signature', async () => {
    const issued = await issueMobileAccessToken(new ObjectId(), new ObjectId());
    const parts = issued.token.split('.');
    parts[1] = `${parts[1]}x`;
    await expect(verifyMobileAccessToken(parts.join('.'))).rejects.toThrow();
  });

  it('publishes only public verification material in JWKS', async () => {
    const jwks = await getMobileJwks();
    expect(jwks.keys).toHaveLength(1);
    expect(jwks.keys[0]).toMatchObject({ kid: 'test-key', alg: 'EdDSA', use: 'sig' });
    expect(jwks.keys[0]).not.toHaveProperty('d');
  });
});
