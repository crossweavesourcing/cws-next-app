import type { Document } from 'mongodb';

export const rolesSchema: Document = {
  bsonType: 'object',
  title: 'roles',
  required: ['_id', 'name', 'slug', 'description', 'permissions', 'isSystem', 'createdAt', 'updatedAt'],
  additionalProperties: false,
  properties: {
    _id:         { bsonType: 'objectId' },
    name:        { bsonType: 'string', minLength: 1, maxLength: 50 },
    slug:        { bsonType: 'string', minLength: 1, maxLength: 50 },
    description: { bsonType: 'string', maxLength: 500 },
    permissions: {
      bsonType: 'array',
      description: 'Array of permissions._id or permission string slugs',
      items: { bsonType: ['objectId', 'string'] },
    },
    isSystem:    { bsonType: 'bool', description: 'System roles cannot be deleted' },
    createdAt:   { bsonType: 'date' },
    updatedAt:   { bsonType: 'date' },
  },
};
