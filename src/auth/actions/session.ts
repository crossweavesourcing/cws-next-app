'use server';

import { ObjectId } from 'mongodb';
import { revalidatePath } from 'next/cache';
import { SessionService } from '../services/session.service';
import { SessionRepository } from '../repositories/session.repository';
import { AuditLogRepository } from '../repositories/audit-log.repository';
import { requireActiveSession } from '../dal';
import { withCsrfGuard } from '../lib/csrf';

export type RevokeSessionState = { error?: string; success?: boolean };

/**
 * Revokes a single session. The caller must own the session — we re-fetch and
 * verify userId before revoking to prevent one user ending another's sessions.
 *
 * C1: wrapped with `withCsrfGuard` (logout/revoke CSRF vector).
 */
async function revokeSessionActionImpl(
  _prev: RevokeSessionState | undefined,
  formData: FormData
): Promise<RevokeSessionState> {
  const sessionId = typeof formData.get('sessionId') === 'string'
    ? (formData.get('sessionId') as string)
    : '';

  // The current session id is passed so we never revoke ourselves.
  const currentSessionId = typeof formData.get('currentSessionId') === 'string'
    ? (formData.get('currentSessionId') as string)
    : '';

  if (!sessionId) {
    return { error: 'Invalid session.' };
  }
  if (sessionId === currentSessionId) {
    return { error: 'You cannot end your current session here. Use Log out.' };
  }

  try {
    const sessionService = new SessionService();
    const auditRepo = new AuditLogRepository();

    const target = await sessionService.getSessionById(new ObjectId(sessionId));
    if (!target) {
      return { error: 'Session not found.' };
    }

    // Confirm ownership.
    const current = await sessionService.getSessionById(new ObjectId(currentSessionId));
    if (!current || !current.userId.equals(target.userId)) {
      return { error: 'You do not have permission to end this session.' };
    }

    const userId = target.userId;
    await sessionService.terminateSession(target._id);
    await auditRepo.log({
      userId,
      sessionId: target._id,
      action: 'auth.session.revoked',
      status: 'SUCCESS',
      errorCode: null,
      actor: { type: 'user', id: userId },
      source: { platform: 'web', appVersion: '0.1.0' },
      correlationId: null,
      requestId: null,
      resource: { type: 'session', id: target._id.toString() },
      metadata: { reason: 'user initiated' },
      ipAddress: target.ipAddress,
      userAgent: target.userAgent,
    });

    revalidatePath('/dashboard/sessions');
    return { success: true };
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Unable to end session.' };
  }
}

/**
 * Self-service "Log out all other devices". Keeps the caller's current session
 * and revokes every other active session for the user (plus its refresh family).
 *
 * C1: wrapped with `withCsrfGuard`.
 */
async function revokeAllOtherSessionsActionImpl(
  _prev: RevokeSessionState | undefined,
  formData: FormData
): Promise<RevokeSessionState> {
  const currentSessionId = typeof formData.get('currentSessionId') === 'string'
    ? (formData.get('currentSessionId') as string)
    : '';

  if (!currentSessionId) {
    return { error: 'Your session could not be identified.' };
  }

  try {
    const session = await requireActiveSession();
    const userId = session.userId;

    const sessionRepo = new SessionRepository();
    const auditRepo = new AuditLogRepository();

    await sessionRepo.revokeAllUserSessionsExcept(userId, new ObjectId(currentSessionId), 'user');

    await auditRepo.log({
      userId,
      sessionId: session._id,
      action: 'auth.session.revoked_all',
      status: 'SUCCESS',
      errorCode: null,
      actor: { type: 'user', id: userId },
      source: { platform: 'web', appVersion: '0.1.0' },
      correlationId: null,
      requestId: null,
      resource: { type: 'session', id: session._id.toString() },
      metadata: { reason: 'user initiated (all other devices)' },
      ipAddress: session.ipAddress,
      userAgent: session.userAgent,
    });

    revalidatePath('/dashboard/sessions');
    return { success: true };
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Unable to end other sessions.' };
  }
}

export const revokeSessionAction = withCsrfGuard(revokeSessionActionImpl);
export const revokeAllOtherSessionsAction = withCsrfGuard(revokeAllOtherSessionsActionImpl);
