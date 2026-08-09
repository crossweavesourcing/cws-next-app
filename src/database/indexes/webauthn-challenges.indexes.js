"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.webauthnChallengesIndexes = void 0;
exports.webauthnChallengesIndexes = [
    { key: { challenge: 1, purpose: 1 }, name: 'idx_webauthn_challenge_purpose' },
    { key: { userId: 1, purpose: 1, usedAt: 1 }, name: 'idx_webauthn_user_purpose_active' },
    { key: { tokenHash: 1, purpose: 1, usedAt: 1 }, name: 'idx_webauthn_token_purpose_active' },
    { key: { expiresAt: 1 }, expireAfterSeconds: 0, name: 'ttl_webauthn_challenge_expiresAt' },
];
