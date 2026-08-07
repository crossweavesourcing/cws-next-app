import { describe, it, expect, beforeAll, beforeEach, vi } from 'vitest';
import { ObjectId } from 'mongodb';
import type { SessionDocument, UserDocument } from '@/types/auth';
import { InsufficientRoleError } from '@/auth/dal';

// ─── Shared in-memory state (accessible to the vi.mock factories below). ──────
const state = vi.hoisted(() => ({
  // The session resolved from the `cws_session` cookie.
  session: null as SessionDocument | null,
  // The user document resolved from session.userId.
  user: null as UserDocument | null,
  // Tracks repository calls made by the action under test.
  revokedUserSessions: [] as ObjectId[],
  revokedAllSessions: false as boolean,
  revokedRefreshSessionIds: [] as ObjectId[],
  audit: [] as Array<{ action: string; actor: unknown }>,
}));

// `server-only` is a Next.js guard that throws outside a React Server Component
// runtime; stub it so the DAL can be imported under vitest's node environment.
vi.mock('server-only', () => ({}));

// ─── Mock the cookie/session layer (dal + session.service). ──────────────────
// The DAL's `getAuthSession` reads the `cws_session` cookie and passes its value
// to `SessionService.validateSession`. We return a dummy cookie so the DAL's
// happy path is reached, and let the mocked session service resolve to
// `state.session` (covering both the authenticated and null cases).
vi.mock('next/headers', () => ({
  headers: async () => new Headers(),
  cookies: async () => ({
    get: () => ({ name: 'cws_session', value: 'dummy-session-cookie' }),
    delete: () => {},
  }),
}));

// The DAL's `getAuthSession` uses the session service; we drive it via `state`.
vi.mock('@/auth/services/session.service', () => ({
  SessionService: class {
    async validateSession() {
      return state.session;
    }
    async getSessionById() {
      return state.session;
    }
    async terminateSession() {}
  },
}));

vi.mock('@/auth/repositories/user.repository', () => ({
  UserRepository: class {
    async findById() {
      return state.user;
    }
    async listUsers() {
      return [];
    }
  },
}));

vi.mock('@/auth/repositories/session.repository', () => ({
  SessionRepository: class {
    async findActiveSessionIdsByUserId() {
      return [];
    }
    async findAllActiveSessionIds() {
      return [];
    }
    async revokeAllUserSessions(userId: ObjectId) {
      state.revokedUserSessions.push(userId);
    }
    async revokeAllSessions() {
      state.revokedAllSessions = true;
    }
    async revokeAllUserSessionsExcept() {}
  },
}));

vi.mock('@/auth/repositories/refresh-token.repository', () => ({
  RefreshTokenRepository: class {
    async revokeBySession() {}
    async revokeBySessions(ids: ObjectId[]) {
      state.revokedRefreshSessionIds = state.revokedRefreshSessionIds.concat(ids);
    }
  },
}));

vi.mock('@/auth/repositories/audit-log.repository', () => ({
  AuditLogRepository: class {
    async log(entry: { action: string; actor: unknown }) {
      state.audit.push({ action: entry.action, actor: entry.actor });
    }
  },
}));

// CSRF guard: bypass origin check so we can exercise the action body in isolation.
vi.mock('@/auth/lib/csrf', () => ({
  withCsrfGuard:
    <Args extends unknown[], R>(action: (...args: Args) => R) =>
    (...args: Args) =>
      action(...args),
}));

vi.mock('next/cache', () => ({
  revalidatePath: () => {},
}));

// Import the actions under test AFTER mocks are declared.
const { adminRevokeUserSessionsAction, adminRevokeAllSessionsAction } = await import(
  '@/auth/actions/admin'
);
const { requireRole } = await import('@/auth/dal');

function makeSession(overrides: Partial<SessionDocument> = {}): SessionDocument {
  return {
    _id: new ObjectId(),
    userId: new ObjectId(),
    deviceId: null,
    latestRefreshTokenId: null,
    loginMethod: 'password',
    device: 'Chrome',
    platform: 'web',
    browser: 'Chrome',
    operatingSystem: 'macOS',
    userAgent: 'test-agent',
    ipAddress: '127.0.0.1',
    location: null,
    refreshCount: 0,
    lastRefreshAt: null,
    lastActivityAt: new Date(),
    lastFullAuthAt: new Date(),
    expiresAt: new Date(Date.now() + 15 * 60 * 1000),
    revoked: false,
    revokedBy: null,
    revokedReason: null,
    revokedAt: null,
    accountSecurityVersion: 1,
    createdAt: new Date(),
    ...overrides,
  } as SessionDocument;
}

function makeUser(overrides: Partial<UserDocument> = {}): UserDocument {
  const userId = new ObjectId();
  return {
    _id: userId,
    profile: {
      displayName: 'Test User',
      fullName: 'Test User',
      avatar: null,
      timezone: null,
      locale: null,
      employeeId: null,
      department: null,
    },
    password: null,
    passwordChangedAt: null,
    passwordExpiresAt: null,
    role: 'super_admin',
    status: 'active',
    loginMethods: ['password'],
    security: {
      failedLoginAttempts: 0,
      lockedUntil: null,
      mfaEnabled: false,
      lastPasswordResetRequestAt: null,
      forcePasswordChange: false,
      accountSecurityVersion: 1,
    },
    metadata: { invitedBy: null, invitedAt: null, notes: null },
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
    ...overrides,
  } as unknown as UserDocument;
}

