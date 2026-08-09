"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.totpCredentialsIndexes = void 0;
exports.totpCredentialsIndexes = [
    // 1. One TOTP configuration per user.
    {
        key: { userId: 1 },
        name: 'uniq_userId',
        unique: true,
    },
];
