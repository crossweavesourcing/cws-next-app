import { getMongoClient } from '@/database/client';

// ─────────────────────────────────────────────────────────────────────────────
// Graceful Shutdown Handler
//
// Registers SIGTERM and SIGINT handlers that cleanly close the MongoClient
// before the process exits. Prevents data loss from abruptly dropped connections.
//
// Call once at process startup:
//   - In scripts/db-init.ts
//   - In src/instrumentation.ts for Next.js server (Node.js runtime only)
// ─────────────────────────────────────────────────────────────────────────────

export interface ShutdownOptions {
  /**
   * Maximum time in milliseconds to wait for MongoClient.close() before
   * forcing process.exit(1). Default: 5000ms
   */
  timeoutMs?:        number;
  /**
   * Called before the MongoClient is closed.
   * Use to drain in-flight requests, flush buffers, etc.
   */
  onBeforeShutdown?: () => void | Promise<void>;
  /**
   * Called after the MongoClient has been closed successfully.
   */
  onAfterShutdown?:  () => void | Promise<void>;
}

/** Guards against registering handlers more than once. */
let handlersRegistered = false;

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
export function registerShutdownHandlers(options?: ShutdownOptions): void {
  if (handlersRegistered) return;
  handlersRegistered = true;

  const timeoutMs = options?.timeoutMs ?? 5_000;
  let shutdownInProgress = false;

  const shutdown = async (signal: string): Promise<void> => {
    if (shutdownInProgress) {
      console.error(
        JSON.stringify({ level: 'error', event: 'db.shutdown.forced', signal, ts: new Date().toISOString() }),
      );
      process.exit(1);
    }
    shutdownInProgress = true;

    console.log(
      JSON.stringify({ level: 'info', event: 'db.shutdown.started', signal, ts: new Date().toISOString() }),
    );

    // Timeout guard — force exit if close takes too long
    const timer = setTimeout(() => {
      console.error(
        JSON.stringify({
          level: 'error',
          event: 'db.shutdown.timeout',
          timeoutMs,
          ts:    new Date().toISOString(),
        }),
      );
      process.exit(1);
    }, timeoutMs);

    try {
      if (options?.onBeforeShutdown) {
        await Promise.resolve(options.onBeforeShutdown());
      }

      const client = await getMongoClient();
      await client.close();

      if (options?.onAfterShutdown) {
        await Promise.resolve(options.onAfterShutdown());
      }

      clearTimeout(timer);
      console.log(
        JSON.stringify({ level: 'info', event: 'db.shutdown.complete', ts: new Date().toISOString() }),
      );
      process.exit(0);
    } catch (err) {
      clearTimeout(timer);
      console.error(
        JSON.stringify({
          level: 'error',
          event: 'db.shutdown.error',
          error: err instanceof Error ? err.message : String(err),
          ts:    new Date().toISOString(),
        }),
      );
      process.exit(1);
    }
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT',  () => shutdown('SIGINT'));
}
