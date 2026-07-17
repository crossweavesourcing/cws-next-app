'use server';

import { ObjectId } from 'mongodb';
import { revalidatePath } from 'next/cache';
import {
  requireRole,
  InsufficientRoleError,
} from '../dal';
import { SessionRepository } from '../repositories/session.repository';
import { RefreshTokenRepository } from '../repositories/refresh-token.repository';
import { AuditLogRepository } from '../repositories/audit-log.repository';
import { withCsrfGuard } from '../lib/csrf';

export type AdminRevokeState = { error?: string; success?: boolean };

/** Admin-only: force-logout every session (and refresh family) for one user. */
async function adminRevokeUserSessionsActionImpl(
  _prev: AdminRevokeState | undefined,
  formData: FormData
): Promise<AdminRevokeState> {
  const userIdRaw = typeof formData.get('userId') === 'string'
    ? (formData.get('userId') as string)
    : '';

  if (!userIdRaw || !ObjectId.isValid(userIdRaw)) {
    return { error: 'Invalid user.' };
  }

  try {
    const adminSession = await requireRole('admin');
    const adminUserId = adminSession.userId;

    // Guard: an admin cannot force-logout themselves via this path (use the
    // normal self-service logouts instead) — avoids accidentally locking the
    // actor out mid-operation.
    if (adminUserId.equals(new ObjectId(userIdRaw))) {
      return { error: 'You cannot force-logout your own account here.' };
    }

    const sessionRepo = new SessionRepository();
    const refreshRepo = new RefreshTokenRepository();
    const auditRepo = new AuditLogRepository();

    const targetId = new ObjectId(userIdRaw);
    const sessionIds = await sessionRepo.findActiveSessionIdsByUserId(targetId);

    // Revoke sessions + their refresh families (family revoke / reuse-detect).
    await sessionRepo.revokeAllUserSessions(targetId, 'admin');
    await refreshRepo.revokeBySessions(sessionIds, 'admin');

    await auditRepo.log({
      userId: targetId,
      sessionId: adminSession._id,
      action: 'auth.session.revoked',
      status: 'SUCCESS',
      errorCode: null,
      actor: { type: 'admin', id: adminUserId },
      source: { platform: 'web', appVersion: '0.1.0' },
      correlationId: null,
      requestId: null,
      resource: { type: 'user', id: targetId.toString() },
      metadata: {
        reason: 'admin bulk user revocation',
        revokedSessions: sessionIds.length,
      },
      ipAddress: adminSession.ipAddress,
      userAgent: adminSession.userAgent,
    });

    revalidatePath('/dashboard/admin/users');
    return { success: true };
  } catch (err) {
    if (err instanceof InsufficientRoleError) {
      return { error: 'You do not have permission to perform this action.' };
    }
    return { error: err instanceof Error ? err.message : 'Unable to revoke user sessions.' };
  }
}

/** Admin-only: force-logout EVERY user's sessions (breach-response button). */
async function adminRevokeAllSessionsActionImpl(): Promise<AdminRevokeState> {
  try {
    const adminSession = await requireRole('admin');
    const adminUserId = adminSession.userId;

    const sessionRepo = new SessionRepository();
    const refreshRepo = new RefreshTokenRepository();
    const auditRepo = new AuditLogRepository();

    const allSessionIds = await sessionRepo.findAllActiveSessionIds();

    // Revoke every session + every refresh family globally.
    await sessionRepo.revokeAllSessions('admin');
    await refreshRepo.revokeBySessions(allSessionIds, 'admin');

    await auditRepo.log({
      userId: adminUserId,
      sessionId: adminSession._id,
      action: 'auth.session.revoked_all',
      status: 'SUCCESS',
      errorCode: null,
      actor: { type: 'admin', id: adminUserId },
      source: { platform: 'web', appVersion: '0.1.0' },
      correlationId: null,
      requestId: null,
      resource: { type: 'session', id: 'global' },
      metadata: {
        reason: 'global administrative revocation',
        revokedSessions: allSessionIds.length,
      },
      ipAddress: adminSession.ipAddress,
      userAgent: adminSession.userAgent,
    });

    revalidatePath('/dashboard/admin/users');
    return { success: true };
  } catch (err) {
    if (err instanceof InsufficientRoleError) {
      return { error: 'You do not have permission to perform this action.' };
    }
    return { error: err instanceof Error ? err.message : 'Unable to revoke all sessions.' };
  }
}

export const adminRevokeUserSessionsAction = withCsrfGuard(adminRevokeUserSessionsActionImpl);
export const adminRevokeAllSessionsAction = withCsrfGuard(adminRevokeAllSessionsActionImpl);
