import { getPasswordPoliciesCollection, getUsersCollection, getWebAuthnCredentialsCollection } from '@/database';
import { getDb } from '@/database/client';
import { COLLECTION_NAMES } from '@/database/constants';
import { usersSchema } from '@/database/schemas/users.schema';
import { webauthnCredentialsSchema } from '@/database/schemas/webauthn-credentials.schema';
import { DEFAULT_PASSWORD_POLICY } from '@/auth/validation/password-policy';
import { ObjectId } from 'mongodb';

export interface AccountSecurityMigrationReport {
  usersMissingStrengthMetadata: number;
  usersBackfilled: number;
  webAuthnCredentialsMissingMetadata: number;
  webAuthnCredentialsBackfilled: number;
  policyUpdated: boolean;
  dryRun: boolean;
}

export async function migrateAccountSecurity(options: { dryRun: boolean }): Promise<AccountSecurityMigrationReport> {
  const users = await getUsersCollection();
  const policies = await getPasswordPoliciesCollection();
  const passkeys = await getWebAuthnCredentialsCollection();
  const missingFilter = { 'security.passwordStrengthCategory': { $exists: false } };
  const usersMissingStrengthMetadata = await users.countDocuments(missingFilter);
  const passkeyMissingFilter = { webauthnUserID: { $exists: false } };
  const webAuthnCredentialsMissingMetadata = await passkeys.countDocuments(passkeyMissingFilter);

  if (options.dryRun) {
    return {
      usersMissingStrengthMetadata,
      usersBackfilled: 0,
      webAuthnCredentialsMissingMetadata,
      webAuthnCredentialsBackfilled: 0,
      policyUpdated: false,
      dryRun: true,
    };
  }

  // Install the compatible validator before writing the newly declared fields.
  const db = await getDb();
  await db.command({
    collMod: COLLECTION_NAMES.USERS,
    validator: { $jsonSchema: usersSchema },
    validationLevel: 'strict',
    validationAction: 'error',
  });

  const result = await users.updateMany(missingFilter, {
    $set: {
      'security.passwordStrengthCategory': null,
      'security.passwordStrengthPercent': null,
      'security.passwordStrengthEvaluatedAt': null,
      'security.passwordStrengthEvaluatorVersion': null,
    },
  });
  const passkeyResult = await passkeys.updateMany(passkeyMissingFilter, [
    {
      $set: {
        webauthnUserID: { $toString: '$userId' },
        deviceObjectId: { $ifNull: ['$deviceObjectId', null] },
        credentialDeviceType: null,
        credentialBackedUp: null,
        transports: { $ifNull: ['$transports', []] },
        name: { $ifNull: ['$name', 'Passkey'] },
        lastUsedAt: { $ifNull: ['$lastUsedAt', null] },
        updatedAt: new Date(),
      },
    },
  ]);
  await users.updateMany(
    { 'security.defaultTwoFaMethod': 'webauthn' },
    { $set: { 'security.defaultTwoFaMethod': 'email' } }
  );
  await db.command({
    collMod: COLLECTION_NAMES.WEBAUTHN_CREDENTIALS,
    validator: { $jsonSchema: webauthnCredentialsSchema },
    validationLevel: 'strict',
    validationAction: 'error',
  });
  const now = new Date();
  const policyValues = {
    minLength: DEFAULT_PASSWORD_POLICY.minLength,
    maxLength: DEFAULT_PASSWORD_POLICY.maxLength,
    requireUppercase: false,
    requireLowercase: false,
    requireNumber: false,
    requireSpecialChar: false,
    expirationDays: 0,
    updatedAt: now,
  };
  const existingPolicy = await policies.findOne({ name: 'default' }, { projection: { _id: 1 } });
  if (existingPolicy) {
    await policies.updateOne({ _id: existingPolicy._id }, { $set: policyValues });
  } else {
    await policies.insertOne({
      _id: new ObjectId(),
      name: 'default',
      ...policyValues,
      historyCount: DEFAULT_PASSWORD_POLICY.historyCount,
      createdAt: now,
    });
  }

  return {
    usersMissingStrengthMetadata,
    usersBackfilled: result.modifiedCount,
    webAuthnCredentialsMissingMetadata,
    webAuthnCredentialsBackfilled: passkeyResult.modifiedCount,
    policyUpdated: true,
    dryRun: false,
  };
}
