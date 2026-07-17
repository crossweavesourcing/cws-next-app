import { describe, it, expect, beforeAll, afterEach, vi } from 'vitest';
import type { RequestResetState } from './password-reset';

/**
 * Tests for Implementation Prompt 12 — `withCsrfGuard` applied uniformly to
 * EVERY mutating auth Server Action.
 *
 * Acceptance criteria covered here:
 *   - C2: a cross-origin request (CsrfError thrown by assertSameOrigin) to ANY
 *     wrapped action returns the neutral `{ error: 'Request blocked.' }` and
 *     performs NO state change.
 *   - C3: same-origin requests still reach the inner action unchanged (no
 *     regression in behaviour).
 *   - C4: the wrapper maps CsrfError -> `{ error: 'Request blocked.' }` and
 *     does NOT swallow non-Csrf errors; same-origin passes through.
 *   - C5: no Redis / shared in-memory state — tests only mock per-action
 *     dependencies and assert behaviour.
 *
 * Strategy: every collaborator module is mocked ONCE at the top with a
 * controllable, hoisted state object (`s`). `assertSameOrigin` is mockable so we
 * can simulate cross-origin (reject with CsrfError) vs same-origin (resolve)
 * WITHOUT resetting the module registry — which would otherwise break the shared
 * spy on the guard's `assertSameOrigin` binding. Because the guard runs BEFORE
 * the inner body, a cross-origin rejection guarantees the inner body never
 * executes, so no state-changing call (tracked on `s`) is made.
 */

const APP_URL = 'http://localhost:3000';

// Shared, mutable test state accessible to every vi.mock factory below.
const s = vi.hoisted(() => ({
  // Origin check: default same-origin (resolves). Tests flip to cross-origin.
  crossOrigin: false,
  // State-change call counters for the action under test.
  requestResetCalls: 0,
  resetPasswordCalls: 0,
  changePasswordCalls: 0,
  sessionTerminated: 0,
  revokeAllOther: 0,
  adminRevokeUser: 0,
  adminRevokeAll: 0,
  recoveryGenerated: 0,
  trustedSet: 0,
  blockedSet: 0,
  nameSet: 0,
  totpVerified: 0,
  twoFactorVerified: 0,
  twoFactorSent: 0,
  loginWithPassword: 0,
}));

// `server-only` throws outside a React Server Component runtime; stub it.
vi.mock('server-only', () => ({}));

// CSP / single source of truth for origin: controllable via `s.crossOrigin`.
vi.mock('@/auth/lib/request', () => {
  class CsrfError extends Error {
    constructor() {
      super('Cross-origin request rejected.');
      this.name = 'CsrfError';
    }
  }
  return {
    CsrfError,
    getClientIp: async () => '127.0.0.1',
    assertSameOrigin: async () => {
      if (s.crossOrigin) {
        throw new CsrfError();
      }
    },
  };
});

// Password lifecycle service.
vi.mock('@/auth/services/password.service', () => ({
  PasswordService: class {
    async requestReset() {
      s.requestResetCalls++;
    }
    async resetPassword() {
      s.resetPasswordCalls++;
    }
    async changePassword() {
      s.changePasswordCalls++;
      throw new Error('mock changePassword only asserts it was called');
    }
    parseChange() {
      return { success: true, data: {} };
    }
  },
}));

// 2FA / TOTP services.
vi.mock('@/auth/services/two-factor.service', () => ({
  TwoFactorService: class {
    async verify() {
      s.twoFactorVerified++;
      return true;
    }
    async sendCode() {
      s.twoFactorSent++;
    }
  },
}));
vi.mock('@/auth/services/mfa.service', () => ({
  MfaService: class {
    async verifyTotpLogin() {
      s.totpVerified++;
      return true;
    }
  },
}));

