import type { Document } from 'mongodb';

export const permissionsSchema: Document = {
  bsonType: 'object',
  title: 'permissions',
  required: ['_id', 'action', 'resource', 'description', 'createdAt', 'updatedAt'],
  additionalProperties: false,
  properties: {
    _id:         { bsonType: 'objectId' },
    action:      { bsonType: 'string', minLength: 1, maxLength: 50 },     // e.g., 'create', 'read', 'update', 'delete', 'manage'
    resource:    { bsonType: 'string', minLength: 1, maxLength: 100 },    // e.g., 'users', 'roles', 'settings'
    description: { bsonType: 'string', maxLength: 500 },
    createdAt:   { bsonType: 'date' },
    updatedAt:   { bsonType: 'date' },
  },
};
