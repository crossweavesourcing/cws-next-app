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
Object.defineProperty(exports, "__esModule", { value: true });
exports.createConsoleSecuritySink = createConsoleSecuritySink;
exports.createWebhookSecuritySink = createWebhookSecuritySink;
exports.createDefaultSecuritySink = createDefaultSecuritySink;
exports.getActiveSecuritySink = getActiveSecuritySink;
exports.setupSecurityAlerting = setupSecurityAlerting;
exports.setupDatabaseObservability = setupDatabaseObservability;
/** Structured JSON log line emitter. */
function emitLog(level, fields) {
    var line = JSON.stringify(__assign(__assign({ level: level }, fields), { ts: new Date().toISOString() }));
    if (level === 'error') {
        console.error(line);
    }
    else if (level === 'warn') {
        console.warn(line);
    }
    else {
        console.log(line);
    }
}
/** Default sink: structured JSON to `console.warn` — keeps current behavior. */
function createConsoleSecuritySink() {
    return {
        send: function (event) {
            console.warn(JSON.stringify(__assign({ level: 'warn', event: 'security.alert' }, event)));
        },
    };
}
/**
 * Webhook sink: POSTs a compact JSON event to `SECURITY_WEBHOOK_URL`.
 * Fire-and-forget — failures are logged but never propagated to the caller.
 */
function createWebhookSecuritySink(url) {
    var endpoint = url;
    return {
        send: function (event) {
            void fetch(endpoint, {
                method: 'POST',
                headers: { 'content-type': 'application/json' },
                body: JSON.stringify(__assign({ event: 'security.alert' }, event)),
                // Don't keep the process alive solely to flush this request.
                keepalive: true,
            }).catch(function (err) {
                return console.error(JSON.stringify({
                    level: 'error',
                    event: 'security.alert.sink_failed',
                    error: err instanceof Error ? err.message : String(err),
                    ts: new Date().toISOString(),
                }));
            });
        },
    };
}
/**
 * Resolve the configured sink: webhook when `SECURITY_WEBHOOK_URL` is set,
 * otherwise the console sink.
 */
function createDefaultSecuritySink() {
    var url = process.env.SECURITY_WEBHOOK_URL;
    return url ? createWebhookSecuritySink(url) : createConsoleSecuritySink();
}
/** Module-level active sink used by the `AlertingService` default path. */
var activeSecuritySink = null;
/** Returns the currently active security sink (set by `setupSecurityAlerting`). */
function getActiveSecuritySink() {
    if (!activeSecuritySink)
        activeSecuritySink = createDefaultSecuritySink();
    return activeSecuritySink;
}
/**
 * Wires up the security alerting sink. Call once, next to
 * `setupDatabaseObservability`, immediately after instantiating the client.
 */
function setupSecurityAlerting(options) {
    var _a;
    activeSecuritySink = (_a = options === null || options === void 0 ? void 0 : options.sink) !== null && _a !== void 0 ? _a : createDefaultSecuritySink();
    emitLog('info', {
        event: 'security.alerting.configured',
        sink: process.env.SECURITY_WEBHOOK_URL ? 'webhook' : 'console',
    });
}
/** Guard against calling setupDatabaseObservability more than once per client instance. */
var observedClients = new WeakSet();
/**
 * Attaches command monitoring listeners to the MongoClient.
 * Call once — immediately after instantiating the client, before .connect().
 *
 * @param client  The MongoClient to monitor (must have monitorCommands: true).
 * @param options Observability configuration.
 */
function setupDatabaseObservability(client, options) {
    var _a, _b;
    if (observedClients.has(client))
        return;
    observedClients.add(client);
    var threshold = (_a = options === null || options === void 0 ? void 0 : options.slowQueryThresholdMs) !== null && _a !== void 0 ? _a : 100;
    var logCommands = (_b = options === null || options === void 0 ? void 0 : options.enableCommandLogging) !== null && _b !== void 0 ? _b : (process.env.NODE_ENV !== 'production');
    // Track start times keyed by MongoDB requestId
    var startTimes = new Map();
    client.on('commandStarted', function (event) {
        startTimes.set(event.requestId, Date.now());
        if (logCommands) {
            emitLog('info', {
                event: 'db.command.started',
                command: event.commandName,
                requestId: event.requestId,
            });
        }
    });
    client.on('commandSucceeded', function (event) {
        var _a, _b, _c, _d, _e;
        var t0 = startTimes.get(event.requestId);
        startTimes.delete(event.requestId);
        if (t0 == null)
            return;
        var durationMs = Date.now() - t0;
        var collection = (_d = (_c = (_b = (_a = event.reply) === null || _a === void 0 ? void 0 : _a.cursor) === null || _b === void 0 ? void 0 : _b.ns) === null || _c === void 0 ? void 0 : _c.split('.')[1]) !== null && _d !== void 0 ? _d : event.commandName;
        if (logCommands) {
            emitLog('info', {
                event: 'db.command.succeeded',
                command: event.commandName,
                collection: collection,
                durationMs: durationMs,
                requestId: event.requestId,
            });
        }
        if (durationMs >= threshold) {
            var slowEvent = {
                command: event.commandName,
                collection: collection,
                durationMs: durationMs,
                requestId: event.requestId,
                timestamp: new Date(),
            };
            emitLog('warn', __assign({ event: 'db.slow_query' }, slowEvent));
            (_e = options === null || options === void 0 ? void 0 : options.onSlowQuery) === null || _e === void 0 ? void 0 : _e.call(options, slowEvent);
        }
    });
    client.on('commandFailed', function (event) {
        var _a, _b, _c, _d;
        var t0 = startTimes.get(event.requestId);
        startTimes.delete(event.requestId);
        var durationMs = t0 != null ? Date.now() - t0 : -1;
        var errEvent = {
            command: event.commandName,
            collection: event.commandName,
            durationMs: durationMs,
            requestId: event.requestId,
            errorCode: (_a = event.failure) === null || _a === void 0 ? void 0 : _a.code,
            errorMsg: (_c = (_b = event.failure) === null || _b === void 0 ? void 0 : _b.message) !== null && _c !== void 0 ? _c : String(event.failure),
            timestamp: new Date(),
        };
        emitLog('error', __assign({ event: 'db.command.failed' }, errEvent));
        (_d = options === null || options === void 0 ? void 0 : options.onCommandError) === null || _d === void 0 ? void 0 : _d.call(options, errEvent);
    });
}