// Session service (terminate / revoke-other helpers exercised by session actions).
vi.mock('@/auth/services/session.service', () => ({
  SessionService: class {
    async getSessionById() {
      return {
        _id: 'sess',
        userId: { equals: () => true } as never,
        ipAddress: '1.2.3.4',
        userAgent: 'agent',
      };
    }
    async terminateSession() {
      s.sessionTerminated++;
    }
  },
}));

// Repositories used by the wrapped actions.
vi.mock('@/auth/repositories/session.repository', () => ({
  SessionRepository: class {
    async revokeAllUserSessionsExcept() {
      s.revokeAllOther++;
    }
    async revokeAllUserSessions() {
      s.adminRevokeUser++;
    }
    async revokeAllSessions() {
      s.adminRevokeAll++;
    }
    async findActiveSessionIdsByUserId() {
      return [];
    }
    async findAllActiveSessionIds() {
      return [];
    }
  },
}));
vi.mock('@/auth/repositories/refresh-token.repository', () => ({
  RefreshTokenRepository: class {
    async revokeBySessions() {}
  },
}));
vi.mock('@/auth/repositories/audit-log.repository', () => ({
  AuditLogRepository: class {
    async log() {}
  },
}));
// Login-attempt repository: password-reset actions now record + count rate-limit
// attempts. Stub it so the test never touches the real DB (no Redis / no Mongo).
vi.mock('@/auth/repositories/login-attempt.repository', () => ({
  LoginAttemptRepository: class {
    async recordAttempt() {}
    async countRecentByFilter() {
      return 0;
    }
    async countRecentByIpFilter() {
      return 0;
    }
  },
}));
vi.mock('@/auth/repositories/recovery-code.repository', () => ({
  RecoveryCodeRepository: class {
    async generate() {
      s.recoveryGenerated++;
      return { rawCodes: ['AAAA-BBBB'] as string[] };
    }
  },
}));
vi.mock('@/auth/repositories/device.repository', () => ({
  DeviceRepository: class {
    static isValidDeviceId() {
      return true;
    }
    async findByIdForUser() {
      return { _id: 'd1' };
    }
    async setTrusted() {
      s.trustedSet++;
    }
    async setBlocked() {
      s.blockedSet++;
    }
    async setName() {
      s.nameSet++;
    }
  },
}));
vi.mock('@/auth/repositories/user.repository', () => ({
  UserRepository: class {
    async findById() {
      return null;
    }
  },
}));

// Login service.
vi.mock('@/auth/services/login.service', () => ({
  LoginService: class {
    async loginWithPassword() {
      s.loginWithPassword++;
      return { status: 'mfa_required' as const };
    }
  },
}));

// Cookie / cache / dal no-ops so action bodies can run without a real runtime.
vi.mock('next/headers', () => ({
  cookies: async () => ({
    get: () => ({ name: 'cws_session', value: 'dummy-session-cookie' }),
    set: () => {},
    delete: () => {},
  }),
  headers: async () => new Map([['user-agent', 'test-agent']]),
}));
vi.mock('next/cache', () => ({ revalidatePath: () => {} }));
vi.mock('@/auth/dal', () => ({
  requireActiveSession: async () => ({
    _id: 'sess',
    userId: { equals: () => true } as never,
    ipAddress: '1.2.3.4',
    userAgent: 'agent',
  }),
  requireRole: async () => ({
    _id: 'admin-sess',
    userId: { equals: () => false } as never,
    ipAddress: '1.2.3.4',
    userAgent: 'agent',
  }),
  InsufficientRoleError: class extends Error {},
}));

// The real guard wrapper is what we are validating; import it for criterion 4.
const { withCsrfGuard } = await import('@/auth/lib/csrf');
const requestMod = await import('@/auth/lib/request');
const { assertSameOrigin, CsrfError } = requestMod;

beforeAll(() => {
  process.env.APP_URL = APP_URL;
  process.env.SESSION_SECRET = 'test-session-secret-at-least-thirty-two-chars!!';
  process.env.MONGODB_URI = 'mongodb://localhost:27017/test';
});

