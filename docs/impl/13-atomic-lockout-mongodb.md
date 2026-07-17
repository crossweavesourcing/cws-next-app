# Implementation Prompt 13 — Atomic Account Lockout (MongoDB, no Redis)

> Self-contained. Runnable in isolation.

## Context

Internal Next.js (App Router) admin app. Login is password + Google OAuth. Users are limited/fixed (admin/seed provisioned). App runs on a **serverless/edge platform (NOT a VPS)** — multiple ephemeral instances, **no shared process memory, no Redis**.

The lockout logic lives in `src/auth/services/login.service.ts` (`LoginService`). Current flow on a bad password:

1. `userRepo.incrementFailedAttempts(userId)` — `$inc` on `security.failedLoginAttempts`.
2. Reload user via `userRepo.findById(userId)`.
3. Read `failedLoginAttempts`; if `>= LOCKOUT_THRESHOLD` (5), call `userRepo.lockAccount(userId, until)`.

This is a **read-modify-write race**: under concurrent requests (or multiple serverless instances), two near-simultaneous failures can both read the pre-threshold count and both pass/fail inconsistently, and the threshold check is not atomic.

`user.repository.ts` currently has `incrementFailedAttempts`, `resetFailedAttempts`, `lockAccount`, `findById`. The `users` schema (`src/database/schemas/users.schema.ts`) has `security.failedLoginAttempts` (int, min 0) and `security.lockedUntil` (date|null).

The rate-limit service (`src/auth/services/rate-limit.service.ts`) already operates off the `login_attempts` collection (per-IP and per-identifier counts) — that part is already DB-backed and fine.

## Goal

Make the **lockout decision atomic** so it is correct under concurrency and across serverless instances, using only MongoDB — no Redis, no in-memory state.

## Implementation (recommended approach)

Replace the increment-then-reload-then-compare with a single atomic conditional update:

In `user.repository.ts`, add:

```ts
/**
 * Atomically increments failed attempts and, if the new count reaches the
 * threshold, sets lockedUntil in the SAME write. Returns the resulting state
 * so the caller knows whether a lock was just applied. Uses a filter so the
 * write only succeeds when not already locked, preventing a race where two
 * concurrent failures both cross the threshold.
 */
async recordFailedLoginAndMaybeLock(
  userId: ObjectId,
  threshold: number,
  lockDurationMs: number
): Promise<{ failedAttempts: number; locked: boolean }> {
  const usersColl = await getUsersCollection();
  const now = new Date();
  const res = await usersColl.findOneAndUpdate(
    { _id: userId, $or: [{ 'security.lockedUntil': null }, { 'security.lockedUntil': { $lte: now } }] },
    [
      {
        $set: {
          'security.failedLoginAttempts': { $add: ['$security.failedLoginAttempts', 1] },
          'security.lockedUntil': {
            $cond: [
              { $gte: [{ $add: ['$security.failedLoginAttempts', 1] }, threshold] },
              new Date(Date.now() + lockDurationMs),
              '$security.lockedUntil',
            ],
          },
          updatedAt: now,
        },
      },
    ],
    { returnDocument: 'after' }
  );
  const failedAttempts = res?.security?.failedLoginAttempts ?? 0;
  const locked = !!res?.security?.lockedUntil && res.security.lockedUntil.getTime() > Date.now();
  return { failedAttempts, locked };
}
```

`login.service.ts` then becomes:

```ts
const { locked, failedAttempts } = await this.userRepo.recordFailedLoginAndMaybeLock(
  userId, this.LOCKOUT_THRESHOLD, this.LOCKOUT_DURATION_MS
);
if (locked) {
  await this.recordFailure(userId, email, ipAddress, ua, 'Lockout triggered', new Date(Date.now() + this.LOCKOUT_DURATION_MS));
  throw new AccountLockedError(new Date(Date.now() + this.LOCKOUT_DURATION_MS), 'Lockout triggered on password mismatch');
}
```

Keep `resetFailedAttempts` (called on successful login) as-is, and keep `lockAccount` for any admin/manual lock path if still used.

The `validateSession` / `login.service.ts` already check `security.lockedUntil` on each request, so an atomic lock takes effect immediately across instances (MongoDB is the shared source of truth).

## Acceptance criteria

1. No `incrementFailedAttempts` + `findById` + `lockAccount` read-modify-write sequence remains for the lockout decision.
2. The lock threshold is enforced by a single atomic MongoDB update; concurrent failures cannot both pass the threshold inconsistently.
3. Verified by a test that fires N concurrent bad-password attempts (N >= threshold) and asserts the account ends locked exactly once and `failedLoginAttempts` is exactly N (or capped), not N+.
4. Lockout still releases after `LOCKOUT_DURATION_MS` (existing `lockedUntil` check unchanged).
5. No Redis, no module-level/shared in-memory counters introduced.

## Notes

- `findOneAndUpdate` with an aggregation pipeline (`$set` using `$add`/`$cond`) is supported by the MongoDB driver used by this project. If the driver version is old, fall back to a retry loop using `updateOne({ _id, failedLoginAttempts: expected }, { $inc, $set lockedUntil })` checking `modifiedCount`, but prefer the single atomic write.
- Do not change `LOCKOUT_THRESHOLD` (5) or `LOCKOUT_DURATION_MS` (15 min) values unless product asks.
