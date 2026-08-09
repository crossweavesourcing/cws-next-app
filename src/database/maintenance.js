"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.archiveAuditLogs = archiveAuditLogs;
exports.sweepExpiredAuthState = sweepExpiredAuthState;
exports.pruneExpiredDocuments = pruneExpiredDocuments;
exports.getCollectionStats = getCollectionStats;
var client_1 = require("@/database/client");
var constants_1 = require("@/database/constants");
/**
 * Archives audit_logs documents older than `options.olderThan` to a cold
 * collection (`audit_logs_archive` by default).
 *
 * Uses batched insertMany + deleteMany to avoid large transactions.
 * Documents are inserted into the archive before being deleted from the
 * hot collection — safe to interrupt and resume.
 *
 * Audit log growth management strategy (apply in order):
 *   1. TTL index (180d hot window, always active) — handles common case automatically
 *   2. archiveAuditLogs() nightly — preserves docs in cold storage before TTL deletes them
 *   3. Reduce TTL via collMod — only after archival is confirmed
 *   4. audit_logs_archive — cold storage, minimal indexes (_id + createdAt)
 */
function archiveAuditLogs(options) {
    return __awaiter(this, void 0, void 0, function () {
        var db, batchSize, archiveName, dryRun, hotColl, archiveColl, filter, t0, scanned, archived, errors, hasMore, batch, ids, _a;
        var _b, _c, _d;
        return __generator(this, function (_e) {
            switch (_e.label) {
                case 0: return [4 /*yield*/, (0, client_1.getDb)()];
                case 1:
                    db = _e.sent();
                    batchSize = (_b = options.batchSize) !== null && _b !== void 0 ? _b : 500;
                    archiveName = (_c = options.archiveCollection) !== null && _c !== void 0 ? _c : 'audit_logs_archive';
                    dryRun = (_d = options.dryRun) !== null && _d !== void 0 ? _d : false;
                    hotColl = db.collection(constants_1.COLLECTION_NAMES.AUDIT_LOGS);
                    archiveColl = db.collection(archiveName);
                    filter = { createdAt: { $lt: options.olderThan } };
                    t0 = Date.now();
                    scanned = 0;
                    archived = 0;
                    errors = 0;
                    if (!dryRun) return [3 /*break*/, 3];
                    return [4 /*yield*/, hotColl.countDocuments(filter)];
                case 2:
                    scanned = _e.sent();
                    return [2 /*return*/, { scanned: scanned, archived: 0, errors: 0, durationMs: Date.now() - t0, dryRun: true }];
                case 3:
                    hasMore = true;
                    _e.label = 4;
                case 4:
                    if (!hasMore) return [3 /*break*/, 11];
                    return [4 /*yield*/, hotColl.find(filter).limit(batchSize).toArray()];
                case 5:
                    batch = _e.sent();
                    if (batch.length === 0) {
                        hasMore = false;
                        return [3 /*break*/, 11];
                    }
                    scanned += batch.length;
                    _e.label = 6;
                case 6:
                    _e.trys.push([6, 9, , 10]);
                    return [4 /*yield*/, archiveColl.insertMany(batch, { ordered: false })];
                case 7:
                    _e.sent();
                    ids = batch.map(function (d) { return d._id; });
                    return [4 /*yield*/, hotColl.deleteMany({ _id: { $in: ids } })];
                case 8:
                    _e.sent();
                    archived += batch.length;
                    return [3 /*break*/, 10];
                case 9:
                    _a = _e.sent();
                    errors += batch.length;
                    return [3 /*break*/, 10];
                case 10: return [3 /*break*/, 4];
                case 11: return [2 /*return*/, { scanned: scanned, archived: archived, errors: errors, durationMs: Date.now() - t0, dryRun: false }];
            }
        });
    });
}
/**
 * Cleanup sweep for auth lifecycle collections.
 *
 * Removes documents that are logically dead but may not yet have been reaped by
 * MongoDB's TTL monitor (which only runs every ~60s and never reclaims storage
 * instantly):
 *   - refresh_tokens: expired (expiresAt < now) and revoked
 *   - sessions: revoked, OR expired (expiresAt < now)
 *
 * Idempotent and safe to run on a schedule (cron / platform scheduled function /
 * instrumentation heartbeat). Uses the indexes added in indexes/sessions.indexes.ts
 * and indexes/refresh-tokens.indexes.ts so it never does a collection scan.
 *
 * NOTE: The TTL index on refresh_tokens.expiresAt (expireAfterSeconds: 0) already
 * deletes expired tokens automatically; this sweep provides immediate, auditable
 * cleanup and also removes revoked-but-not-yet-expired tokens.
 */
