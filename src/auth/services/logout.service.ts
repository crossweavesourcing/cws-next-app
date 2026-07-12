import { ObjectId } from 'mongodb';
import { SessionRepository } from '../repositories/session.repository';
import { AuditLogRepository } from '../repositories/audit-log.repository';
import type { RevokedBy } from '@/types/auth';

export class LogoutService {
  private sessionRepo = new SessionRepository();
  private auditLogRepo = new AuditLogRepository();

  /**
   * Performs logout by revoking the session in the database and audit logging the action.
   */
  async logout(sessionId: ObjectId, by: RevokedBy = 'user'): Promise<void> {
    const session = await this.sessionRepo.findById(sessionId);
    if (!session || session.revoked) {
      return;
    }

    await this.sessionRepo.revokeSession(sessionId, by, 'Explicit session logout request');

    // Audit log this logout
    await this.auditLogRepo.log({
      userId: session.userId,
      sessionId,
      action: 'auth.logout.success',
      status: 'SUCCESS',
      errorCode: null,
      actor: { type: 'user', id: session.userId },
      source: { platform: 'web', appVersion: '0.1.0' },
      correlationId: null,
      requestId: null,
      resource: { type: 'session', id: sessionId.toString() },
      metadata: { reason: 'logout' },
      ipAddress: session.ipAddress,
      userAgent: session.userAgent,
    });
  }
}
