import type { Document } from 'mongodb';

export const sessionsSchema: Document = {
  bsonType: 'object',
  title: 'sessions',
  required: [
    '_id', 'userId', 'loginMethod', 'ipAddress',
    'refreshCount', 'lastActivityAt', 'expiresAt', 'revoked', 'createdAt',
  ],
  additionalProperties: false,
  properties: {
    _id:    { bsonType: 'objectId' },
    userId: { bsonType: 'objectId' },
    deviceId: {
      bsonType: ['objectId', 'null'],
      description: 'References devices._id; null for sessions created before device tracking',
    },
    latestRefreshTokenId: { bsonType: ['objectId', 'null'] },
    loginMethod: {
      bsonType: 'string',
      enum: ['password', 'google', 'linkedin', 'whatsapp'],
    },
    device:          { bsonType: ['string', 'null'], maxLength: 200 },
    platform:        { bsonType: ['string', 'null'], enum: ['web', 'mobile', 'desktop', null] },
    browser:         { bsonType: ['string', 'null'], maxLength: 100 },
    operatingSystem: { bsonType: ['string', 'null'], maxLength: 100 },
    userAgent:       { bsonType: ['string', 'null'], maxLength: 512 },
    ipAddress:       { bsonType: 'string', maxLength: 45 },
    location: {
      bsonType: ['object', 'null'],
      additionalProperties: false,
      properties: {
        country: { bsonType: ['string', 'null'], maxLength: 80 },
        city:    { bsonType: ['string', 'null'], maxLength: 120 },
        region:  { bsonType: ['string', 'null'], maxLength: 120 },
      },
    },
    refreshCount:   { bsonType: 'int', minimum: 0 },
    lastRefreshAt:  { bsonType: ['date', 'null'] },
    lastActivityAt: { bsonType: 'date' },
    // FIX-C2: timestamp of the last REAL login for this session's lineage. Lets
    // refresh enforce an absolute "since last full auth" limit independent of the
    // rolling access-session TTL. Set at createSession; not updated on refresh.
    lastFullAuthAt: { bsonType: ['date', 'null'] },
    expiresAt:      { bsonType: 'date' },
    revoked:        { bsonType: 'bool' },
    revokedBy:      { bsonType: ['string', 'null'], enum: ['user', 'admin', 'system', null] },
    revokedReason:  { bsonType: ['string', 'null'], maxLength: 500 },
    revokedAt:      { bsonType: ['date', 'null'] },
    // FIX-14: snapshot of user.security.accountSecurityVersion at creation, used
    // to invalidate the session if the user's security version is later bumped.
    accountSecurityVersion: { bsonType: ['int', 'null'], minimum: 1 },
    createdAt:      { bsonType: 'date' },
  },
};