function sweepExpiredAuthState() {
    return __awaiter(this, void 0, void 0, function () {
        var db, now, t0, refreshColl, sessionColl, _a, expiredTokens, revokedTokens, revokedSessions, expiredSessions;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0: return [4 /*yield*/, (0, client_1.getDb)()];
                case 1:
                    db = _b.sent();
                    now = new Date();
                    t0 = Date.now();
                    refreshColl = db.collection(constants_1.COLLECTION_NAMES.REFRESH_TOKENS);
                    sessionColl = db.collection(constants_1.COLLECTION_NAMES.SESSIONS);
                    return [4 /*yield*/, Promise.all([
                            refreshColl.deleteMany({ expiresAt: { $lte: now } }),
                            refreshColl.deleteMany({ revoked: true, expiresAt: { $gt: now } }),
                            sessionColl.deleteMany({ revoked: true }),
                            sessionColl.deleteMany({ expiresAt: { $lte: now } }),
                        ])];
                case 2:
                    _a = _b.sent(), expiredTokens = _a[0], revokedTokens = _a[1], revokedSessions = _a[2], expiredSessions = _a[3];
                    return [2 /*return*/, {
                            refreshTokensExpired: expiredTokens.deletedCount,
                            refreshTokensRevoked: revokedTokens.deletedCount,
                            sessionsRevoked: revokedSessions.deletedCount,
                            sessionsExpired: expiredSessions.deletedCount,
                            durationMs: Date.now() - t0,
                        }];
            }
        });
    });
}
function pruneExpiredDocuments() {
    return __awaiter(this, void 0, void 0, function () {
        var db, now, result, tasks;
        var _this = this;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, (0, client_1.getDb)()];
                case 1:
                    db = _a.sent();
                    now = new Date();
                    result = {};
                    tasks = [
                        { coll: constants_1.COLLECTION_NAMES.REFRESH_TOKENS, filter: { expiresAt: { $lte: now } } },
                        { coll: constants_1.COLLECTION_NAMES.VERIFICATION_TOKENS, filter: { expiresAt: { $lte: now } } },
                        { coll: constants_1.COLLECTION_NAMES.OTP_CODES, filter: { expiresAt: { $lte: now } } },
                        {
                            coll: constants_1.COLLECTION_NAMES.LOGIN_ATTEMPTS,
                            filter: { createdAt: { $lte: new Date(now.getTime() - 86400000) } }, // 24h
                        },
                        {
                            coll: constants_1.COLLECTION_NAMES.AUDIT_LOGS,
                            filter: { createdAt: { $lte: new Date(now.getTime() - 15552000000) } }, // 180d
                        },
                    ];
                    return [4 /*yield*/, Promise.all(tasks.map(function (_a) { return __awaiter(_this, [_a], void 0, function (_b) {
                            var res;
                            var coll = _b.coll, filter = _b.filter;
                            return __generator(this, function (_c) {
                                switch (_c.label) {
                                    case 0: return [4 /*yield*/, db.collection(coll).deleteMany(filter)];
                                    case 1:
                                        res = _c.sent();
                                        result[coll] = res.deletedCount;
                                        return [2 /*return*/];
                                }
                            });
                        }); }))];
                case 2:
                    _a.sent();
                    return [2 /*return*/, result];
            }
        });
    });
}
/**
 * Returns document count, storage size, and index size for all 11 collections.
 * Used by monitoring dashboards and the db:init script post-run report.
 */
function getCollectionStats() {
    return __awaiter(this, void 0, void 0, function () {
        var db, colls, stats;
        var _this = this;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, (0, client_1.getDb)()];
                case 1:
                    db = _a.sent();
                    colls = Object.values(constants_1.COLLECTION_NAMES);
                    return [4 /*yield*/, Promise.all(colls.map(function (collection) { return __awaiter(_this, void 0, void 0, function () {
                            var s, _a;
                            return __generator(this, function (_b) {
                                switch (_b.label) {
                                    case 0:
                                        _b.trys.push([0, 2, , 3]);
                                        return [4 /*yield*/, db.command({ collStats: collection })];
                                    case 1:
                                        s = _b.sent();
                                        return [2 /*return*/, {
                                                collection: collection,
                                                documentCount: s.count,
                                                sizeBytes: s.size,
                                                avgDocSizeBytes: s.avgObjSize,
                                                indexSizeBytes: s.totalIndexSize,
                                            }];
                                    case 2:
                                        _a = _b.sent();
                                        // Collection may not exist yet
                                        return [2 /*return*/, { collection: collection, documentCount: 0, sizeBytes: 0, avgDocSizeBytes: 0, indexSizeBytes: 0 }];
                                    case 3: return [2 /*return*/];
                                }
                            });
                        }); }))];
                case 2:
                    stats = _a.sent();
                    return [2 /*return*/, stats];
            }
        });
    });
}
