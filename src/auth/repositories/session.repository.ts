import { ObjectId } from 'mongodb';
import { getSessionsCollection } from '@/database';
import type { SessionDocument, RevokedBy } from '@/types/auth';

export type NewSessionData = Omit<SessionDocument, '_id' | 'createdAt'>;

export class SessionRepository {
  /**
   * Inserts a new session record into the database.
   */
  async createSession(data: NewSessionData): Promise<SessionDocument> {
    const sessionsColl = await getSessionsCollection();
    const doc: SessionDocument = {
      _id: new ObjectId(),
      ...data,
      createdAt: new Date(),
    };
    await sessionsColl.insertOne(doc);
    return doc;
  }

  /**
   * Loads a session document by its ID.
   */
  async findById(sessionId: ObjectId): Promise<SessionDocument | null> {
    const sessionsColl = await getSessionsCollection();
    return sessionsColl.findOne({ _id: sessionId });
  }

  /**
   * Finds all non-revoked, unexpired sessions for a user.
   */
  async findActiveByUserId(userId: ObjectId): Promise<SessionDocument[]> {
    const sessionsColl = await getSessionsCollection();
    return sessionsColl
      .find({
        userId,
        revoked: false,
        expiresAt: { $gt: new Date() },
      })
      .toArray();
  }

  /**
   * Revokes a single session.
   */
  async revokeSession(
    sessionId: ObjectId,
    by: RevokedBy,
    reason: string
  ): Promise<void> {
    const sessionsColl = await getSessionsCollection();
    await sessionsColl.updateOne(
      { _id: sessionId },
      {
        $set: {
          revoked: true,
          revokedBy: by,
          revokedReason: reason,
          revokedAt: new Date(),
        },
      }
    );
  }

  /**
   * FIX-10: revokes many sessions in a single batched write (no per-row loop).
   * Only targets not-yet-revoked sessions. Used by the concurrent-session cap
   * so two near-simultaneous logins can't both pass the check and over-provision.
   */
  async revokeManyByIds(
    ids: ObjectId[],
    by: RevokedBy,
    reason: string
  ): Promise<void> {
    if (ids.length === 0) return;
    const sessionsColl = await getSessionsCollection();
    await sessionsColl.updateMany(
      { _id: { $in: ids }, revoked: false },
      {
        $set: {
          revoked: true,
          revokedBy: by,
          revokedReason: reason,
          revokedAt: new Date(),
        },
      }
    );
  }

  /**
   * Revokes all active sessions for a given user.
   */
  async revokeAllUserSessions(userId: ObjectId, by: RevokedBy): Promise<void> {
    const sessionsColl = await getSessionsCollection();
    await sessionsColl.updateMany(
      {
        userId,
        revoked: false,
      },
      {
        $set: {
          revoked: true,
          revokedBy: by,
          revokedReason: 'Bulk administrative user revocation',
          revokedAt: new Date(),
        },
      }
    );
  }

  /**
   * Revokes all active sessions for a user EXCEPT the one identified by
   * `exceptSessionId`. Used after a password change so the user who performed
   * the change keeps their current session while every other device is logged out.
   */
  async revokeAllUserSessionsExcept(
    userId: ObjectId,
    exceptSessionId: ObjectId | null,
    by: RevokedBy
  ): Promise<void> {
    const sessionsColl = await getSessionsCollection();
    const filter: Record<string, unknown> = { userId, revoked: false };
    if (exceptSessionId) {
      filter._id = { $ne: exceptSessionId };
    }
    await sessionsColl.updateMany(filter, {
      $set: {
        revoked: true,
        revokedBy: by,
        revokedReason: 'Bulk administrative user revocation',
        revokedAt: new Date(),
      },
    });
  }

  /**
   * Revokes ALL active sessions across every user (breach-response button).
   * Only targets not-yet-revoked sessions.
   */
  async revokeAllSessions(by: RevokedBy): Promise<void> {
    const sessionsColl = await getSessionsCollection();
    await sessionsColl.updateMany(
      { revoked: false },
      {
        $set: {
          revoked: true,
          revokedBy: by,
          revokedReason: 'Global administrative revocation',
          revokedAt: new Date(),
        },
      }
    );
  }

