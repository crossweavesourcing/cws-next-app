import type { Document } from 'mongodb';

export const auditLogsSchema: Document = {
  bsonType: 'object',
  title: 'audit_logs',
  required: ['_id', 'action', 'status', 'createdAt'],
  additionalProperties: false,
  properties: {
    _id:       { bsonType: 'objectId' },
    userId:    { bsonType: ['objectId', 'null'] },
    sessionId: { bsonType: ['objectId', 'null'] },
    action:    { bsonType: 'string', minLength: 1, maxLength: 100 },
    status:    { bsonType: 'string', enum: ['SUCCESS', 'FAILURE', 'WARNING'] },
    errorCode: { bsonType: ['string', 'null'], maxLength: 80 },

    actor: {
      bsonType: ['object', 'null'],
      additionalProperties: false,
      properties: {
        type: { bsonType: 'string', enum: ['user', 'admin', 'system'] },
        id:   { bsonType: ['objectId', 'null'] },
      },
    },

    source: {
      bsonType: ['object', 'null'],
      additionalProperties: false,
      properties: {
        platform:   { bsonType: ['string', 'null'], enum: ['web', 'mobile', 'api', null] },
        appVersion: { bsonType: ['string', 'null'], maxLength: 40 },
      },
    },

    correlationId: { bsonType: ['string', 'null'], maxLength: 128 },
    requestId:     { bsonType: ['string', 'null'], maxLength: 128 },

    resource: {
      bsonType: ['object', 'null'],
      additionalProperties: false,
      properties: {
        type: { bsonType: ['string', 'null'], maxLength: 60 },
        id:   { bsonType: ['string', 'null'], maxLength: 128 },
      },
    },

    metadata:  { bsonType: ['object', 'null'], additionalProperties: true },
    ipAddress: { bsonType: ['string', 'null'], maxLength: 45 },
    userAgent: { bsonType: ['string', 'null'], maxLength: 512 },
    createdAt: { bsonType: 'date' },
  },
};
