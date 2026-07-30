import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ObjectId } from 'mongodb';
import { MfaRepository } from './mfa.repository';
import * as dbModule from '@/database';
import { randomBytes } from 'node:crypto';
import { __clearEnvCacheForTests } from '@/auth/config/env';

describe('MfaRepository - TOTP Encryption', () => {
  let repo: MfaRepository;
  const mockColl = {
    updateOne: vi.fn(),
    findOne: vi.fn(),
  };

  const dummyKey = randomBytes(32).toString('hex');

  beforeEach(() => {
    __clearEnvCacheForTests();
    repo = new MfaRepository();
    vi.stubEnv('MONGODB_URI', 'mongodb://localhost:27017/test');
    vi.stubEnv('SESSION_SECRET', 'test-session-secret-at-least-thirty-two-chars!!');
    vi.stubEnv('APP_URL', 'https://example.com');
    vi.stubEnv('TOTP_ENCRYPTION_KEY', dummyKey);
    vi.spyOn(dbModule, 'getTotpCredentialsCollection').mockResolvedValue(mockColl as never);
  });

  afterEach(() => {
    __clearEnvCacheForTests();
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it('encrypts the secret before saving it to the database', async () => {
    mockColl.updateOne.mockResolvedValue({ upsertedCount: 1 });
    
    const userId = new ObjectId();
    const rawSecret = 'my-super-secret-seed';
    
    await repo.saveTotpSecret(userId, rawSecret);
    
    expect(mockColl.updateOne).toHaveBeenCalledWith(
      { userId },
      expect.objectContaining({
        $set: expect.objectContaining({
          secret: expect.stringMatching(/^v1:/),
        }),
      }),
      { upsert: true }
    );
    
    // Ensure the raw secret is not in the db call payload
    const updateCall = mockColl.updateOne.mock.calls[0][1];
    expect(updateCall.$set.secret).not.toBe(rawSecret);
  });

  it('decrypts an encrypted secret when fetching', async () => {
    // Generate an encrypted payload using the same key
    const encryptModule = await import('@/auth/lib/encryption');
    const encrypted = encryptModule.encryptSymmetric('stored-secret', dummyKey);
    
    mockColl.findOne.mockResolvedValue({ secret: encrypted });
    
    const secret = await repo.getTotpSecret(new ObjectId());
    expect(secret).toBe('stored-secret');
  });

  it('returns plaintext seamlessly for legacy unencrypted secrets', async () => {
    mockColl.findOne.mockResolvedValue({ secret: 'legacy' });
    
    const secret = await repo.getTotpSecret(new ObjectId());
    expect(secret).toBe('legacy');
  });

  it('throws an error if TOTP_ENCRYPTION_KEY is unset when saving a secret', async () => {
    vi.unstubAllEnvs();
    vi.stubEnv('MONGODB_URI', 'mongodb://localhost:27017/test');
    vi.stubEnv('SESSION_SECRET', 'test-session-secret-at-least-thirty-two-chars!!');
    vi.stubEnv('APP_URL', 'https://example.com');
    // TOTP_ENCRYPTION_KEY intentionally left undefined
    
    const userId = new ObjectId();
    const rawSecret = 'unencrypted-fallback-secret';
    
    await expect(repo.saveTotpSecret(userId, rawSecret)).rejects.toThrow(
      'TOTP_ENCRYPTION_KEY is required to encrypt TOTP secrets.'
    );
  });
});
