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
   * Counts recent 2FA verification failures for a user within a window.
   * Used to throttle brute-force against the email 2FA code.
   */
  async countRecent2FAFailures(userId: ObjectId, windowMs: number): Promise<number> {
    const attemptsColl = await getLoginAttemptsCollection();
    const thresholdDate = new Date(Date.now() - windowMs);
    return attemptsColl.countDocuments({
      userId,
      identifierType: 'EMAIL',
      success: false,
      failureReason: '2FA verification failed',
      createdAt: { $gte: thresholdDate },
    });
  }

  /**
   * Generic windowed counter. Counts documents matching an arbitrary filter
   * whose `createdAt` falls within `windowMs` of now. Reused by the 2FA
   * resend throttle and OAuth per-IP limit rather than adding a bespoke method
   * per flow. All state lives in MongoDB (no in-memory maps), so limits are
   * coherent across serverless instances.
   */
  async countRecentByFilter(filter: Record<string, unknown>, windowMs: number): Promise<number> {
    const attemptsColl = await getLoginAttemptsCollection();
    const thresholdDate = new Date(Date.now() - windowMs);
    return attemptsColl.countDocuments({
      ...filter,
      createdAt: { $gte: thresholdDate },
    });
  }

  /**
   * Counts recent documents matching an IP-only filter within a window. Used
   * for per-IP limits (e.g. OAuth callback) where we do NOT want to constrain
   * by identifier (the identifier is constant across all OAuth callers).
   */
  async countRecentByIpFilter(
    ip: string,
    filter: Record<string, unknown>,
    windowMs: number
  ): Promise<number> {
    const attemptsColl = await getLoginAttemptsCollection();
    const thresholdDate = new Date(Date.now() - windowMs);
    return attemptsColl.countDocuments({
      ipAddress: ip,
      ...filter,
      createdAt: { $gte: thresholdDate },
    });
  }

  /**
   * Records a 2FA verification attempt (success or failure) for audit + throttling.
   */
  async record2FAAttempt(data: {
    userId: ObjectId;
    success: boolean;
    failureReason: string | null;
    ipAddress: string;
    userAgent: string | null;
  }): Promise<void> {
    const attemptsColl = await getLoginAttemptsCollection();
    await attemptsColl.insertOne({
      _id: new ObjectId(),
      userId: data.userId,
      identifierType: 'EMAIL',
      identifier: data.userId.toHexString(),
      ipAddress: data.ipAddress,
      userAgent: data.userAgent,
      device: null,
      success: data.success,
      failureReason: data.failureReason,
      lockExpiresAt: null,
      correlationId: null,
      country: null,
      city: null,
      createdAt: new Date(),
    } as LoginAttemptDocument);
  }

  /**
   * FIX-07: Records a password-reset *request* (success:true) so it can be
   * throttled independently of login failures. Uses a dedicated identifierType
   * to avoid polluting failure-based rate limits.
   */
  async recordResetRequest(identifier: string, ip: string): Promise<void> {
    const attemptsColl = await getLoginAttemptsCollection();
    await attemptsColl.insertOne({
      _id: new ObjectId(),
      userId: null,
      identifierType: 'PASSWORD_RESET_REQUEST',
      identifier: identifier.trim().toLowerCase(),
      ipAddress: ip,
      userAgent: null,
      device: null,
      success: true,
      failureReason: null,
      lockExpiresAt: null,
      correlationId: null,
      country: null,
      city: null,
      createdAt: new Date(),
    } as LoginAttemptDocument);
  }

  /**
   * FIX-07: Counts reset requests for a given identifier within a window, for
   * the per-email reset throttle (≤ N requests / window).
   */
  async countRecentResetRequests(identifier: string, windowMs: number): Promise<number> {
    const attemptsColl = await getLoginAttemptsCollection();
    const thresholdDate = new Date(Date.now() - windowMs);
    return attemptsColl.countDocuments({
      identifier: identifier.trim().toLowerCase(),
      identifierType: 'PASSWORD_RESET_REQUEST',
      createdAt: { $gte: thresholdDate },
    });
  }

  /**
   * Recent login attempts for a user (newest first), for the login-history page.
   */
  async recentForUser(userId: ObjectId, limit = 50): Promise<LoginAttemptDocument[]> {
    const attemptsColl = await getLoginAttemptsCollection();
    return attemptsColl
      .find({ userId })
      .sort({ createdAt: -1 })
      .limit(limit)
      .toArray();
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
