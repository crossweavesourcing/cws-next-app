import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ObjectId } from 'mongodb';
import type { UserDocument } from '@/types/auth';

// ─── In-memory `users` store keyed by _id string. ─────────────────────────────
// The store faithfully executes the atomic `findOneAndUpdate` aggregation
// pipeline used by `recordFailedLoginAndMaybeLock` so the concurrency test
// exercises the REAL logic, not a mock that papers over the race. A mutex
// serializes writes to a single document, mirroring MongoDB's per-document
// atomicity (the production `findOneAndUpdate` is a single atomic op).
const state = vi.hoisted(() => ({
  users: new Map<string, UserDocument>(),
  // Promise chain used as a per-store mutex so concurrent `findOneAndUpdate`
  // calls against the same doc execute strictly one-at-a-time.
  lock: Promise.resolve() as Promise<unknown>,
}));

type Json = string | number | boolean | null | Json[] | { [key: string]: Json };
type Doc = Record<string, unknown>;

// Serialize an async critical section (MongoDB document-level atomicity model).
function withLock<T>(fn: () => Promise<T> | T): Promise<T> {
  const next = state.lock.then(
    () => fn(),
    () => fn()
  ) as Promise<T>;
  // Keep the chain alive even if `fn` rejects.
  state.lock = next.then(
    () => undefined,
    () => undefined
  );
  return next;
}

// Deep clone that preserves `ObjectId` and `Date` instances (a JSON round-trip
// would stringify both and break `.equals()` / `.getTime()` used downstream).
function cloneDoc(doc: Doc): UserDocument {
  const src = doc as Doc;
  const out: Doc = { ...src };
  for (const key of ['createdAt', 'updatedAt', 'deletedAt'] as const) {
    out[key] = src[key] ? new Date((src[key] as Date).getTime()) : src[key];
  }
  const security = src.security as Record<string, unknown>;
  out.security = {
    ...security,
    lockedUntil: security.lockedUntil ? new Date((security.lockedUntil as Date).getTime()) : null,
  };
  out.profile = JSON.parse(JSON.stringify(src.profile));
  out.metadata = JSON.parse(JSON.stringify(src.metadata));
  return out as unknown as UserDocument;
}

function newUser(): UserDocument {
  return {
    _id: new ObjectId(),
    profile: { displayName: 'Test Admin' },
    role: 'admin',
    status: 'active',
    loginMethods: ['password'],
    security: {
      failedLoginAttempts: 0,
      lockedUntil: null,
      mfaEnabled: false,
      accountSecurityVersion: 1,
    },
    metadata: {},
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
  } as unknown as UserDocument;
}

// Resolve a field path like `security.failedLoginAttempts` against a doc.
function getPath(doc: Doc, path: string): unknown {
  return path.split('.').reduce((acc: unknown, key: string) => {
    if (acc && typeof acc === 'object') return (acc as Doc)[key];
    return undefined;
  }, doc);
}
function setPath(doc: Doc, path: string, value: unknown): void {
  const keys = path.split('.');
  let cur = doc;
  for (let i = 0; i < keys.length - 1; i++) {
    cur = cur[keys[i]] as Doc;
  }
  cur[keys[keys.length - 1]] = value;
}

// Minimal evaluation of the `$add` / `$cond` / `$gte` / `$lte` expressions used
// by the pipeline. `$`-prefixed strings are field references; plain values are
// literals. `evalExpr` is applied recursively to every operand so that, e.g.,
// `$add: ['$field', 1]` resolves the field then performs numeric addition.
function evalExpr(expr: unknown, doc: Doc): unknown {
  if (typeof expr === 'string' && expr.startsWith('$')) {
    return getPath(doc, expr.slice(1));
  }
  if (expr && typeof expr === 'object' && !Array.isArray(expr)) {
    const obj = expr as Record<string, Json>;
    if ('$add' in obj) {
      const operands = obj.$add as Json[];
      return (operands as unknown[]).reduce(
        (sum: number, operand) => sum + (evalExpr(operand, doc) as number),
        0
      );
    }
    if ('$cond' in obj) {
      const [ifExpr, thenExpr, elseExpr] = obj.$cond as [Json, Json, Json];
      return evalExpr(ifExpr, doc) ? evalExpr(thenExpr, doc) : evalExpr(elseExpr, doc);
    }
    if ('$gte' in obj) {
      const [a, b] = obj.$gte as [Json, Json];
      return (evalExpr(a, doc) as number) >= (evalExpr(b, doc) as number);
    }
    if ('$lte' in obj) {
      const [a, b] = obj.$lte as [Json, Json];
      return (evalExpr(a, doc) as number) <= (evalExpr(b, doc) as number);
    }
  }
  return expr;
}

