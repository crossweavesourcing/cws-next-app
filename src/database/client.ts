import { MongoClient, type Db } from 'mongodb';
import { getDatabaseConfig } from '@/database/config';
import { setupDatabaseObservability } from '@/database/observability';

// ─────────────────────────────────────────────────────────────────────────────
// MongoClient singleton — globalThis pattern prevents connection pool
// exhaustion during Next.js development hot-reloads.
//
// RULE: MongoClient is instantiated ONLY in this file.
//       All other files import getDb() and never MongoClient directly.
// ─────────────────────────────────────────────────────────────────────────────

declare global {
  // eslint-disable-next-line no-var
  var __mongoClient: MongoClient | undefined;
}

let clientPromise: Promise<MongoClient> | null = null;

/**
 * Returns the shared MongoClient instance.
 * Validates config and establishes the connection on first call.
 * Subsequent calls return the cached promise.
 *
 * @throws {DatabaseConfigError} if env vars are missing/invalid
 */
export function getMongoClient(): Promise<MongoClient> {
  if (clientPromise) return clientPromise;

  // In development, attach to globalThis so hot-reloads reuse the connection.
  if (process.env.NODE_ENV !== 'production' && globalThis.__mongoClient) {
    clientPromise = Promise.resolve(globalThis.__mongoClient);
    return clientPromise;
  }

  const config = getDatabaseConfig();

  const client = new MongoClient(config.uri, {
    // Enable command monitoring for observability
    monitorCommands: true,
    // Connection pool tuning — conservative defaults for a small user base
    maxPoolSize: 10,
    minPoolSize: 2,
    maxIdleTimeMS: 30_000,
    // Server selection / socket timeouts
    serverSelectionTimeoutMS: 5_000,
    socketTimeoutMS:          10_000,
    connectTimeoutMS:         10_000,
  });

  // Wire up observability before connecting
  setupDatabaseObservability(client);

  clientPromise = client.connect();

  if (process.env.NODE_ENV !== 'production') {
    clientPromise.then(c => { globalThis.__mongoClient = c; });
  }

  return clientPromise;
}

/**
 * Returns the `cws_auth` Db instance.
 * Use this in all repository / collection accessor code.
 */
export async function getDb(): Promise<Db> {
  const config = getDatabaseConfig();
  const client = await getMongoClient();
  return client.db(config.dbName);
}
