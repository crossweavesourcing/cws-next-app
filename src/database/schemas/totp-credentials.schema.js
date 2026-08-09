"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.totpCredentialsSchema = void 0;
exports.totpCredentialsSchema = {
    bsonType: 'object',
    title: 'totp_credentials',
    required: ['_id', 'userId', 'secret', 'verifiedAt', 'createdAt', 'updatedAt'],
    additionalProperties: false,
    properties: {
        _id: { bsonType: 'objectId' },
        userId: { bsonType: 'objectId' },
        secret: { bsonType: 'string' },
        verifiedAt: { bsonType: 'date' },
        lastAcceptedTimeStep: { bsonType: ['int', 'long', 'null'] },
        createdAt: { bsonType: 'date' },
        updatedAt: { bsonType: 'date' },
    },
};
