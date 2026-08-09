"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.userEmailsIndexes = void 0;
exports.userEmailsIndexes = [
    // 1. Global uniqueness on email; primary login lookup key.
    //    Normalize to lowercase before insert — MongoDB comparisons are case-sensitive.
    {
        key: { email: 1 },
        unique: true,
        name: 'uidx_email',
    },
    // 2. List all email addresses for a given user.
    {
        key: { userId: 1 },
        name: 'idx_userId',
    },
    // 3. Enforce one primary email per user at the database layer.
    {
        key: { userId: 1, primary: 1 },
        unique: true,
        partialFilterExpression: { primary: true },
        name: 'uidx_userId_primary',
    },
];
