"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.userEmailsSchema = void 0;
exports.userEmailsSchema = {
    bsonType: 'object',
    title: 'user_emails',
    required: ['_id', 'userId', 'email', 'verified', 'primary', 'enabled', 'createdAt', 'updatedAt'],
    additionalProperties: false,
    properties: {
        _id: { bsonType: 'objectId' },
        userId: { bsonType: 'objectId' },
        email: {
            bsonType: 'string',
            minLength: 5,
            maxLength: 254,
            pattern: '^[^@\\s]+@[^@\\s]+\\.[^@\\s]+$',
        },
        verified: { bsonType: 'bool' },
        verifiedAt: { bsonType: ['date', 'null'] },
        primary: { bsonType: 'bool' },
        enabled: { bsonType: 'bool' },
        createdAt: { bsonType: 'date' },
        updatedAt: { bsonType: 'date' },
    },
};
