import { getDb } from '@/database/client';
import { getEnv } from '@/auth/config/env';
import { COLLECTION_NAMES } from '@/database/constants';
import * as argon2 from 'argon2';
import { ObjectId } from 'mongodb';
import type { UserDocument } from '@/types/auth';

export async function seedUsers(): Promise<void> {
  const env = getEnv();
  const db = await getDb();
  
  console.log('Seeding predefined users...');

  // Clear any past rate limits & login attempt records to reset E2E state
  await db.collection(COLLECTION_NAMES.LOGIN_ATTEMPTS).deleteMany({});
  console.log('Cleared past login attempts and rate limits.');

  const email = env.ADMIN_SEED_EMAIL;
  const password = env.ADMIN_SEED_PASSWORD;
  const employeeId = env.ADMIN_SEED_EMPLOYEE_ID;

  if (!email || !password || !employeeId) {
    console.warn('⚠️ Seeding skipped: ADMIN_SEED_EMAIL, ADMIN_SEED_PASSWORD, and ADMIN_SEED_EMPLOYEE_ID must be configured in environment.');
    return;
  }

  // Ensure default roles exist
  const rolesCollection = db.collection(COLLECTION_NAMES.ROLES);
  
  const systemAdminRole = {
    name: 'System Admin',
    slug: 'system-admin',
    description: 'Full system access',
    permissions: ['*'], // Special wildcard or explicitly all permissions
    isSystem: true,
  };

  const roleUpdateResult = await rolesCollection.findOneAndUpdate(
    { slug: 'system-admin' },
    { 
      $setOnInsert: { 
        ...systemAdminRole, 
        createdAt: new Date() 
      },
      $set: { updatedAt: new Date() }
    },
    { upsert: true, returnDocument: 'after' }
  );
  
  const adminRoleId = roleUpdateResult?._id;

  if (!adminRoleId) {
    throw new Error('Failed to create or retrieve System Admin role.');
  }

  // Seed default admin user
  const usersCollection = db.collection<UserDocument>(COLLECTION_NAMES.USERS);
  

  console.log(`Seeding password: "${password}" (length: ${password.length})`);
  // Hash the seed password
  const hash = await argon2.hash(password, {
    secret: env.ARGON2_SECRET ? Buffer.from(env.ARGON2_SECRET) : undefined,
  });
  console.log(`Generated seed hash: "${hash}"`);

  const firstName = env.ADMIN_SEED_FIRST_NAME || 'System';
  const lastName = env.ADMIN_SEED_LAST_NAME || 'Admin';
  const department = env.ADMIN_SEED_DEPARTMENT || 'Operations';

  const adminProfile = {
    displayName: `${firstName} ${lastName}`,
    firstName,
    lastName,
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
        role: 'admin',
        roleId: adminRoleId,
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
        passwordChangedAt: new Date(),
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
