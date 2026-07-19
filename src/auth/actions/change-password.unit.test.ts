import { beforeEach, describe, expect, it, vi } from 'vitest';

const state = vi.hoisted(() => ({
  cookies: new Map<string, string>(),
  changedFor: [] as Array<{ userId: string; currentSessionId?: string }>,
  cleared: [] as string[],
  session: null as null | { id: string; userId: string },
}));

vi.mock('server-only', () => ({}));

vi.mock('next/headers', () => ({
  cookies: async () => ({
    get: (name: string) => {
      const value = state.cookies.get(name);
      return value ? { name, value } : undefined;
    },
    set: (name: string) => state.cleared.push(name),
  }),
}));

vi.mock('../crypto/token', () => ({
  verifySessionSignature: (value: string) => {
    if (value === 'pending-cookie') return '507f1f77bcf86cd799439011';
    if (value === 'session-cookie') return '507f191e810c19729de860ea';
    return null;
  },
}));

vi.mock('../config/env', () => ({
  getEnv: () => ({ SESSION_SECRET: 'test-secret' }),
}));

vi.mock('../services/password.service', () => ({
  PasswordService: class {
    parseChange() {
      return {
        success: true,
        data: {
          currentPassword: 'CurrentPass123!',
          newPassword: 'NewPassword123!',
        },
      };
    }

    async changePassword(
      userId: { toHexString(): string },
      _currentPassword: string,
      _newPassword: string,
      currentSessionId?: string
    ) {
      state.changedFor.push({ userId: userId.toHexString(), currentSessionId });
    }
  },
}));

vi.mock('../lib/cookies', () => ({
  clearingCookieOpts: () => ({}),
}));

vi.mock('../lib/csrf', () => ({
  withCsrfGuard: <T extends (...args: never[]) => unknown>(action: T) => action,
}));

vi.mock('../dal', () => ({
  getAuthSession: async () => state.session
    ? {
        _id: { toString: () => state.session!.id },
        userId: { toString: () => state.session!.userId },
      }
    : null,
}));

const { changePasswordAction } = await import('./change-password');

describe('changePasswordAction identity selection', () => {
  beforeEach(() => {
    state.cookies.clear();
    state.changedFor.length = 0;
    state.cleared.length = 0;
    state.session = null;
  });

  it('prefers the force-change pending identity over a stale session identity', async () => {
    state.cookies.set('cws_pw_pending', 'pending-cookie');
    state.cookies.set('cws_session', 'session-cookie');

    const result = await changePasswordAction({}, new FormData());

    expect(result).toEqual({ success: true });
    expect(state.changedFor).toEqual([
      { userId: '507f1f77bcf86cd799439011', currentSessionId: undefined },
    ]);
    expect(state.cleared).toContain('cws_pw_pending');
  });

  it('uses the authenticated session identity for a normal password change', async () => {
    state.session = {
      id: '507f191e810c19729de860ea',
      userId: '507f1f77bcf86cd799439012',
    };

    const result = await changePasswordAction({}, new FormData());

    expect(result).toEqual({ success: true });
    expect(state.changedFor).toEqual([
      {
        userId: '507f1f77bcf86cd799439012',
        currentSessionId: '507f191e810c19729de860ea',
      },
    ]);
  });
});
