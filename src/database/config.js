"use strict";
// ─────────────────────────────────────────────────────────────────────────────
// Database Configuration Validation
//
// Validates all required environment variables at call time (process startup).
// Reports ALL violations in a single error — not just the first.
// ─────────────────────────────────────────────────────────────────────────────
var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (Object.prototype.hasOwnProperty.call(b, p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        if (typeof b !== "function" && b !== null)
            throw new TypeError("Class extends value " + String(b) + " is not a constructor or null");
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.DatabaseConfigError = void 0;
exports.getDatabaseConfig = getDatabaseConfig;
/** Thrown when one or more database env vars are missing or malformed. */
var DatabaseConfigError = /** @class */ (function (_super) {
    __extends(DatabaseConfigError, _super);
    function DatabaseConfigError(violations) {
        var _this = this;
        var list = violations.map(function (v) { return "  - ".concat(v); }).join('\n');
        _this = _super.call(this, "Database configuration is invalid:\n".concat(list, "\n\n") +
            "Set these variables in .env (development) or your deployment environment.\n" +
            "See .env.example for the expected format.") || this;
        _this.name = 'DatabaseConfigError';
        _this.violations = violations;
        return _this;
    }
    return DatabaseConfigError;
}(Error));
exports.DatabaseConfigError = DatabaseConfigError;
/** Regex for valid MongoDB database names (MongoDB naming rules). */
var DB_NAME_RE = /^[a-zA-Z0-9_-]{1,38}$/;
/**
 * Validates database environment variables and returns a typed config object.
 *
 * Validations performed:
 *   MONGODB_URI     — present, non-empty, starts with 'mongodb://' or 'mongodb+srv://'
 *   MONGODB_DB_NAME — present, non-empty, matches /^[a-zA-Z0-9_-]{1,38}$/
 *
 * Call once at process startup — not on every request.
 *
 * @throws {DatabaseConfigError} when any variable is missing or invalid.
 */
function getDatabaseConfig() {
    var _a, _b;
    var violations = [];
    var uri = (_a = process.env.MONGODB_URI) !== null && _a !== void 0 ? _a : '';
    var dbName = (_b = process.env.MONGODB_DB_NAME) !== null && _b !== void 0 ? _b : '';
    var webhookUrl = process.env.SECURITY_WEBHOOK_URL;
    // ── MONGODB_URI ────────────────────────────────────────────────────────────
    if (!uri) {
        violations.push('MONGODB_URI: environment variable is not set');
    }
    else if (!uri.startsWith('mongodb://') && !uri.startsWith('mongodb+srv://')) {
        violations.push("MONGODB_URI: must start with 'mongodb://' or 'mongodb+srv://' (value redacted)");
    }
    // ── MONGODB_DB_NAME ────────────────────────────────────────────────────────
    if (!dbName) {
        violations.push('MONGODB_DB_NAME: environment variable is not set');
    }
    else if (!DB_NAME_RE.test(dbName)) {
        violations.push("MONGODB_DB_NAME: must match /^[a-zA-Z0-9_-]{1,38}$/ (got \"".concat(dbName, "\")"));
    }
    // ── SECURITY_WEBHOOK_URL ───────────────────────────────────────────────────
    if (webhookUrl) {
        try {
            var parsedUrl = new URL(webhookUrl);
            if (process.env.NODE_ENV === 'production' && parsedUrl.protocol !== 'https:') {
                violations.push('SECURITY_WEBHOOK_URL: must use https:// in production');
            }
        }
        catch (_c) {
            violations.push('SECURITY_WEBHOOK_URL: must be a valid URL');
        }
    }
    if (violations.length > 0) {
        throw new DatabaseConfigError(violations);
    }
    return { uri: uri, dbName: dbName };
}
