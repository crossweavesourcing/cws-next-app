# Item 3 — Atomic refresh rotation + lockout counter  (H-4 / H-5)

> Self-contained prompt. Works in a fresh session with no prior context.

## START HERE
File A: `src/auth/services/session.service.ts` → `rotateRefreshToken` (≈ 221–332), specifically the `markReplaced(oldHash, newDoc._id)` call.
File B: `src/auth/services/login.service.ts` → failure path (≈ 113–134) using `userRepo.incrementFailedAttempts` + `findById` reload.
File C (new): `src/auth/repositories/refresh-token.repository.ts` and `src/auth/repositories/user.repository.ts` (add atomic helpers).

## PROJECT CONTEXT (read first)
- Next.js 16 App Router; `src/proxy.ts` = renamed middleware.
- TS strict, MongoDB driver (NO Mongoose). Internal app, no public registration.
- Session model (PRESERVE): DB-backed; `cws_refresh` opaque token, only SHA-256 hash in `refresh_tokens` (unique index `uidx_tokenHash`). Rotation chains tokens via `rotatedFrom`/`replacedBy`. Reuse detection revokes session family.
- Repositories wrap `getRefreshTokensCollection()` / `getUsersCollection()` and use `collection.updateOne` / `findOneAndUpdate`.

## CURRENT BEHAVIOR (the races)
- **H-4 (refresh split):** `rotateRefreshToken` reads `existing`, later calls `markReplaced(oldHash, newId)` (`updateOne({tokenHash:oldHash}, {$set:{replacedBy:newId, revoked:true}})`). Two concurrent requests presenting the same still-valid token both pass the `!existing.revoked` check before either writes → two live refresh tokens minted.
- **H-5 (lockout lost update):** login failure does `$inc failedLoginAttempts`, then a separate `findById` reload, then compares to `LOCKOUT_THRESHOLD = 5`. Concurrent failures interleave and can miscount, delaying the lockout.

## FIX
**Refresh (atomic rotate):** add to `RefreshTokenRepository`:
```
async atomicReplace(oldHash, newId, now): Promise<UpdateResult> {
  return coll.findOneAndUpdate(
    { tokenHash: oldHash, replacedBy: null },
    { $set: { revoked: true, replacedBy: newId, revokedReason: 'rotated', revokedAt: now } },
    { returnDocument: 'after' }
  );
}
```
In `rotateRefreshToken`, call `atomicReplace`; if it did NOT match (`value === null`), treat as reuse (run the existing reuse-revoke + alert path) and stop. Only proceed to mint the new token + session cookie when the replace succeeded.

**Lockout (atomic count):** add to `UserRepository`:
```
async incrementFailedAndGet(userId) {
  return usersColl.findOneAndUpdate(
    { _id: userId, 'security.failedLoginAttempts': { $lt: THRESHOLD } },
    { $inc: { 'security.failedLoginAttempts': 1 }, $set: { updatedAt: new Date() } },
    { returnDocument: 'after' }
  );
}
```
In `login.service.ts`, call it; if returned doc's `failedLoginAttempts >= THRESHOLD`, lock + throw; otherwise only audit. Keep `recordFailure` audit logging.

## ACCEPTANCE
- [ ] Concurrent identical refresh presentations cannot produce two live tokens (loser hits reuse path).
- [ ] Exactly 5 failures (concurrent OK) → 6th attempt rejected with lockout.
- [ ] No lost-update under a load test of simultaneous logins/refreshes.
- [ ] `markReplaced` / `incrementFailedAttempts` old callers still compile or are migrated.

## END HERE
Verification: `pnpm lint` + `pnpm build`; add unit tests for `atomicReplace` (two concurrent callers) and `incrementFailedAndGet` (threshold boundary). No changes to cookie/session-shape or other flows.
