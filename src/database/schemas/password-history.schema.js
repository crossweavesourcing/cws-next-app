"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.passwordHistorySchema = void 0;
exports.passwordHistorySchema = {
    bsonType: 'object',
    title: 'password_history',
    required: ['_id', 'userId', 'hash', 'algorithm', 'createdAt'],
    additionalProperties: false,
    properties: {
        _id: { bsonType: 'objectId' },
        userId: { bsonType: 'objectId' },
        hash: { bsonType: 'string' },
        algorithm: { bsonType: 'string', enum: ['argon2id', 'bcrypt'] },
        createdAt: { bsonType: 'date' },
    },
};