afterEach(() => {
  // Reset counters + origin mode between tests.
  s.crossOrigin = false;
  s.requestResetCalls = 0;
  s.resetPasswordCalls = 0;
  s.changePasswordCalls = 0;
  s.sessionTerminated = 0;
  s.revokeAllOther = 0;
  s.adminRevokeUser = 0;
  s.adminRevokeAll = 0;
  s.recoveryGenerated = 0;
  s.trustedSet = 0;
  s.blockedSet = 0;
  s.nameSet = 0;
  s.totpVerified = 0;
  s.twoFactorVerified = 0;
  s.twoFactorSent = 0;
  s.loginWithPassword = 0;
  vi.restoreAllMocks();
});

/** Simulate a cross-origin (CSRF) request. */
function makeCrossOrigin() {
  s.crossOrigin = true;
}
/** Simulate a same-origin request. */
function makeSameOrigin() {
  s.crossOrigin = false;
}

describe('withCsrfGuard — CsrfError mapping (criterion 4)', () => {
  it('maps CsrfError to the neutral { error: "Request blocked." }', async () => {
    makeCrossOrigin();

    const inner = vi.fn(async (): Promise<{ error?: string }> => ({ error: undefined }));
    const guarded = withCsrfGuard(inner);

    const result = await guarded();

    expect(result).toEqual({ error: 'Request blocked.' });
    expect(inner).not.toHaveBeenCalled();
  });

  it('does NOT swallow non-Csrf errors (throws them through)', async () => {
    // Origin check passes, but a non-Csrf error is thrown by the inner path —
    // prove only CsrfError is mapped to the neutral error.
    const boom = new Error('unexpected db failure');
    vi.spyOn(requestMod, 'assertSameOrigin').mockRejectedValueOnce(boom);

    const inner = vi.fn(async (): Promise<{ error?: string }> => ({ error: undefined }));
    const guarded = withCsrfGuard(inner);

    await expect(guarded()).rejects.toBe(boom);
  });

  it('passes through to the inner action on a same-origin call', async () => {
    makeSameOrigin();

    const inner = vi.fn(async (n: number): Promise<{ error?: string; doubled?: number }> => {
      return { doubled: n * 2 };
    });
    const guarded = withCsrfGuard(inner);

    const result = await guarded(21);
    expect(result).toEqual({ doubled: 42 });
    expect(inner).toHaveBeenCalledWith(21);
  });
});

