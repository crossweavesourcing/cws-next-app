import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ObjectId } from 'mongodb';

const state = vi.hoisted(() => ({
  deviceObjectId: '',
  persistedIds: [] as string[],
}));

vi.mock('../lib/device', () => ({
  ensureDeviceId: async () => ({
    serverDeviceId: new ObjectId(),
    clientDeviceId: null,
    hasServerToken: true,
  }),
  setServerDeviceToken: async (recordId: ObjectId) => {
    state.persistedIds.push(recordId.toString());
  },
}));

vi.mock('./session.service', () => ({
  SessionService: class {
    async createSession() {
      return {
        status: 'step_up' as const,
        userId: new ObjectId(),
        sessionCookie: undefined,
        refreshToken: undefined,
        deviceObjectId: new ObjectId(state.deviceObjectId),
      };
    }
  },
}));

import { LoginService } from './login.service';

type LoginServiceHarness = {
  issueSession(
    userId: ObjectId,
    email: string,
    ipAddress: string,
    userAgent: string | null,
    loginMethod: 'password' | 'google',
    rememberMe?: boolean,
    platform?: 'web' | 'mobile' | 'desktop'
  ): Promise<{ status: string }>;
};

describe('LoginService step-up device token', () => {
  beforeEach(() => {
    state.deviceObjectId = new ObjectId().toString();
    state.persistedIds = [];
  });

  it('persists a rotated web device id before returning step_up', async () => {
    const service = new LoginService() as unknown as LoginServiceHarness;

    const result = await service.issueSession(
      new ObjectId(),
      'user@example.com',
      '203.0.113.10',
      'test-agent',
      'password'
    );

    expect(result.status).toBe('step_up');
    expect(state.persistedIds).toEqual([state.deviceObjectId]);
  });
});