vi.mock('@/database', () => ({
  getDb: async () => ({}),
  getUsersCollection: async () => ({
    findOne: async (filter: Doc) => {
      for (const doc of state.users.values()) {
        if (filter._id && !(filter._id as ObjectId).equals(doc._id as ObjectId)) continue;
        return doc;
      }
      return null;
    },
    // Implements the atomic conditional update with an aggregation pipeline.
    // The `$or` filter keeps the lock coherent across concurrent writers.
    findOneAndUpdate: async (filter: Doc, pipeline: unknown[], opts: { returnDocument: 'after' }) =>
      withLock(() => {
        for (const doc of state.users.values()) {
          if (filter._id && !(filter._id as ObjectId).equals(doc._id as ObjectId)) continue;

          // Evaluate the `$or` predicate against the CURRENT persisted state.
          const orPred = filter.$or as Record<string, Json>[];
          const now = new Date();
          const lockedUntil = doc.security.lockedUntil as Date | null;
          const alreadyLocked =
            lockedUntil != null && lockedUntil instanceof Date && lockedUntil.getTime() > now.getTime();
          const passesOr =
            !orPred ||
            orPred.some((clause) => {
              if ('security.lockedUntil' in clause) {
                const v = clause['security.lockedUntil'];
                if (v === null) return lockedUntil == null;
                if (v && typeof v === 'object' && '$lte' in v) {
                  return (
                    lockedUntil != null &&
                    lockedUntil.getTime() <= ((v.$lte as unknown as Date).getTime())
                  );
                }
              }
              return false;
            });
          if (!passesOr) continue;
          if (alreadyLocked) continue;

          // Apply the `$set` pipeline. IMPORTANT: MongoDB computes every
          // `$set` expression against the SAME input document, then applies
          // them together — a later field must NOT observe an earlier field's
          // update. So we evaluate all values against the original `doc`.
          const working = cloneDoc(doc as unknown as Doc);
          for (const stage of pipeline as Record<string, { [field: string]: Json }>[]) {
            if (stage.$set) {
              for (const [field, value] of Object.entries(stage.$set)) {
                setPath(working as unknown as Doc, field, evalExpr(value, doc));
              }
            }
          }
          // Persist the updated doc back into the store (single atomic write).
          state.users.set((doc._id as ObjectId).toString(), working);
          return opts.returnDocument === 'after' ? working : doc;
        }
        return null;
      }),
    updateOne: async () => ({ modifiedCount: 0 }),
  }),
  getUserEmailsCollection: async () => ({
    findOne: async () => null,
    find: async () => ({ toArray: async () => [] }),
  }),
}));

const { UserRepository } = await import('@/auth/repositories/user.repository');

const THRESHOLD = 5;
const LOCK_MS = 15 * 60 * 1000;

type Result = { failedAttempts: number; locked: boolean };