describe('RBAC — requireRole', () => {
  beforeAll(() => {
    process.env.MONGODB_URI = 'mongodb://localhost:27017/test';
    process.env.SESSION_SECRET = 'test-session-secret-at-least-thirty-two-chars!!';
    process.env.APP_URL = 'http://localhost:3000';
    process.env.TOTP_ENCRYPTION_KEY = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
  });

  beforeEach(() => {
    state.session = null;
    state.user = null;
    state.revokedUserSessions = [];
    state.revokedAllSessions = false;
    state.revokedRefreshSessionIds = [];
    state.audit = [];
  });

  it('allows an admin through requireRole("admin")', async () => {
    const userId = new ObjectId();
    state.session = makeSession({ userId });
    state.user = makeUser({ role: 'admin', _id: userId });

    const session = await requireRole('admin');
    expect(session.userId.toString()).toBe(userId.toString());
  });

  it('throws InsufficientRoleError for a non-admin (manager) requesting admin', async () => {
    const userId = new ObjectId();
    state.session = makeSession({ userId });
    state.user = makeUser({ role: 'manager', _id: userId });

    await expect(requireRole('admin')).rejects.toBeInstanceOf(InsufficientRoleError);
  });

  // When there is no session, `requireRole` → `requireAuth` → `redirect()` which
  // throws `NEXT_REDIRECT` (the real Next.js redirect sentinel). That is the
  // correct unauthenticated behavior; we assert the redirect is triggered.
  it('redirects when unauthenticated (no session)', async () => {
    state.session = null;
    state.user = null;
    await expect(requireRole('admin')).rejects.toMatchObject({
      digest: expect.stringContaining('NEXT_REDIRECT'),
    });
  });

  it('rejects a manager from an admin-only check', async () => {
    const userId = new ObjectId();
    state.session = makeSession({ userId });
    state.user = makeUser({ role: 'manager', _id: userId });

    await expect(requireRole('admin')).rejects.toBeInstanceOf(InsufficientRoleError);
  });
});

describe('Admin forced/batch logout actions — RBAC + audit', () => {
  beforeAll(() => {
    process.env.MONGODB_URI = 'mongodb://localhost:27017/test';
    process.env.SESSION_SECRET = 'test-session-secret-at-least-thirty-two-chars!!';
    process.env.APP_URL = 'http://localhost:3000';
  });

  beforeEach(() => {
    state.session = null;
    state.user = null;
    state.revokedUserSessions = [];
    state.revokedAllSessions = false;
    state.revokedRefreshSessionIds = [];
    state.audit = [];
  });

  it('adminRevokeUserSessionsAction: rejects a non-admin with a permission error', async () => {
    const adminId = new ObjectId();
    state.session = makeSession({ userId: adminId });
    state.user = makeUser({ role: 'manager', _id: adminId });

    const fd = new FormData();
    fd.set('userId', new ObjectId().toString());

    const res = await adminRevokeUserSessionsAction(undefined, fd);
    expect(res.error).toMatch(/permission/i);
    expect(state.revokedUserSessions).toHaveLength(0);
  });

  it('adminRevokeUserSessionsAction: admin revokes the target user sessions + audits', async () => {
    const adminId = new ObjectId();
    const targetId = new ObjectId();
    state.session = makeSession({ userId: adminId });
    state.user = makeUser({ role: 'super_admin', _id: adminId });

    const fd = new FormData();
    fd.set('userId', targetId.toString());

    const res = await adminRevokeUserSessionsAction(undefined, fd);
    expect(res.success).toBe(true);
    expect(state.revokedUserSessions).toHaveLength(1);
    expect(state.revokedUserSessions[0].toString()).toBe(targetId.toString());

    const auditEntry = state.audit.find((a) => a.action === 'auth.session.revoked');
    expect(auditEntry).toBeDefined();
    expect((auditEntry!.actor as { type: string }).type).toBe('admin');
  });

  it('adminRevokeUserSessionsAction: an admin cannot force-logout themselves', async () => {
    const adminId = new ObjectId();
    state.session = makeSession({ userId: adminId });
    state.user = makeUser({ role: 'super_admin', _id: adminId });

    const fd = new FormData();
    fd.set('userId', adminId.toString());

    const res = await adminRevokeUserSessionsAction(undefined, fd);
    expect(res.error).toMatch(/own account/i);
    expect(state.revokedUserSessions).toHaveLength(0);
  });

  it('adminRevokeAllSessionsAction: rejects a non-admin with a permission error', async () => {
    const adminId = new ObjectId();
    state.session = makeSession({ userId: adminId });
    state.user = makeUser({ role: 'manager', _id: adminId });

    const res = await adminRevokeAllSessionsAction();
    expect(res.error).toMatch(/permission/i);
    expect(state.revokedAllSessions).toBe(false);
  });

  it('adminRevokeAllSessionsAction: admin revokes all sessions globally + audits', async () => {
    const adminId = new ObjectId();
    state.session = makeSession({ userId: adminId });
    state.user = makeUser({ role: 'super_admin', _id: adminId });

    const res = await adminRevokeAllSessionsAction();
    expect(res.success).toBe(true);
    expect(state.revokedAllSessions).toBe(true);

    const auditEntry = state.audit.find((a) => a.action === 'auth.session.revoked_all');
    expect(auditEntry).toBeDefined();
    expect((auditEntry!.actor as { type: string }).type).toBe('admin');
  });

  it('adminRevokeUserSessionsAction: returns an error for a malformed userId (before RBAC)', async () => {
    state.session = makeSession();
    state.user = makeUser({ role: 'super_admin' });

    const fd = new FormData();
    fd.set('userId', 'not-a-valid-objectid');

    const res = await adminRevokeUserSessionsAction(undefined, fd);
    expect(res.error).toMatch(/Invalid user/i);
    expect(state.revokedUserSessions).toHaveLength(0);
  });
});
