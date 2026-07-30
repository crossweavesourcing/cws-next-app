import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { ObjectId } from 'mongodb';
import type { UserDocument } from '@/types/auth';

const stores = vi.hoisted(() => ({
  userId: '665f1a2b3c4d5e6f70819293',
  sessionId: '665f1a2b3c4d5e6f70819294',
  totpEnabled: false,
  passkeyCount: 0,
  updates: [] as Array<Partial<UserDocument['security']>>,
  revalidatedPaths: [] as string[],
}));

vi.mock('../dal', () => ({
  requireActiveSession: async () => ({
    _id: new ObjectId(stores.sessionId),
    userId: new ObjectId(stores.userId),
  }),
  requireSudoMode: async () => ({
    _id: new ObjectId(stores.sessionId),
    userId: new ObjectId(stores.userId),
  }),
  SudoRequiredError: class extends Error {
    publicMessage = 'Sudo mode required';
  },
}));

vi.mock('../lib/request', () => ({
  assertSameOrigin: async () => {},
  CsrfError: class extends Error {},
}));

vi.mock('../repositories/user.repository', () => ({
  UserRepository: class {
    async findById() {
      return {
        _id: new ObjectId(stores.userId),
        security: {
          failedLoginAttempts: 0,
          lockedUntil: null,
          mfaEnabled: stores.totpEnabled || stores.passkeyCount > 0,
          totpEnabled: stores.totpEnabled,
          webAuthnEnabled: stores.passkeyCount > 0,
          lastPasswordResetRequestAt: null,
          forcePasswordChange: false,
          accountSecurityVersion: 1,
        },
      };
    }

    async updateSecurity(_userId: ObjectId, updates: Partial<UserDocument['security']>) {
      stores.updates.push(updates);
    }
  },
}));

vi.mock('../repositories/mfa.repository', () => ({
  MfaRepository: class {
    async getWebAuthnCredentials() {
      return Array.from({ length: stores.passkeyCount }, (_, index) => ({
        _id: new ObjectId(),
        credentialId: `credential-${index}`,
      }));
    }
  },
}));

vi.mock('next/cache', () => ({
  revalidatePath: (path: string) => {
    stores.revalidatedPaths.push(path);
  },
}));

const { updateTwoFaPreferencesAction } = await import('./mfa');

describe('updateTwoFaPreferencesAction', () => {
  beforeAll(() => {
    process.env.MONGODB_URI = 'mongodb://localhost:27017/test';
    process.env.SESSION_SECRET = 'test-session-secret-at-least-thirty-two-chars!!';
    process.env.APP_URL = 'http://localhost:3000';
    process.env.TOTP_ENCRYPTION_KEY = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
  });

  beforeEach(() => {
    stores.totpEnabled = false;
    stores.passkeyCount = 0;
    stores.updates = [];
    stores.revalidatedPaths = [];
  });

  it('saves a valid preference and email default method', async () => {
    const result = await updateTwoFaPreferencesAction('always', 'email');

    expect(result).toEqual({
      success: true,
      preference: 'always',
      defaultMethod: 'email',
    });
    expect(stores.updates).toEqual([
      { twoFaPreference: 'always', defaultTwoFaMethod: 'email' },
    ]);
    expect(stores.revalidatedPaths).toEqual(['/dashboard/account-security']);
  });

  it('rejects an invalid preference', async () => {
    const result = await updateTwoFaPreferencesAction('sometimes' as never, 'email');

    expect(result).toEqual({ success: false, error: 'Invalid preference.' });
    expect(stores.updates).toEqual([]);
    expect(stores.revalidatedPaths).toEqual([]);
  });

  it('rejects an invalid default method', async () => {
    const result = await updateTwoFaPreferencesAction('always', 'sms' as never);

    expect(result).toEqual({ success: false, error: 'Invalid default method.' });
    expect(stores.updates).toEqual([]);
    expect(stores.revalidatedPaths).toEqual([]);
  });

  it('rejects authenticator as default when TOTP is not configured', async () => {
    const result = await updateTwoFaPreferencesAction('always', 'totp');

    expect(result).toEqual({
      success: false,
      error: 'Set up an authenticator app before making it your default method.',
    });
    expect(stores.updates).toEqual([]);
  });

  it('rejects passkey as a 2FA default method', async () => {
    const result = await updateTwoFaPreferencesAction('always', 'webauthn' as never);

    expect(result).toEqual({
      success: false,
      error: 'Invalid default method.',
    });
    expect(stores.updates).toEqual([]);
  });

  it('falls back to email when the submitted default method is null', async () => {
    const result = await updateTwoFaPreferencesAction('new_device_only', null);

    expect(result).toEqual({
      success: true,
      preference: 'new_device_only',
      defaultMethod: 'email',
    });
    expect(stores.updates).toEqual([
      { twoFaPreference: 'new_device_only', defaultTwoFaMethod: 'email' },
    ]);
  });

  it('allows authenticator defaults only when configured', async () => {
    stores.totpEnabled = true;
    stores.passkeyCount = 1;

    await expect(updateTwoFaPreferencesAction('always', 'totp')).resolves.toMatchObject({
      success: true,
      defaultMethod: 'totp',
    });
  });
});
