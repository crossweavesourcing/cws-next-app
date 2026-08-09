"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.loginAttemptsIndexes = void 0;
exports.loginAttemptsIndexes = [
    // 1. IP-based rate limiting: count attempts from an IP in a time window.
    {
        key: { ipAddress: 1, createdAt: -1 },
        name: 'idx_ipAddress_createdAt',
    },
    // 2. Per-identifier rate limiting: count attempts per email/phone in a window.
    //    Dedicated (identifier, createdAt) index for the rate-limit service.
    //    (The existing idx_identifier_createdAt also covers identifierType, which
    //    the reset-request throttle needs; this one is the identifier-only shape.)
    {
        key: { identifier: 1, createdAt: -1 },
        name: 'idx_identifier_createdAt',
    },
    // 3. Composite (identifierType, identifier, createdAt) — used by the
    //    per-email reset throttle and 2FA-failure counters which filter by type.
    {
        key: { identifierType: 1, identifier: 1, createdAt: -1 },
        name: 'idx_identifierType_createdAt',
    },
    // 4. TTL — 24-hour default retention (on createdAt; login_attempts has no
    //    separate expiresAt field). Tune via collMod for geo-anomaly or
    //    compliance requirements.
    {
        key: { createdAt: 1 },
        expireAfterSeconds: 86400, // 24 hours
        name: 'ttl_createdAt',
    },
];
