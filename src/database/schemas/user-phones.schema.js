"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.userPhonesSchema = void 0;
exports.userPhonesSchema = {
    bsonType: 'object',
    title: 'user_phones',
    required: ['_id', 'userId', 'e164', 'verified', 'primary', 'enabled', 'createdAt', 'updatedAt'],
    additionalProperties: false,
    properties: {
        _id: { bsonType: 'objectId' },
        userId: { bsonType: 'objectId' },
        e164: {
            bsonType: 'string',
            pattern: '^\\+[1-9]\\d{6,14}$',
        },
        verified: { bsonType: 'bool' },
        verifiedAt: { bsonType: ['date', 'null'] },
        primary: { bsonType: 'bool' },
        enabled: { bsonType: 'bool' },
        createdAt: { bsonType: 'date' },
        updatedAt: { bsonType: 'date' },
    },
};
