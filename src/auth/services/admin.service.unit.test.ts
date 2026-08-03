import { describe, it, expect, beforeEach, vi, type Mocked } from 'vitest';
import { AdminService } from './admin.service';
import { SessionRepository } from '../repositories/session.repository';
import { RefreshTokenRepository } from '../repositories/refresh-token.repository';
import { AuditLogRepository } from '../repositories/audit-log.repository';
import { requireRole } from '../dal';
import { ObjectId } from 'mongodb';

vi.mock('../repositories/session.repository');
vi.mock('../repositories/refresh-token.repository');
vi.mock('../repositories/audit-log.repository');
vi.mock('../dal');

describe('AdminService', () => {
  let service: AdminService;
  let mockSessionRepo: Mocked<SessionRepository>;
  let mockRefreshRepo: Mocked<RefreshTokenRepository>;
  let mockAuditRepo: Mocked<AuditLogRepository>;

  const adminUserId = new ObjectId();
  const adminSessionId = new ObjectId();

  beforeEach(() => {
    vi.resetAllMocks();
    service = new AdminService();
    mockSessionRepo = (service as unknown as { sessionRepo: Mocked<SessionRepository> }).sessionRepo;
    mockRefreshRepo = (service as unknown as { refreshRepo: Mocked<RefreshTokenRepository> }).refreshRepo;
    mockAuditRepo = (service as unknown as { auditRepo: Mocked<AuditLogRepository> }).auditRepo;

    vi.mocked(requireRole).mockResolvedValue({ 
      _id: adminSessionId,
      userId: adminUserId,
      ipAddress: '127.0.0.1',
      userAgent: 'test-agent'
    } as unknown as Awaited<ReturnType<typeof requireRole>>);
  });

  describe('revokeUserSessions', () => {
    it('throws if userId is invalid', async () => {
      await expect(service.revokeUserSessions('invalid-id')).rejects.toThrow('Invalid user');
    });

    it('throws if trying to revoke own sessions', async () => {
      await expect(service.revokeUserSessions(adminUserId.toString())).rejects.toThrow('You cannot force-logout your own account here.');
    });

    it('revokes sessions successfully and audits', async () => {
      const targetUserId = new ObjectId();
      const sessionIds = [new ObjectId(), new ObjectId()];
      
      mockSessionRepo.findActiveSessionIdsByUserId.mockResolvedValue(sessionIds);
      
      const result = await service.revokeUserSessions(targetUserId.toString());
      
      expect(result).toBe(true);
      expect(requireRole).toHaveBeenCalledWith('super_admin');
      expect(mockSessionRepo.revokeAllUserSessions).toHaveBeenCalledWith(targetUserId, 'admin');
      expect(mockRefreshRepo.revokeBySessions).toHaveBeenCalledWith(sessionIds, 'admin');
      
      expect(mockAuditRepo.log).toHaveBeenCalledWith(expect.objectContaining({
        action: 'auth.session.revoked',
        status: 'SUCCESS',
        actor: { type: 'admin', id: adminUserId },
        resource: { type: 'user', id: targetUserId.toString() },
      }));
    });
  });

  describe('revokeAllSessions', () => {
    it('revokes all sessions successfully and audits', async () => {
      const sessionIds = [new ObjectId(), new ObjectId()];
      
      mockSessionRepo.findAllActiveSessionIds.mockResolvedValue(sessionIds);
      
      const result = await service.revokeAllSessions();
      
      expect(result).toBe(true);
      expect(requireRole).toHaveBeenCalledWith('super_admin');
      expect(mockSessionRepo.revokeAllSessions).toHaveBeenCalledWith('admin');
      expect(mockRefreshRepo.revokeBySessions).toHaveBeenCalledWith(sessionIds, 'admin');
      
      expect(mockAuditRepo.log).toHaveBeenCalledWith(expect.objectContaining({
        action: 'auth.session.revoked_all',
        status: 'SUCCESS',
        actor: { type: 'admin', id: adminUserId },
        resource: { type: 'session', id: 'global' },
      }));
    });
  });
});
