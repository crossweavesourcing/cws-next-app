import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ObjectId } from 'mongodb';
import { TOTP, NobleCryptoPlugin, ScureBase32Plugin } from 'otplib';
import type { AuthenticationResponseJSON } from '@simplewebauthn/server';
import type { TOTPCredentialDocument, WebAuthnCredentialDocument } from '@/types/auth';

const store = vi.hoisted(() => ({
  credential: null as TOTPCredentialDocument | null,
  passkey: null as WebAuthnCredentialDocument | null,
}));

vi.mock('../repositories/mfa.repository', () => ({
  MfaRepository: class {
    async getTotpCredential() {
      return store.credential;
    }
    async markTotpTimeStepAccepted(_userId: ObjectId, timeStep: number) {
      if (!store.credential) return false;
      const last = store.credential.lastAcceptedTimeStep;
      if (last !== null && last >= timeStep) return false;
      store.credential.lastAcceptedTimeStep = timeStep;
      store.credential.updatedAt = new Date();
      return true;
    }
    async getWebAuthnCredentials() {
      return [];
    }
    async getWebAuthnCredentialById() {
      return store.passkey;
    }
  },
}));

vi.mock('../repositories/user.repository', () => ({
  UserRepository: class {
    async findById() {
      return null;
    }
    async updateSecurity() {}
  },
}));

vi.mock('../config/env', () => ({
  getWebAuthnConfig: () => ({
    rpName: 'CWS Next App',
    rpID: 'localhost',
    origin: 'http://localhost:3000',
  }),
}));

const { MfaService } = await import('./mfa.service');

const testTotp = new TOTP({
  crypto: new NobleCryptoPlugin(),
  base32: new ScureBase32Plugin(),
});

describe('MfaService.verifyTotpLogin', () => {
  beforeEach(() => {
    store.credential = null;
    store.passkey = null;
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-07-18T00:00:00Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('accepts a valid TOTP once and rejects replay in the same timestep', async () => {
    const userId = new ObjectId();
    const secret = testTotp.generateSecret();
    store.credential = {
      _id: new ObjectId(),
      userId,
      secret,
      verifiedAt: new Date(),
      lastAcceptedTimeStep: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    const code = await testTotp.generate({ secret, period: 30 });
    const service = new MfaService();

    await expect(service.verifyTotpLogin(userId, code)).resolves.toBe(true);
    await expect(service.verifyTotpLogin(userId, code)).resolves.toBe(false);
  });
});

describe('MfaService passwordless passkey device binding', () => {
  it('rejects a passwordless passkey when the current device is missing', async () => {
    const service = new MfaService();

    await expect(
      service.verifyWebAuthnPasswordlessAuthentication({ id: 'credential-1' } as AuthenticationResponseJSON, 'challenge', null)
    ).resolves.toEqual({ error: 'device_mismatch' });
  });

  it('rejects a passwordless passkey registered for another device', async () => {
    const userId = new ObjectId();
    store.passkey = {
      _id: new ObjectId(),
      userId,
      credentialID: 'credential-1',
      credentialPublicKey: 'public-key',
      webauthnUserID: 'user-handle',
      deviceObjectId: new ObjectId(),
      counter: 0,
      credentialDeviceType: 'singleDevice',
      credentialBackedUp: false,
      transports: [],
      name: 'Device passkey',
      lastUsedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const service = new MfaService();

    await expect(
      service.verifyWebAuthnPasswordlessAuthentication(
        { id: 'credential-1' } as AuthenticationResponseJSON,
        'challenge',
        new ObjectId()
      )
    ).resolves.toEqual({ error: 'device_mismatch' });
  });
});
