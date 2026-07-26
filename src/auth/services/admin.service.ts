import { ObjectId } from 'mongodb';
import { requireRole, InsufficientRoleError } from '../dal';
import { SessionRepository } from '../repositories/session.repository';
import { RefreshTokenRepository } from '../repositories/refresh-token.repository';
import { AuditLogRepository } from '../repositories/audit-log.repository';

export class AdminService {
  private sessionRepo = new SessionRepository();
  private refreshRepo = new RefreshTokenRepository();
  private auditRepo = new AuditLogRepository();

  async revokeUserSessions(userIdRaw: string) {
    if (!userIdRaw || !ObjectId.isValid(userIdRaw)) {
      throw new Error('Invalid user.');
    }

    const adminSession = await requireRole('admin');
    const adminUserId = adminSession.userId;

    if (adminUserId.equals(new ObjectId(userIdRaw))) {
      throw new Error('You cannot force-logout your own account here.');
    }

    const targetId = new ObjectId(userIdRaw);
    const sessionIds = await this.sessionRepo.findActiveSessionIdsByUserId(targetId);

    await this.sessionRepo.revokeAllUserSessions(targetId, 'admin');
    await this.refreshRepo.revokeBySessions(sessionIds, 'admin');

    await this.auditRepo.log({
      userId: targetId,
      sessionId: adminSession._id,
      action: 'auth.session.revoked',
      status: 'SUCCESS',
      errorCode: null,
      actor: { type: 'admin', id: adminUserId },
      source: { platform: 'web', appVersion: '0.1.0' }, // Standard appVersion placeholder or dynamic if supported
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

    return true;
  }

  async revokeAllSessions() {
    const adminSession = await requireRole('admin');
    const adminUserId = adminSession.userId;

    const allSessionIds = await this.sessionRepo.findAllActiveSessionIds();

    await this.sessionRepo.revokeAllSessions('admin');
    await this.refreshRepo.revokeBySessions(allSessionIds, 'admin');

    await this.auditRepo.log({
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

    return true;
  }
}
