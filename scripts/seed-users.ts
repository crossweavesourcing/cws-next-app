import { getDb } from '@/database/client';
import { getEnv } from '@/auth/config/env';
import { COLLECTION_NAMES } from '@/database/constants';
import * as argon2 from 'argon2';
import type { UserDocument } from '@/types/auth';

export async function seedUsers(): Promise<void> {
  const env = getEnv();
  const db = await getDb();

  console.log('Seeding predefined users...');

  // Clear all previous user & authentication-related data in non-production environments.
  const AUTH_COLLECTIONS_TO_CLEAR = [
    COLLECTION_NAMES.USERS,
    COLLECTION_NAMES.USER_EMAILS,
    COLLECTION_NAMES.USER_PHONES,
    COLLECTION_NAMES.OAUTH_ACCOUNTS,
    COLLECTION_NAMES.DEVICES,
    COLLECTION_NAMES.SESSIONS,
    COLLECTION_NAMES.REFRESH_TOKENS,
    COLLECTION_NAMES.VERIFICATION_TOKENS,
    COLLECTION_NAMES.OTP_CODES,
    COLLECTION_NAMES.RECOVERY_CODES,
    COLLECTION_NAMES.AUDIT_LOGS,
    COLLECTION_NAMES.LOGIN_ATTEMPTS,
    COLLECTION_NAMES.PASSWORD_HISTORY,
    COLLECTION_NAMES.TOTP_CREDENTIALS,
    COLLECTION_NAMES.WEBAUTHN_CREDENTIALS,
    COLLECTION_NAMES.MOBILE_AUTH_CHALLENGES,
    COLLECTION_NAMES.PENDING_AUTHENTICATIONS,
  ];

  if (process.env.NODE_ENV !== 'production') {
    for (const name of AUTH_COLLECTIONS_TO_CLEAR) {
      await db.collection(name).deleteMany({});
    }
    console.log('Cleared all previous user accounts and authentication-related data.');
  } else {
    console.log('Skipped clearing user data (production environment).');
  }

  const email = env.ADMIN_SEED_EMAIL;
  const password = env.ADMIN_SEED_PASSWORD;
  const employeeId = env.ADMIN_SEED_EMPLOYEE_ID;

  if (!email || !password || !employeeId) {
    console.warn('⚠️ Seeding skipped: ADMIN_SEED_EMAIL, ADMIN_SEED_PASSWORD, and ADMIN_SEED_EMPLOYEE_ID must be configured in environment.');
    return;
  }

  // Seed default admin user.
  // Authorization is role-string based (see src/auth/dal.ts requireRole);
  // there is intentionally NO roles/permissions collection.
  const usersCollection = db.collection<UserDocument>(COLLECTION_NAMES.USERS);

  // Hash the seed password (do NOT log the plaintext password or its hash).
  //
  // NOTE (FIX-C1): the seed admin password is intentionally weak
  // (ADMIN_SEED_PASSWORD from env) and `forcePasswordChange: true` is set below so
  // it is never long-lived — the admin MUST change it on first login.
  //
  // PEPPER WARNING: if ARGON2_SECRET is introduced AFTER users already exist,
  // every previously-stored hash (computed without the pepper) will stop
  // verifying. This seed script always re-hashes the seed admin, but existing
  // runtime users would need a separate re-hash pass (or forced reset).
  const hash = await argon2.hash(password, {
    secret: env.ARGON2_SECRET ? Buffer.from(env.ARGON2_SECRET) : undefined,
  });

  const fullName = env.ADMIN_SEED_FULL_NAME || env.ADMIN_SEED_FIRST_NAME || 'System Admin';
  const department = env.ADMIN_SEED_DEPARTMENT || 'Operations';

  const adminProfile = {
    displayName: fullName,
    fullName,
    avatar: null,
    timezone: null,
    locale: null,
    employeeId,
    department,
  };

  const adminSecurity = {
    failedLoginAttempts: 0,
    lockedUntil: null,
    mfaEnabled: false,
    lastPasswordResetRequestAt: null,
    forcePasswordChange: true, // Force them to change it on first login!
    accountSecurityVersion: 1,
  };

  // Upsert the user using employeeId as the unique identifier
  const userResult = await usersCollection.findOneAndUpdate(
    { 'profile.employeeId': employeeId },
    {
      $setOnInsert: {
        profile: adminProfile,
        role: 'super_admin',
        permissions: [],
        status: 'active',
        loginMethods: ['password'],
        metadata: {
          invitedBy: null,
          invitedAt: null,
          notes: 'Seeded system admin',
        },
        createdAt: new Date(),
      },
      $set: {
        password: {
          hash,
          algorithm: 'argon2id',
        },
        security: adminSecurity,
        passwordChangedAt: new Date(Date.now() - 48 * 60 * 60 * 1000),
        passwordExpiresAt: null,
        updatedAt: new Date(),
        deletedAt: null,
      },
    },
    { upsert: true, returnDocument: 'after' }
  );

  const userId = userResult?._id;

  if (userId) {
    // Seed their email
    const emailsCollection = db.collection(COLLECTION_NAMES.USER_EMAILS);
    await emailsCollection.updateOne(
      { email },
      {
        $setOnInsert: {
          userId,
          email,
          verified: true,
          verifiedAt: new Date(),
          primary: true,
          enabled: true,
          createdAt: new Date(),
        },
        $set: { updatedAt: new Date() }
      },
      { upsert: true }
    );
    console.log(`✅ Seeded admin user: ${email} (${employeeId})`);
  }
}
