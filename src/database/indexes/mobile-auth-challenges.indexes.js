"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.mobileAuthChallengesIndexes = void 0;
exports.mobileAuthChallengesIndexes = [
    { key: { tokenHash: 1 }, unique: true, name: 'uidx_mobile_challenge_tokenHash' },
    { key: { userId: 1, usedAt: 1 }, name: 'idx_mobile_challenge_user_active' },
    { key: { expiresAt: 1 }, expireAfterSeconds: 0, name: 'ttl_mobile_challenge_expiresAt' },
];
