import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ObjectId } from 'mongodb';
import { TOTP, NobleCryptoPlugin, ScureBase32Plugin } from 'otplib';
import type { TOTPCredentialDocument } from '@/types/auth';

const store = vi.hoisted(() => ({
  credential: null as TOTPCredentialDocument | null,
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