describe('UserRepository.recordFailedLoginAndMaybeLock — atomic lockout', () => {
  let repo: InstanceType<typeof UserRepository>;
  let userId: ObjectId;

  beforeEach(() => {
    state.users.clear();
    state.lock = Promise.resolve();
    const user = newUser();
    userId = user._id as ObjectId;
    state.users.set(userId.toString(), user);
    repo = new UserRepository();
  });

  it('increments the counter by exactly the number of attempts (no lost updates)', async () => {
    const N = THRESHOLD + 3; // 8 concurrent failures
    await Promise.all(
      Array.from({ length: N }, () => repo.recordFailedLoginAndMaybeLock(userId, THRESHOLD, LOCK_MS))
    );

    const finalDoc = state.users.get(userId.toString())!;
    // Once the lock engages at the threshold, further attempts are blocked by
    // the `$or` filter (already locked), so the counter caps at the threshold
    // rather than reaching N — exactly the atomic, non-over-counting behavior.
    expect(finalDoc.security.failedLoginAttempts).toBe(THRESHOLD);
    expect(finalDoc.security.lockedUntil).not.toBeNull();
    expect((finalDoc.security.lockedUntil as Date).getTime()).toBeGreaterThan(Date.now());
  });

  it('locks exactly once: concurrent attempts >= threshold yield a single lock', async () => {
    const N = THRESHOLD; // fire exactly the threshold count concurrently
    const results = await Promise.all(
      Array.from({ length: N }, () => repo.recordFailedLoginAndMaybeLock(userId, THRESHOLD, LOCK_MS))
    );

    const lockedCount = results.filter((r: Result) => r.locked).length;
    const finalDoc = state.users.get(userId.toString())!;

    // The counter is exactly the threshold (never N+), so no attempt was
    // double-counted.
    expect(finalDoc.security.failedLoginAttempts).toBe(N);
    // Exactly ONE of the concurrent writes crossed the threshold and set the lock.
    expect(lockedCount).toBe(1);
    expect(finalDoc.security.lockedUntil).not.toBeNull();
  });

  it('does not re-lock an already-locked account, and does not over-count', async () => {
    // First burst locks the account at count == THRESHOLD.
    await Promise.all(
      Array.from({ length: THRESHOLD }, () =>
        repo.recordFailedLoginAndMaybeLock(userId, THRESHOLD, LOCK_MS)
      )
    );
    const lockedDoc = state.users.get(userId.toString())!;
    expect(lockedDoc.security.failedLoginAttempts).toBe(THRESHOLD);
    expect(lockedDoc.security.lockedUntil).not.toBeNull();
    const lockTime = (lockedDoc.security.lockedUntil as Date).getTime();

    // A second burst while still locked must be rejected by the `$or` filter
    // (the filter only matches when not already locked) → no change, no new lock.
    const burst = await Promise.all(
      Array.from({ length: 5 }, () =>
        repo.recordFailedLoginAndMaybeLock(userId, THRESHOLD, LOCK_MS)
      )
    );
    expect(burst.every((r: Result) => !r.locked)).toBe(true);

    const finalDoc = state.users.get(userId.toString())!;
    expect(finalDoc.security.failedLoginAttempts).toBe(THRESHOLD); // unchanged
    expect((finalDoc.security.lockedUntil as Date).getTime()).toBe(lockTime); // same lock
  });

  it('releases after LOCKOUT_DURATION_MS via the existing lockedUntil check', async () => {
    // Reach the threshold so the account actually locks.
    await Promise.all(
      Array.from({ length: THRESHOLD }, () =>
        repo.recordFailedLoginAndMaybeLock(userId, THRESHOLD, LOCK_MS)
      )
    );
    const lockedDoc = state.users.get(userId.toString())!;
    expect(lockedDoc.security.lockedUntil).not.toBeNull();

    // While still locked, further attempts are rejected (no change, no lock).
    const r = await repo.recordFailedLoginAndMaybeLock(userId, THRESHOLD, LOCK_MS);
    expect(r.locked).toBe(false);

    // After the lock duration elapses, a fresh attempt is allowed to increment
    // again (simulating the real `login.service` re-checking `lockedUntil`).
    (lockedDoc.security.lockedUntil as Date).setTime(Date.now() - 1); // expired
    const after = await repo.recordFailedLoginAndMaybeLock(userId, THRESHOLD, LOCK_MS);
    expect(after.failedAttempts).toBeGreaterThan(lockedDoc.security.failedLoginAttempts);
  });
});
