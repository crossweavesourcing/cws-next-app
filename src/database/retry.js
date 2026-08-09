"use strict";
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
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
exports.withRetry = withRetry;
var mongodb_1 = require("mongodb");
var DEFAULT_OPTIONS = {
    maxAttempts: 3,
    initialDelayMs: 100,
    maxDelayMs: 5000,
    backoffFactor: 2.0,
    jitterFactor: 0.3,
};
/**
 * MongoDB server error codes that indicate transient conditions.
 * These errors are safe to retry.
 */
var RETRYABLE_SERVER_CODES = new Set([
    11600, // InterruptedAtShutdown
    91, // ShutdownInProgress
    189, // PrimarySteppedDown
    216, // ElectionInProgress
    64, // WriteConcernFailed (transient)
    91, // ShutdownInProgress
]);
/**
 * Returns true if the error is a transient MongoDB error that is safe to retry.
 * Returns false for permanent errors (duplicate key, validation failure, etc.).
 */
function isRetryable(err) {
    if (err instanceof mongodb_1.MongoNetworkError)
        return true;
    if (err instanceof mongodb_1.MongoNetworkTimeoutError)
        return true;
    if (err instanceof mongodb_1.MongoServerError) {
        var code = typeof err.code === 'number' ? err.code : -1;
        return RETRYABLE_SERVER_CODES.has(code);
    }
    return false;
}
/**
 * Computes the delay for a given attempt using exponential backoff + jitter.
 *
 * Formula:
 *   base  = min(initialDelayMs × backoffFactor^(attempt-1), maxDelayMs)
 *   delay = base × (1 + jitterFactor × (Math.random() * 2 - 1))
 */
function computeDelay(attempt, opts) {
    var base = Math.min(opts.initialDelayMs * Math.pow(opts.backoffFactor, attempt - 1), opts.maxDelayMs);
    var jitter = opts.jitterFactor * (Math.random() * 2 - 1); // range: [-factor, +factor]
    return Math.max(0, Math.round(base * (1 + jitter)));
}
var sleep = function (ms) {
    return new Promise(function (resolve) { return setTimeout(resolve, ms); });
};
/**
 * Executes `operation` with automatic retry on transient MongoDB errors.
 *
 * Non-retryable errors (validation failure, duplicate key, etc.) are thrown
 * immediately without consuming retry budget.
 *
 * @param operation A function returning a Promise to retry.
 * @param options   Retry configuration (merged with defaults).
 *
 * @example
 * const result = await withRetry(() => collection.findOne({ _id }));
 */
function withRetry(operation, options) {
    return __awaiter(this, void 0, void 0, function () {
        var opts, lastError, attempt, err_1, delay;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    opts = __assign(__assign({}, DEFAULT_OPTIONS), options);
                    attempt = 1;
                    _a.label = 1;
                case 1:
                    if (!(attempt <= opts.maxAttempts)) return [3 /*break*/, 8];
                    _a.label = 2;
                case 2:
                    _a.trys.push([2, 4, , 7]);
                    return [4 /*yield*/, operation()];
                case 3: return [2 /*return*/, _a.sent()];
                case 4:
                    err_1 = _a.sent();
                    if (!isRetryable(err_1))
                        throw err_1; // permanent error — re-throw immediately
                    lastError = err_1;
                    if (!(attempt < opts.maxAttempts)) return [3 /*break*/, 6];
                    delay = computeDelay(attempt, opts);
                    console.warn(JSON.stringify({
                        level: 'warn',
                        event: 'db.retry',
                        attempt: attempt,
                        maxAttempts: opts.maxAttempts,
                        delayMs: delay,
                        error: err_1 instanceof Error ? err_1.message : String(err_1),
                        ts: new Date().toISOString(),
                    }));
                    return [4 /*yield*/, sleep(delay)];
                case 5:
                    _a.sent();
                    _a.label = 6;
                case 6: return [3 /*break*/, 7];
                case 7:
                    attempt++;
                    return [3 /*break*/, 1];
                case 8: throw lastError;
            }
        });
    });
}
