import { ObjectId } from 'mongodb';
import { getUsersCollection, getUserEmailsCollection } from '@/database';
import type { UserDocument } from '@/types/auth';

/**
 * Repository to perform database access on the `users` and linked collections.
 */
export class UserRepository {
  /**
   * Resolves a user by their verified primary or enabled email address.
   */
  async findByEmail(email: string): Promise<UserDocument | null> {
    const emailsColl = await getUserEmailsCollection();
    
    // Find verified/enabled record for this email
    const emailRecord = await emailsColl.findOne({
      email: email.trim().toLowerCase(),
      enabled: true,
    });

    if (!emailRecord) {
      return null;
    }

    const usersColl = await getUsersCollection();
    return usersColl.findOne({
      _id: emailRecord.userId,
      deletedAt: null,
    });
  }

  /**
   * Loads a user by their unique document ID.
   */
  async findById(id: ObjectId): Promise<UserDocument | null> {
    const usersColl = await getUsersCollection();
    return usersColl.findOne({
      _id: id,
      deletedAt: null,
    });
  }

  /**
   * Increments the count of failed login attempts for a user.
   */
  async incrementFailedAttempts(userId: ObjectId): Promise<void> {
    const usersColl = await getUsersCollection();
    await usersColl.updateOne(
      { _id: userId },
      {
        $inc: { 'security.failedLoginAttempts': 1 },
        $set: { updatedAt: new Date() },
      }
    );
  }

  /**
   * Resets failed login attempts counter to 0 and clears lock status.
   */
  async resetFailedAttempts(userId: ObjectId): Promise<void> {
    const usersColl = await getUsersCollection();
    await usersColl.updateOne(
      { _id: userId },
      {
        $set: {
          'security.failedLoginAttempts': 0,
          'security.lockedUntil': null,
          updatedAt: new Date(),
        },
      }
    );
  }

  /**
   * Locks the user account until a specified future date.
   */
  async lockAccount(userId: ObjectId, until: Date): Promise<void> {
    const usersColl = await getUsersCollection();
    await usersColl.updateOne(
      { _id: userId },
      {
        $set: {
          'security.lockedUntil': until,
          updatedAt: new Date(),
        },
      }
    );
  }

  /**
   * Records details of the last successful login date.
   */
  async recordLastLogin(userId: ObjectId): Promise<void> {
    const usersColl = await getUsersCollection();
    await usersColl.updateOne(
      { _id: userId },
      {
        $set: {
          updatedAt: new Date(),
        },
      }
    );
  }
}
