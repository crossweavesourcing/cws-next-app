import type { MongoClient } from 'mongodb';

// ─────────────────────────────────────────────────────────────────────────────
// Database Observability
// Wraps MongoDB driver's built-in command monitoring (monitorCommands: true).
// Zero overhead when disabled — only slow-query events emit in production.
// ─────────────────────────────────────────────────────────────────────────────

export interface SlowQueryEvent {
  command:    string;   // e.g. 'find', 'update', 'aggregate'
  collection: string;   // collection name or '$cmd' for admin commands
  durationMs: number;
  requestId:  number;
  timestamp:  Date;
}

export interface CommandErrorEvent {
  command:    string;
  collection: string;
  durationMs: number;
  requestId:  number;
  errorCode:  number | undefined;
  errorMsg:   string;
  timestamp:  Date;
}

export interface ObservabilityOptions {
  /** Commands taking longer than this threshold are reported as slow. Default: 100ms */
  slowQueryThresholdMs?:  number;
  /**
   * Log every command start/success when true.
   * Should be false in production to avoid log volume.
   * Default: true in development, false otherwise.
   */
  enableCommandLogging?:  boolean;
  /** Called on every slow query event. Use to push metrics or trigger alerts. */
  onSlowQuery?:           (event: SlowQueryEvent) => void;
  /** Called on every failed command. */
  onCommandError?:        (event: CommandErrorEvent) => void;
}

/** Structured JSON log line emitter. */
function emitLog(level: 'info' | 'warn' | 'error', fields: Record<string, unknown>): void {
  const line = JSON.stringify({ level, ...fields, ts: new Date().toISOString() });
  if (level === 'error') {
    console.error(line);
  } else if (level === 'warn') {
    console.warn(line);
  } else {
    console.log(line);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Security Alerting Sink
//
// Forwards key security events (token reuse, suspicious logins, failure spikes)
// to an external sink. Default = structured `console.warn` JSON (preserves the
// existing behavior); when `SECURITY_WEBHOOK_URL` is set the default sink POSTs
// a compact event instead. Callers may also inject a custom `SecurityAlertSink`.
// ─────────────────────────────────────────────────────────────────────────────

export type SecurityEventSeverity = 'info' | 'warning' | 'critical';

export interface SecurityEvent {
  /** Dot-namespaced event id, e.g. 'auth.refresh.reuse_detected'. */
  action: string;
  severity: SecurityEventSeverity;
  /** ISO-8601 timestamp. */
  timestamp: string;
  userId: string | null;
  ipAddress: string | null;
  /** Compact, sink-specific context. */
  metadata: Record<string, unknown>;
  /** Optional human-readable summary. */
  message?: string;
}

export interface SecurityAlertSink {
  /**
   * Forward a security event. Must be best-effort and must never throw to its
   * caller — alerting must not be able to block a request path.
   */
  send(event: SecurityEvent): void | Promise<void>;
}

/** Default sink: structured JSON to `console.warn` — keeps current behavior. */
export function createConsoleSecuritySink(): SecurityAlertSink {
  return {
    send(event) {
      console.warn(JSON.stringify({ level: 'warn', event: 'security.alert', ...event }));
    },
  };
}

/**
 * Webhook sink: POSTs a compact JSON event to `SECURITY_WEBHOOK_URL`.
 * Fire-and-forget — failures are logged but never propagated to the caller.
 */
export function createWebhookSecuritySink(url: string): SecurityAlertSink {
  const endpoint = url;
  return {
    send(event) {
      void fetch(endpoint, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ event: 'security.alert', ...event }),
        // Don't keep the process alive solely to flush this request.
        keepalive: true,
      }).catch((err) =>
        console.error(
          JSON.stringify({
            level: 'error',
            event: 'security.alert.sink_failed',
            error: err instanceof Error ? err.message : String(err),
            ts: new Date().toISOString(),
          })
        )
      );
    },
  };
}

