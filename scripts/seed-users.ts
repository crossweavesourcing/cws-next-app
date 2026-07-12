import { getDb } from '@/database/client';
import { getEnv } from '@/auth/config/env';
import { COLLECTION_NAMES } from '@/database/constants';
import * as argon2 from 'argon2';
import { ObjectId } from 'mongodb';
import type { UserDocument } from '@/types/auth';

export async function seedUsers(): Promise<void> {
  const env = getEnv();
  const db = getDb();
  
  console.log('Seeding predefined users...');

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
  
  const email = env.ADMIN_SEED_EMAIL;
  const password = env.ADMIN_SEED_PASSWORD;
  const employeeId = env.ADMIN_SEED_EMPLOYEE_ID;

  // Hash the seed password
  const hash = await argon2.hash(password, {
    secret: env.ARGON2_SECRET ? Buffer.from(env.ARGON2_SECRET) : undefined,
  });

  const adminProfile = {
    displayName: `${env.ADMIN_SEED_FIRST_NAME} ${env.ADMIN_SEED_LAST_NAME}`,
    firstName: env.ADMIN_SEED_FIRST_NAME,
    lastName: env.ADMIN_SEED_LAST_NAME,
    avatar: null,
    timezone: null,
    locale: null,
    employeeId: employeeId,
    department: env.ADMIN_SEED_DEPARTMENT,
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
        security: adminSecurity,
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
