import { ObjectId } from 'mongodb';
import { getAuditLogsCollection, withRetry } from '@/database';
import type { AuditLogDocument } from '@/types/auth';

export type NewAuditLog = Omit<AuditLogDocument, '_id' | 'createdAt'>;

export class AuditLogRepository {
  /**
   * Appends an entry to the audit log collection.
   * Runs inside the database retry loop to ensure delivery, but never blocks execution.
   */
  async log(data: NewAuditLog): Promise<void> {
    try {
      await withRetry(async () => {
        const auditColl = await getAuditLogsCollection();
        const doc: AuditLogDocument = {
          _id: new ObjectId(),
          ...data,
          createdAt: new Date(),
        };
        await auditColl.insertOne(doc);
      }, { maxAttempts: 3 });
    } catch (err) {
      // In audit logging, we prefer to log failures server-side rather than
      // crashing the user's operation.
      console.error(
        JSON.stringify({
          level: 'error',
          event: 'db.audit_log.failed',
          error: err instanceof Error ? err.message : String(err),
          action: data.action,
          userId: data.userId?.toString(),
          ts: new Date().toISOString(),
        })
      );
    }
  }

  /**
   * Fetches recent audit log entries ordered by creation date descending.
   */
  async getRecentLogs(limit = 10): Promise<AuditLogDocument[]> {
    const auditColl = await getAuditLogsCollection();
    return auditColl.find().sort({ createdAt: -1 }).limit(limit).toArray();
  }
}
