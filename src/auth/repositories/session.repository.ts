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
}
