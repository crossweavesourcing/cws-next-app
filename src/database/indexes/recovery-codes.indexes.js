"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.recoveryCodesIndexes = void 0;
exports.recoveryCodesIndexes = [
    // 1. Look up a user's active (unused) recovery codes quickly.
    {
        key: { userId: 1, used: 1 },
        name: 'idx_userId_used',
    },
    // 2. One document per code value — prevent the same code hash being stored twice.
    {
        key: { codeHash: 1 },
        name: 'uniq_codeHash',
        unique: true,
    },
    // 3. TTL — auto-delete a user's recovery-code set ~180 days after generation.
    //    Rotating codes (generate/regenerate) refreshes createdAt, so active
    //    sets stay well within the window.
    {
        key: { createdAt: 1 },
        expireAfterSeconds: 180 * 24 * 60 * 60,
        name: 'ttl_createdAt',
    },
];