describe('wrapped action — cross-origin performs NO state change (criterion 2)', () => {
  it('requestResetAction: cross-origin returns neutral error and never calls PasswordService', async () => {
    makeCrossOrigin();
    const { requestResetAction } = await import('@/auth/actions/password-reset');

    const fd = new FormData();
    fd.set('email', 'victim@example.com');

    const res = await requestResetAction({} as RequestResetState, fd);

    expect(res).toEqual({ error: 'Request blocked.' });
    expect(s.requestResetCalls).toBe(0);
  });

  it('requestResetAction: same-origin reaches the inner action (no regression)', async () => {
    makeSameOrigin();
    const { requestResetAction } = await import('@/auth/actions/password-reset');

    const fd = new FormData();
    fd.set('email', 'victim@example.com');

    const res = await requestResetAction({} as RequestResetState, fd);

    expect(res).toEqual({ success: true });
    expect(s.requestResetCalls).toBe(1);
  });

  it('resetPasswordAction: cross-origin returns neutral error and never calls PasswordService', async () => {
    makeCrossOrigin();
    const { resetPasswordAction } = await import('@/auth/actions/password-reset');

    const fd = new FormData();
    fd.set('token', 'tok');
    fd.set('newPassword', 'NewPassw0rd!23');
    fd.set('confirmPassword', 'NewPassw0rd!23');

    const res = await resetPasswordAction({} as RequestResetState, fd);

    expect(res).toEqual({ error: 'Request blocked.' });
    expect(s.resetPasswordCalls).toBe(0);
  });

  it('resetPasswordAction: same-origin proceeds to resetPassword()', async () => {
    makeSameOrigin();
    const { resetPasswordAction } = await import('@/auth/actions/password-reset');

    const fd = new FormData();
    fd.set('token', 'tok');
    fd.set('newPassword', 'NewPassw0rd!23');
    fd.set('confirmPassword', 'NewPassw0rd!23');

    await resetPasswordAction({} as RequestResetState, fd);
    expect(s.resetPasswordCalls).toBe(1);
  });

  it('loginAction: cross-origin returns neutral error and never calls login service', async () => {
    makeCrossOrigin();
    const { loginAction } = await import('@/auth/actions/login');

    const fd = new FormData();
    fd.set('email', 'admin@example.com');
    fd.set('password', 'hunter2');

    const res = await loginAction(undefined, fd);

    expect(res).toEqual({ error: 'Request blocked.' });
    expect(s.loginWithPassword).toBe(0);
  });

  it('loginAction: same-origin reaches the inner login body', async () => {
    makeSameOrigin();
    const { loginAction } = await import('@/auth/actions/login');

    const fd = new FormData();
    fd.set('email', 'admin@example.com');
    fd.set('password', 'hunter2');

    await loginAction(undefined, fd);
    expect(s.loginWithPassword).toBe(1);
  });

  it('verify2faAction: cross-origin returns neutral error and never calls into 2FA service', async () => {
    makeCrossOrigin();
    const { verify2faAction } = await import('@/auth/actions/verify-2fa');

    const fd = new FormData();
    fd.set('code', '123456');

    const res = await verify2faAction({} as { error?: string }, fd);

    expect(res).toEqual({ error: 'Request blocked.' });
    expect(s.twoFactorVerified).toBe(0);
  });

  it('resend2faAction: cross-origin returns neutral error and never sends a code', async () => {
    makeCrossOrigin();
    const { resend2faAction } = await import('@/auth/actions/verify-2fa');

    const res = await resend2faAction();

    // void action → wrapper still returns the neutral object on cross-origin.
    expect(res).toEqual({ error: 'Request blocked.' });
    expect(s.twoFactorSent).toBe(0);
  });

  it('changePasswordAction: cross-origin returns neutral error and never changes password', async () => {
    makeCrossOrigin();
    const { changePasswordAction } = await import('@/auth/actions/change-password');

    const fd = new FormData();
    fd.set('currentPassword', 'old');
    fd.set('newPassword', 'NewPassw0rd!23');
    fd.set('confirmPassword', 'NewPassw0rd!23');

    const res = await changePasswordAction({} as { error?: string; success?: boolean }, fd);

    expect(res).toEqual({ error: 'Request blocked.' });
    expect(s.changePasswordCalls).toBe(0);
  });

  it('revokeSessionAction: cross-origin returns neutral error and never terminates a session', async () => {
    makeCrossOrigin();
    const { revokeSessionAction } = await import('@/auth/actions/session');

    const fd = new FormData();
    fd.set('sessionId', 'sess');
    fd.set('currentSessionId', 'other');

    const res = await revokeSessionAction(
      {} as { error?: string; success?: boolean } | undefined,
      fd
    );

    expect(res).toEqual({ error: 'Request blocked.' });
    expect(s.sessionTerminated).toBe(0);
  });

  it('revokeAllOtherSessionsAction: cross-origin returns neutral error and never revokes', async () => {
    makeCrossOrigin();
    const { revokeAllOtherSessionsAction } = await import('@/auth/actions/session');

    const fd = new FormData();
    fd.set('currentSessionId', 'cur');

    const res = await revokeAllOtherSessionsAction(
      {} as { error?: string; success?: boolean } | undefined,
      fd
    );

    expect(res).toEqual({ error: 'Request blocked.' });
    expect(s.revokeAllOther).toBe(0);
  });

  it('adminRevokeUserSessionsAction: cross-origin returns neutral error and never revokes', async () => {
    makeCrossOrigin();
    const { adminRevokeUserSessionsAction } = await import('@/auth/actions/admin');

    const fd = new FormData();
    fd.set('userId', '507f1f77bcf86cd799439011');

    const res = await adminRevokeUserSessionsAction(
      {} as { error?: string; success?: boolean } | undefined,
      fd
    );

    expect(res).toEqual({ error: 'Request blocked.' });
    expect(s.adminRevokeUser).toBe(0);
  });

  it('adminRevokeAllSessionsAction: cross-origin returns neutral error and never revokes', async () => {
    makeCrossOrigin();
    const { adminRevokeAllSessionsAction } = await import('@/auth/actions/admin');

    const res = await adminRevokeAllSessionsAction();

    expect(res).toEqual({ error: 'Request blocked.' });
    expect(s.adminRevokeAll).toBe(0);
  });

  it('generateRecoveryCodesAction: cross-origin returns neutral error and never generates codes', async () => {
    makeCrossOrigin();
    const { generateRecoveryCodesAction } = await import('@/auth/actions/recovery-codes');

    const res = await generateRecoveryCodesAction();

    expect(res).toEqual({ error: 'Request blocked.' });
    expect(s.recoveryGenerated).toBe(0);
  });

  it('regenerateRecoveryCodesAction: cross-origin returns neutral error and never regenerates codes', async () => {
    makeCrossOrigin();
    const { regenerateRecoveryCodesAction } = await import('@/auth/actions/recovery-codes');

    const res = await regenerateRecoveryCodesAction();

    expect(res).toEqual({ error: 'Request blocked.' });
    expect(s.recoveryGenerated).toBe(0);
  });

  it('trustDeviceAction: cross-origin returns neutral error and never mutates the device', async () => {
    makeCrossOrigin();
    const { trustDeviceAction } = await import('@/auth/actions/device');

    const fd = new FormData();
    fd.set('deviceId', 'd1');
    fd.set('trusted', 'true');

    const res = await trustDeviceAction(
      {} as { error?: string; success?: boolean } | undefined,
      fd
    );

    expect(res).toEqual({ error: 'Request blocked.' });
    expect(s.trustedSet).toBe(0);
  });

  it('blockDeviceAction: cross-origin returns neutral error and never blocks the device', async () => {
    makeCrossOrigin();
    const { blockDeviceAction } = await import('@/auth/actions/device');

    const fd = new FormData();
    fd.set('deviceId', 'd1');
    fd.set('blocked', 'true');

    const res = await blockDeviceAction(
      {} as { error?: string; success?: boolean } | undefined,
      fd
    );

    expect(res).toEqual({ error: 'Request blocked.' });
    expect(s.blockedSet).toBe(0);
  });

  it('renameDeviceAction: cross-origin returns neutral error and never renames the device', async () => {
    makeCrossOrigin();
    const { renameDeviceAction } = await import('@/auth/actions/device');

    const fd = new FormData();
    fd.set('deviceId', 'd1');
    fd.set('name', 'Work Mac');

    const res = await renameDeviceAction(
      {} as { error?: string; success?: boolean } | undefined,
      fd
    );

    expect(res).toEqual({ error: 'Request blocked.' });
    expect(s.nameSet).toBe(0);
  });

  it('verifyTotpAction: cross-origin returns neutral error and never verifies/creates a session', async () => {
    makeCrossOrigin();
    const { verifyTotpAction } = await import('@/auth/actions/verify-totp');

    const fd = new FormData();
    fd.set('code', '123456');

    const res = await verifyTotpAction({} as { error?: string }, fd);

    expect(res).toEqual({ error: 'Request blocked.' });
    expect(s.totpVerified).toBe(0);
  });
});
