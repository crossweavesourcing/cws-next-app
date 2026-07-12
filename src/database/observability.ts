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
