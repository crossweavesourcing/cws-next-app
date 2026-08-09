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
exports.registerShutdownHandlers = registerShutdownHandlers;
var client_1 = require("@/database/client");
/** Guards against registering handlers more than once. */
var handlersRegistered = false;
/**
 * Registers SIGTERM and SIGINT signal handlers for graceful shutdown.
 *
 * On signal received:
 *   1. Calls onBeforeShutdown (if provided)
 *   2. Closes MongoClient (with timeout guard)
 *   3. Calls onAfterShutdown (if provided)
 *   4. process.exit(0)
 *
 * On timeout: logs error and calls process.exit(1).
 * On second signal: forces process.exit(1) immediately.
 */
function registerShutdownHandlers(options) {
    var _this = this;
    var _a;
    if (handlersRegistered)
        return;
    handlersRegistered = true;
    var timeoutMs = (_a = options === null || options === void 0 ? void 0 : options.timeoutMs) !== null && _a !== void 0 ? _a : 5000;
    var shutdownInProgress = false;
    var shutdown = function (signal) { return __awaiter(_this, void 0, void 0, function () {
        var timer, client, err_1;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    if (shutdownInProgress) {
                        console.error(JSON.stringify({ level: 'error', event: 'db.shutdown.forced', signal: signal, ts: new Date().toISOString() }));
                        process.exit(1);
                    }
                    shutdownInProgress = true;
                    console.log(JSON.stringify({ level: 'info', event: 'db.shutdown.started', signal: signal, ts: new Date().toISOString() }));
                    timer = setTimeout(function () {
                        console.error(JSON.stringify({
                            level: 'error',
                            event: 'db.shutdown.timeout',
                            timeoutMs: timeoutMs,
                            ts: new Date().toISOString(),
                        }));
                        process.exit(1);
                    }, timeoutMs);
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, 8, , 9]);
                    if (!(options === null || options === void 0 ? void 0 : options.onBeforeShutdown)) return [3 /*break*/, 3];
                    return [4 /*yield*/, Promise.resolve(options.onBeforeShutdown())];
                case 2:
                    _a.sent();
                    _a.label = 3;
                case 3: return [4 /*yield*/, (0, client_1.getMongoClient)()];
                case 4:
                    client = _a.sent();
                    return [4 /*yield*/, client.close()];
                case 5:
                    _a.sent();
                    if (!(options === null || options === void 0 ? void 0 : options.onAfterShutdown)) return [3 /*break*/, 7];
                    return [4 /*yield*/, Promise.resolve(options.onAfterShutdown())];
                case 6:
                    _a.sent();
                    _a.label = 7;
                case 7:
                    clearTimeout(timer);
                    console.log(JSON.stringify({ level: 'info', event: 'db.shutdown.complete', ts: new Date().toISOString() }));
                    process.exit(0);
                    return [3 /*break*/, 9];
                case 8:
                    err_1 = _a.sent();
                    clearTimeout(timer);
                    console.error(JSON.stringify({
                        level: 'error',
                        event: 'db.shutdown.error',
                        error: err_1 instanceof Error ? err_1.message : String(err_1),
                        ts: new Date().toISOString(),
                    }));
                    process.exit(1);
                    return [3 /*break*/, 9];
                case 9: return [2 /*return*/];
            }
        });
    }); };
    process.on('SIGTERM', function () { return shutdown('SIGTERM'); });
    process.on('SIGINT', function () { return shutdown('SIGINT'); });
}
