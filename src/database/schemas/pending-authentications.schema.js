"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.pendingAuthenticationsSchema = void 0;
exports.pendingAuthenticationsSchema = {
    bsonType: 'object',
    title: 'pending_authentications',
    required: ['_id', 'userId', 'primaryAuthenticationMethod', 'requiredAction', 'tokenHash', 'attemptsRemaining', 'createdAt', 'expiresAt'],
    additionalProperties: false,
    properties: {
        _id: { bsonType: 'objectId' },
        userId: { bsonType: 'objectId' },
        primaryAuthenticationMethod: { bsonType: 'string', enum: ['password', 'google', 'passkey'] },
        requiredAction: { bsonType: 'string', enum: ['require_2fa', 'require_strong_2fa'] },
        deviceObjectId: { bsonType: ['objectId', 'null'] },
        riskLevel: { bsonType: ['string', 'null'], enum: ['low', 'medium', 'high', 'critical', null] },
        riskScore: { bsonType: ['number', 'null'] },
        riskReasonCodes: {
            bsonType: ['array', 'null'],
            items: { bsonType: 'string' }
        },
        tokenHash: { bsonType: 'string' },
        attemptsRemaining: { bsonType: 'int', minimum: 0 },
        createdAt: { bsonType: 'date' },
        expiresAt: { bsonType: 'date' },
        consumedAt: { bsonType: ['date', 'null'] },
    },
};
