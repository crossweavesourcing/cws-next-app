import type { Document } from 'mongodb';

export const systemSettingsSchema: Document = {
  bsonType: 'object',
  title: 'system_settings',
  required: ['_id', 'key', 'value', 'updatedBy', 'updatedAt'],
  additionalProperties: false,
  properties: {
    _id:       { bsonType: 'objectId' },
    key:       { bsonType: 'string', minLength: 1, maxLength: 100 },
    value:     { bsonType: ['object', 'array', 'string', 'int', 'bool'] },
    updatedBy: { bsonType: ['objectId', 'null'] },
    updatedAt: { bsonType: 'date' },
  },
};