/**
 * Resolve the configured sink: webhook when `SECURITY_WEBHOOK_URL` is set,
 * otherwise the console sink.
 */
export function createDefaultSecuritySink(): SecurityAlertSink {
  const url = process.env.SECURITY_WEBHOOK_URL;
  return url ? createWebhookSecuritySink(url) : createConsoleSecuritySink();
}

/** Module-level active sink used by the `AlertingService` default path. */
let activeSecuritySink: SecurityAlertSink | null = null;

/** Returns the currently active security sink (set by `setupSecurityAlerting`). */
export function getActiveSecuritySink(): SecurityAlertSink {
  if (!activeSecuritySink) activeSecuritySink = createDefaultSecuritySink();
  return activeSecuritySink;
}

export interface SecurityAlertingOptions {
  /** Explicit sink to use. Defaults to `createDefaultSecuritySink()` (env-driven). */
  sink?: SecurityAlertSink;
}

/**
 * Wires up the security alerting sink. Call once, next to
 * `setupDatabaseObservability`, immediately after instantiating the client.
 */
export function setupSecurityAlerting(options?: SecurityAlertingOptions): void {
  activeSecuritySink = options?.sink ?? createDefaultSecuritySink();
  emitLog('info', {
    event: 'security.alerting.configured',
    sink: process.env.SECURITY_WEBHOOK_URL ? 'webhook' : 'console',
  });
}

/** Guard against calling setupDatabaseObservability more than once per client instance. */
const observedClients = new WeakSet<MongoClient>();

/**
 * Attaches command monitoring listeners to the MongoClient.
 * Call once — immediately after instantiating the client, before .connect().
 *
 * @param client  The MongoClient to monitor (must have monitorCommands: true).
 * @param options Observability configuration.
 */
export function setupDatabaseObservability(
  client: MongoClient,
  options?: ObservabilityOptions,
): void {
  if (observedClients.has(client)) return;
  observedClients.add(client);

  const threshold   = options?.slowQueryThresholdMs ?? 100;
  const logCommands = options?.enableCommandLogging ?? (process.env.NODE_ENV !== 'production');

  // Track start times keyed by MongoDB requestId
  const startTimes = new Map<number, number>();

  client.on('commandStarted', (event) => {
    startTimes.set(event.requestId, Date.now());

    if (logCommands) {
      emitLog('info', {
        event:     'db.command.started',
        command:   event.commandName,
        requestId: event.requestId,
      });
    }
  });

  client.on('commandSucceeded', (event) => {
    const t0 = startTimes.get(event.requestId);
    startTimes.delete(event.requestId);
    if (t0 == null) return;

    const durationMs  = Date.now() - t0;
    const collection  = (event as { reply?: { cursor?: { ns?: string } } }).reply?.cursor?.ns?.split('.')[1] ?? event.commandName;

    if (logCommands) {
      emitLog('info', {
        event:      'db.command.succeeded',
        command:    event.commandName,
        collection,
        durationMs,
        requestId:  event.requestId,
      });
    }

    if (durationMs >= threshold) {
      const slowEvent: SlowQueryEvent = {
        command:    event.commandName,
        collection,
        durationMs,
        requestId:  event.requestId,
        timestamp:  new Date(),
      };
      emitLog('warn', { event: 'db.slow_query', ...slowEvent });
      options?.onSlowQuery?.(slowEvent);
    }
  });

  client.on('commandFailed', (event) => {
    const t0 = startTimes.get(event.requestId);
    startTimes.delete(event.requestId);
    const durationMs = t0 != null ? Date.now() - t0 : -1;

    const errEvent: CommandErrorEvent = {
      command:    event.commandName,
      collection: event.commandName,
      durationMs,
      requestId:  event.requestId,
      errorCode:  (event.failure as { code?: number })?.code,
      errorMsg:   event.failure?.message ?? String(event.failure),
      timestamp:  new Date(),
    };

    emitLog('error', { event: 'db.command.failed', ...errEvent });
    options?.onCommandError?.(errEvent);
  });
}
