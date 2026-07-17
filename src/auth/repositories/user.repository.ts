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
   *
   * @deprecated Use {@link incrementFailedAndGet} instead. `incrementFailedAttempts`
   * increments then requires a SEPARATE `findById` reload to read the new count,
   * which is vulnerable to a lost-update race (H-5): concurrent failures can
   * interleave and miscount, delaying lockout. Kept for backward compatibility.
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
   * H-5 fix: atomically increments the failed-login counter AND returns the
   * updated document in a single conditional write. The
   * `'security.failedLoginAttempts': { $lt: THRESHOLD }` predicate ensures the
   * increment only applies while the account is below the lockout threshold, and
   * the returned doc lets the caller decide lockout without a separate reload —
   * eliminating the lost-update window.
   *
   * @param userId    the user to count a failed attempt against
   * @param threshold the lockout threshold (e.g. 5). The write is a no-op (and
   *                  returns `null`) once the counter has already reached it.
   * @returns the updated `UserDocument` (with `returnDocument: 'after'`), or
   *          `null` when no document matching the predicate was found (i.e. the
   *          counter was already at/above the threshold).
   */
  async incrementFailedAndGet(
    userId: ObjectId,
    threshold: number
  ): Promise<UserDocument | null> {
    const usersColl = await getUsersCollection();
    const result = await usersColl.findOneAndUpdate(
      { _id: userId, 'security.failedLoginAttempts': { $lt: threshold } },
      {
        $inc: { 'security.failedLoginAttempts': 1 },
        $set: { updatedAt: new Date() },
      },
      { returnDocument: 'after' }
    );
    return (result as unknown as { value: UserDocument | null } | null)?.value ?? null;
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

  /**
   * Marks a user as requiring a password change on next login (e.g. when the
   * password has passed its configured expiry lifetime).
   */
  async forcePasswordChange(userId: ObjectId): Promise<void> {
    const usersColl = await getUsersCollection();
    await usersColl.updateOne(
      { _id: userId },
      {
        $set: {
          'security.forcePasswordChange': true,
          updatedAt: new Date(),
        },
      }
    );
  }

  /**
   * Returns the user's primary, enabled login email (or null).
   */
  async findPrimaryEmail(userId: ObjectId): Promise<string | null> {
    const emailsColl = await getUserEmailsCollection();
    const rec = await emailsColl.findOne({ userId, primary: true, enabled: true });
    return rec?.email ?? null;
  }

  /**
   * Partially updates a user's security configuration (e.g., enabling MFA).
   */
  async updateSecurity(userId: ObjectId, updates: Partial<UserDocument['security']>): Promise<void> {
    const usersColl = await getUsersCollection();
    const setUpdates: Record<string, any> = { updatedAt: new Date() };
    for (const [key, value] of Object.entries(updates)) {
      setUpdates[`security.${key}`] = value;
    }
    await usersColl.updateOne({ _id: userId }, { $set: setUpdates });
  }

  /**
   * Lists users (newest first) for the admin user-management page. Excludes
   * soft-deleted accounts. Returns a minimal projection to keep payloads small.
   */
  async listUsers(limit = 100): Promise<Array<{
    _id: ObjectId;
    displayName: string;
    role: UserDocument['role'];
    status: UserDocument['status'];
    email: string | null;
  }>> {
    const usersColl = await getUsersCollection();
    const users = await usersColl
      .find({ deletedAt: null })
      .sort({ createdAt: -1 })
      .limit(limit)
      .toArray();

    const emailColl = await getUserEmailsCollection();
    const emails = await emailColl
      .find({ userId: { $in: users.map((u) => u._id) }, primary: true, enabled: true })
      .toArray();
    const emailByUser = new Map(emails.map((e) => [e.userId.toString(), e.email]));

    return users.map((u) => ({
      _id: u._id,
      displayName: u.profile.displayName,
      role: u.role,
      status: u.status,
      email: emailByUser.get(u._id.toString()) ?? null,
    }));
  }
}
