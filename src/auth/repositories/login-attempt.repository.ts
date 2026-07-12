import { ObjectId } from 'mongodb';
import { getLoginAttemptsCollection } from '@/database';
import type { LoginAttemptDocument } from '@/types/auth';

export type NewLoginAttempt = Omit<LoginAttemptDocument, '_id' | 'createdAt'>;

export class LoginAttemptRepository {
  /**
   * Inserts a new login attempt record.
   */
  async recordAttempt(data: NewLoginAttempt): Promise<void> {
    const attemptsColl = await getLoginAttemptsCollection();
    const doc: LoginAttemptDocument = {
      _id: new ObjectId(),
      ...data,
      createdAt: new Date(),
    };
    await attemptsColl.insertOne(doc);
  }

  /**
   * Counts failed login attempts from a given IP within a specified time window.
   */
  async countRecentByIp(ip: string, windowMs: number): Promise<number> {
    const attemptsColl = await getLoginAttemptsCollection();
    const thresholdDate = new Date(Date.now() - windowMs);
    return attemptsColl.countDocuments({
      ipAddress: ip,
      success: false,
      createdAt: { $gte: thresholdDate },
    });
  }

  /**
   * Counts failed login attempts for a specific identifier (e.g. email) within a window.
   */
  async countRecentByIdentifier(identifier: string, windowMs: number): Promise<number> {
    const attemptsColl = await getLoginAttemptsCollection();
    const thresholdDate = new Date(Date.now() - windowMs);
    return attemptsColl.countDocuments({
      identifier: identifier.trim().toLowerCase(),
      success: false,
      createdAt: { $gte: thresholdDate },
    });
  }

  /**
   * Checks if there is an active lockout for a given identifier.
   * Returns the expiration date of the lockout, or null.
   */
  async getActiveLockout(identifier: string): Promise<Date | null> {
    const attemptsColl = await getLoginAttemptsCollection();
    const now = new Date();
    const lastLockout = await attemptsColl.findOne(
      {
        identifier: identifier.trim().toLowerCase(),
        lockExpiresAt: { $gt: now },
      },
      {
        sort: { lockExpiresAt: -1 },
      }
    );
    return lastLockout?.lockExpiresAt || null;
  }
}
