import type { Document } from 'mongodb';

/**
 * $jsonSchema validator for the `users` collection.
 * validationLevel: "strict", validationAction: "error"
 *
 * Key design notes:
 * - profile.avatar is a structured object (not a plain URL) to support
 *   source tracking and lazy provider sync.
 * - password is nullable — OAuth-only / WhatsApp-only users have none.
 * - No email / phone fields — contact data lives in dedicated collections.
 *
 * Authorization model (consolidated RBAC, Option A):
 * `role` is the single source of truth. There is NO `roleId` / `roles` /
 * `permissions` collection — authorization is enforced by `requireRole` in
 * src/auth/dal.ts purely on the `role` string.
 */
export const usersSchema: Document = {
  bsonType: 'object',
  title: 'users',
  required: ['_id', 'profile', 'role', 'status', 'loginMethods', 'security', 'metadata', 'createdAt', 'updatedAt'],
  additionalProperties: false,
  properties: {
    _id: { bsonType: 'objectId' },

    profile: {
      bsonType: 'object',
      required: ['displayName'],
      additionalProperties: false,
      properties: {
        displayName: { bsonType: 'string', minLength: 1, maxLength: 120 },
        firstName: { bsonType: ['string', 'null'], maxLength: 80 },
        lastName: { bsonType: ['string', 'null'], maxLength: 80 },

        avatar: {
          bsonType: ['object', 'null'],
          additionalProperties: false,
          properties: {
            url: { bsonType: ['string', 'null'], maxLength: 2048 },
            source: { bsonType: ['string', 'null'], enum: ['upload', 'google', 'linkedin', 'gravatar', null] },
            originalUrl: { bsonType: ['string', 'null'], maxLength: 2048 },
            updatedAt: { bsonType: ['date', 'null'] },
          },
        },

        timezone: { bsonType: ['string', 'null'], maxLength: 64 },
        locale: { bsonType: ['string', 'null'], maxLength: 20 },
        employeeId: { bsonType: ['string', 'null'], maxLength: 100 },
        department: { bsonType: ['string', 'null'], maxLength: 100 },
      },
    },

    password: {
      bsonType: ['object', 'null'],
      additionalProperties: false,
      required: ['hash', 'algorithm'],
      properties: {
        hash: { bsonType: 'string' },
        algorithm: { bsonType: 'string', enum: ['argon2id', 'bcrypt'] },
      },
    },

    passwordChangedAt: { bsonType: ['date', 'null'] },
    passwordExpiresAt: { bsonType: ['date', 'null'] },

    role: { bsonType: 'string', enum: ['super_admin', 'admin', 'manager'], description: 'Application-level role; single source of truth for authorization (no roles/permissions collection)' },
    status: {
      bsonType: 'string',
      enum: ['active', 'inactive', 'disabled', 'suspended', 'deleted']
    },

    permissions: {
      bsonType: ['array', 'null'],
      items: {
        bsonType: 'string',
        enum: ['overview', 'page_content', 'categories', 'products'],
      },
      description: 'CMS permissions for manager role; ignored for super_admin/admin',
    },

    loginMethods: {
      bsonType: 'array',
      minItems: 0,
      uniqueItems: true,
      items: { bsonType: 'string', enum: ['password', 'google', 'linkedin', 'whatsapp', 'passkey'] },
    },

    security: {
      bsonType: 'object',
      required: ['failedLoginAttempts', 'lockedUntil', 'mfaEnabled'],
      additionalProperties: false,
      properties: {
        failedLoginAttempts: { bsonType: 'int', minimum: 0 },
        lockedUntil: { bsonType: ['date', 'null'] },
        mfaEnabled: { bsonType: 'bool' },
        totpEnabled: { bsonType: 'bool' },
        webAuthnEnabled: { bsonType: 'bool' },
        requireTwoFactor: { bsonType: ['bool', 'null'] },
        lastPasswordResetRequestAt: { bsonType: ['date', 'null'] },
        forcePasswordChange: { bsonType: 'bool' },
        accountSecurityVersion: { bsonType: 'int', minimum: 1, description: 'Incremented to invalidate all sessions/tokens' },
        passwordStrengthCategory: { bsonType: ['string', 'null'], enum: ['very_weak', 'weak', 'fair', 'strong', 'very_strong', null] },
        passwordStrengthPercent: { bsonType: ['int', 'null'], minimum: 0, maximum: 100 },
        passwordStrengthEvaluatedAt: { bsonType: ['date', 'null'] },
        passwordStrengthEvaluatorVersion: { bsonType: ['string', 'null'], maxLength: 80 },
        twoFaPreference: { bsonType: ['string', 'null'], enum: ['always', 'new_device_only', 'off', null] },
        defaultTwoFaMethod: { bsonType: ['string', 'null'], enum: ['email', 'totp', null] },
      },
    },

    metadata: {
      bsonType: 'object',
      additionalProperties: false,
      properties: {
        invitedBy: { bsonType: ['objectId', 'null'] },
        invitedAt: { bsonType: ['date', 'null'] },
        notes: { bsonType: ['string', 'null'], maxLength: 1000 },
      },
    },

    createdAt: { bsonType: 'date' },
    updatedAt: { bsonType: 'date' },
    deletedAt: { bsonType: ['date', 'null'] },
  },
};
