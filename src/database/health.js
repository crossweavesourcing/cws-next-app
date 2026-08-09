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
exports.checkDatabaseHealth = checkDatabaseHealth;
var client_1 = require("@/database/client");
var config_1 = require("@/database/config");
/**
 * Runs a lightweight health check against the MongoDB database.
 *
 * Status logic:
 *   healthy   = ping OK + expected number of collections present
 *   degraded  = ping OK + collections missing or fewer than expected (not initialized)
 *   unhealthy = ping failed or any error
 *
 * Usage:
 *   - Kubernetes readiness probe → /api/health route
 *   - Admin dashboard DB status widget
 *   - Pre/post validation in scripts/db-init.ts
 */
function checkDatabaseHealth() {
    return __awaiter(this, void 0, void 0, function () {
        var config, checkedAt, t0, db, latencyMs, colls, collections, EXPECTED_COLLECTIONS, status_1, err_1, latencyMs, error;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    config = (0, config_1.getDatabaseConfig)();
                    checkedAt = new Date();
                    t0 = Date.now();
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, 5, , 6]);
                    return [4 /*yield*/, (0, client_1.getDb)()];
                case 2:
                    db = _a.sent();
                    // Ping the primary
                    return [4 /*yield*/, db.command({ ping: 1 })];
                case 3:
                    // Ping the primary
                    _a.sent();
                    latencyMs = Date.now() - t0;
                    return [4 /*yield*/, db.listCollections().toArray()];
                case 4:
                    colls = _a.sent();
                    collections = colls.length;
                    EXPECTED_COLLECTIONS = 11;
                    if (collections >= EXPECTED_COLLECTIONS) {
                        status_1 = 'healthy';
                    }
                    else {
                        // Ping succeeded but database is not fully initialized
                        status_1 = 'degraded';
                    }
                    return [2 /*return*/, { status: status_1, database: config.dbName, ping: true, latencyMs: latencyMs, collections: collections, checkedAt: checkedAt }];
                case 5:
                    err_1 = _a.sent();
                    latencyMs = Date.now() - t0;
                    error = err_1 instanceof Error ? err_1.message : String(err_1);
                    return [2 /*return*/, {
                            status: 'unhealthy',
                            database: config.dbName,
                            ping: false,
                            latencyMs: latencyMs,
                            collections: 0,
                            checkedAt: checkedAt,
                            error: error,
                        }];
                case 6: return [2 /*return*/];
            }
        });
    });
}
