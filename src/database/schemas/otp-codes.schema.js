"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.otpCodesSchema = void 0;
exports.otpCodesSchema = {
    bsonType: 'object',
    title: 'otp_codes',
    required: ['_id', 'e164', 'otpHash', 'type', 'attempts', 'maxAttempts', 'consumed', 'expiresAt', 'createdAt'],
    additionalProperties: false,
    properties: {
        _id: { bsonType: 'objectId' },
        userId: { bsonType: ['objectId', 'null'] },
        e164: { bsonType: 'string', pattern: '^\\+[1-9]\\d{6,14}$' },
        otpHash: { bsonType: 'string', minLength: 64, maxLength: 64 },
        type: { bsonType: 'string', enum: ['whatsapp_login', 'phone_verification'] },
        attempts: { bsonType: 'int', minimum: 0 },
        maxAttempts: { bsonType: 'int', minimum: 1, maximum: 10 },
        consumed: { bsonType: 'bool' },
        consumedAt: { bsonType: ['date', 'null'] },
        expiresAt: { bsonType: 'date' },
        createdAt: { bsonType: 'date' },
    },
};