  /**
   * Returns the ObjectIds of every active (non-revoked, unexpired) session for
   * a user. Used to revoke the associated refresh-token families in one write.
   */
  async findActiveSessionIdsByUserId(userId: ObjectId): Promise<ObjectId[]> {
    const sessionsColl = await getSessionsCollection();
    const docs = await sessionsColl
      .find({ userId, revoked: false, expiresAt: { $gt: new Date() } }, { projection: { _id: 1 } })
      .toArray();
    return docs.map((d) => d._id);
  }

  /**
   * Returns the ObjectIds of every active (non-revoked, unexpired) session for
   * ALL users. Used to revoke every refresh-token family in a global logout.
   */
  async findAllActiveSessionIds(): Promise<ObjectId[]> {
    const sessionsColl = await getSessionsCollection();
    const docs = await sessionsColl
      .find({ revoked: false, expiresAt: { $gt: new Date() } }, { projection: { _id: 1 } })
      .toArray();
    return docs.map((d) => d._id);
  }

  /**
   * Lists a user's sessions (newest first) for the session-management page.
   */
  async listForUser(userId: ObjectId, limit = 20): Promise<SessionDocument[]> {
    const sessionsColl = await getSessionsCollection();
    return sessionsColl
      .find({ userId })
      .sort({ createdAt: -1 })
      .limit(limit)
      .toArray();
  }

  /**
   * FIX-13: revokes all active sessions bound to a specific device for a user.
   * `session.deviceId` is the devices._id (ObjectId) recorded at login. This
   * lets a device block take effect immediately (ends the blocked device's
   * current sessions) rather than only at its next login. Returns the revoked
   * session IDs so callers can also revoke their refresh families.
   */
  async revokeSessionsByDeviceId(
    deviceObjectId: ObjectId,
    userId: ObjectId,
    by: RevokedBy
  ): Promise<ObjectId[]> {
    const sessionsColl = await getSessionsCollection();
    const target = await sessionsColl
      .find({ userId, deviceId: deviceObjectId, revoked: false }, { projection: { _id: 1 } })
      .toArray();
    const ids = target.map((d) => d._id);
    if (ids.length === 0) return ids;
    await sessionsColl.updateMany(
      { _id: { $in: ids } },
      {
        $set: {
          revoked: true,
          revokedBy: by,
          revokedReason: 'Device blocked',
          revokedAt: new Date(),
        },
      }
    );
    return ids;
  }

  /**
   * Points a session at its most recently issued refresh token (rotation chain head).
   */
  async setLatestRefreshToken(sessionId: ObjectId, refreshTokenId: ObjectId): Promise<void> {
    const sessionsColl = await getSessionsCollection();
    await sessionsColl.updateOne(
      { _id: sessionId },
      { $set: { latestRefreshTokenId: refreshTokenId, updatedAt: new Date() } }
    );
  }

  /**
   * Rolls the access-session window forward during a successful refresh-token
   * rotation: sets a fresh `expiresAt` (now + ACCESS_SESSION_TTL_MS) and bumps
   * `lastActivityAt` to now. This keeps the session alive past its original 15-min
   * mark as long as the client keeps refreshing, without touching the FIX-C2
   * absolute cap anchored at `lastFullAuthAt`.
   */
  async renewAccessSession(
    sessionId: ObjectId,
    expiresAt: Date,
    lastActivityAt: Date
  ): Promise<void> {
    const sessionsColl = await getSessionsCollection();
    await sessionsColl.updateOne(
      { _id: sessionId },
      { $set: { expiresAt, lastActivityAt, updatedAt: new Date() } }
    );
  }

  /**
   * Records refresh activity metadata on the session (rotation count + last refresh time).
   */
  async touchRefresh(sessionId: ObjectId, nowMs: number): Promise<void> {
    const sessionsColl = await getSessionsCollection();
    await sessionsColl.updateOne(
      { _id: sessionId },
      {
        $inc: { refreshCount: 1 },
        $set: { lastRefreshAt: new Date(nowMs), updatedAt: new Date(nowMs) },
      }
    );
  }
}
