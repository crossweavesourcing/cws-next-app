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
exports.initializeDatabase = initializeDatabase;
var client_1 = require("@/database/client");
var constants_1 = require("@/database/constants");
var schemas_1 = require("@/database/schemas");
var indexes_1 = require("@/database/indexes");
function getExistingCollectionNames(db) {
    return __awaiter(this, void 0, void 0, function () {
        var list;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, db.listCollections().toArray()];
                case 1:
                    list = _a.sent();
                    return [2 /*return*/, new Set(list.map(function (c) { return c.name; }))];
            }
        });
    });
}
/**
 * Idempotent database initializer.
 *
 * For each collection in COLLECTION_ORDER:
 *   - If collection does not exist: createCollection with $jsonSchema validator
 *   - If collection exists: collMod to apply updated validator
 *   - createIndexes (idempotent — driver/server skips existing indexes)
 *
 * Index creation is NON-FATAL: a failure on one collection (e.g. a transient
 * serverless cold-start blip, or a partial index conflict) is caught, logged,
 * and recorded in `indexErrors` so it never blocks app boot or abort the rest
 * of initialization. Re-run (deploy step / maintenance job) to heal.
 */
function initializeDatabase() {
    return __awaiter(this, void 0, void 0, function () {
        var db, t0, existing, reports, _i, COLLECTION_ORDER_1, collName, schema, indexes, action, indexesAdded, indexErrors, coll, result, err_1, totalCreated, totalUpdated, totalIndexes, hadIndexErrors;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, (0, client_1.getDb)()];
                case 1:
                    db = _a.sent();
                    t0 = Date.now();
                    return [4 /*yield*/, getExistingCollectionNames(db)];
                case 2:
                    existing = _a.sent();
                    reports = [];
                    _i = 0, COLLECTION_ORDER_1 = constants_1.COLLECTION_ORDER;
                    _a.label = 3;
                case 3:
                    if (!(_i < COLLECTION_ORDER_1.length)) return [3 /*break*/, 13];
                    collName = COLLECTION_ORDER_1[_i];
                    schema = schemas_1.ALL_SCHEMAS[collName];
                    indexes = indexes_1.ALL_INDEXES[collName];
                    action = void 0;
                    if (!!existing.has(collName)) return [3 /*break*/, 5];
                    // ── Create new collection ──────────────────────────────────────────────
                    return [4 /*yield*/, db.createCollection(collName, {
                            validator: {
                                $jsonSchema: schema,
                            },
                            validationLevel: 'strict',
                            validationAction: 'error',
                        })];
                case 4:
                    // ── Create new collection ──────────────────────────────────────────────
                    _a.sent();
                    action = 'created';
                    return [3 /*break*/, 7];
                case 5: 
                // ── Update validator on existing collection ────────────────────────────
                return [4 /*yield*/, db.command({
                        collMod: collName,
                        validator: { $jsonSchema: schema },
                        validationLevel: 'strict',
                        validationAction: 'error',
                    })];
                case 6:
                    // ── Update validator on existing collection ────────────────────────────
                    _a.sent();
                    action = 'updated';
                    _a.label = 7;
                case 7:
                    indexesAdded = 0;
                    indexErrors = [];
                    if (!(indexes.length > 0)) return [3 /*break*/, 11];
                    coll = db.collection(collName);
                    _a.label = 8;
                case 8:
                    _a.trys.push([8, 10, , 11]);
                    return [4 /*yield*/, coll.createIndexes(indexes)];
                case 9:
                    result = _a.sent();
                    // `result` lists the names of indexes that were created/ensured.
                    indexesAdded = Array.isArray(result) ? result.length : indexes.length;
                    return [3 /*break*/, 11];
                case 10:
                    err_1 = _a.sent();
                    // Partial failure: capture which index names we attempted so the
                    // operator can audit. Boot must NOT fail because of index drift.
                    indexErrors.push.apply(indexErrors, indexes.map(function (i) { var _a; return (_a = i.name) !== null && _a !== void 0 ? _a : JSON.stringify(i.key); }));
                    console.error(JSON.stringify({
                        level: 'error',
                        event: 'db.init.index.failed',
                        collection: collName,
                        error: err_1 instanceof Error ? err_1.message : String(err_1),
                        attempted: indexes.map(function (i) { var _a; return (_a = i.name) !== null && _a !== void 0 ? _a : JSON.stringify(i.key); }),
                        ts: new Date().toISOString(),
                    }));
                    return [3 /*break*/, 11];
                case 11:
                    reports.push({ collection: collName, action: action, indexesAdded: indexesAdded, indexErrors: indexErrors });
                    _a.label = 12;
                case 12:
                    _i++;
                    return [3 /*break*/, 3];
                case 13:
                    totalCreated = reports.filter(function (r) { return r.action === 'created'; }).length;
                    totalUpdated = reports.filter(function (r) { return r.action === 'updated'; }).length;
                    totalIndexes = reports.reduce(function (sum, r) { return sum + r.indexesAdded; }, 0);
                    hadIndexErrors = reports.some(function (r) { return r.indexErrors.length > 0; });
                    return [2 /*return*/, {
                            collections: reports,
                            totalCreated: totalCreated,
                            totalUpdated: totalUpdated,
                            totalIndexes: totalIndexes,
                            durationMs: Date.now() - t0,
                            hadIndexErrors: hadIndexErrors,
                        }];
            }
        });
    });
}
