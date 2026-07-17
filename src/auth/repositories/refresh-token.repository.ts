import { ObjectId } from 'mongodb';
import { getRefreshTokensCollection } from '@/database';
import type { RefreshTokenDocument, RevokedReason } from '@/types/auth';

export type NewRefreshToken = Omit<
  RefreshTokenDocument,
  '_id' | 'createdAt'
>;

/**
 * Data access for the `refresh_tokens` collection.
 * Implements rotation-chain bookkeeping and family revocation.
 */
export class RefreshTokenRepository {
  /**
   * Inserts a new refresh token record (storing ONLY the SHA-256 hash).
   * Pass `id` to mint the document with a caller-chosen `_id` (used by the
   * rotation path so the new token's id is known BEFORE the atomic replace).
   */
  async create(data: NewRefreshToken, id?: ObjectId): Promise<RefreshTokenDocument> {
    const coll = await getRefreshTokensCollection();
    const doc: RefreshTokenDocument = {
      _id: id ?? new ObjectId(),
      ...data,
      createdAt: new Date(),
    };
    await coll.insertOne(doc);
    return doc;
  }

  /**
   * Looks up a token by its hash. Returns null when not found.
   */
  async findByHash(tokenHash: string): Promise<RefreshTokenDocument | null> {
    const coll = await getRefreshTokensCollection();
    return coll.findOne({ tokenHash });
  }

  /**
   * Marks a token as replaced by a newer one during rotation.
   *
   * @deprecated Use {@link atomicReplace} instead. `markReplaced` performs a
   * non-conditional `updateOne`, which is vulnerable to a lost-update race
   * (H-4): two concurrent refreshes presenting the same still-valid token can
   * both pass the pre-check and mint two live tokens. Kept for backward
   * compatibility with callers that do not need the atomic guarantee.
   */
  async markReplaced(oldHash: string, replacedBy: ObjectId): Promise<void> {
    const coll = await getRefreshTokensCollection();
    await coll.updateOne(
      { tokenHash: oldHash },
      { $set: { replacedBy, revoked: true, revokedReason: 'rotated', revokedAt: new Date() } }
    );
  }

  /**
   * H-4 fix: atomically replaces a still-live refresh token in a single
   * conditional write. The `replacedBy: null` predicate guarantees the write
   * only succeeds when the token has NOT already been rotated/replaced, so two
   * concurrent requests presenting the same token cannot both win — the loser
   * gets `value === null` and is routed down the reuse-revoke path by the caller.
   *
   * @returns the updated document (with `returnDocument: 'after'`), or `null`
   *          when no un-replaced token matched `oldHash`.
   */
  async atomicReplace(
    oldHash: string,
    newId: ObjectId,
    now: Date
  ): Promise<RefreshTokenDocument | null> {
    const coll = await getRefreshTokensCollection();
    const result = await coll.findOneAndUpdate(
      { tokenHash: oldHash, replacedBy: null },
      {
        $set: {
          revoked: true,
          replacedBy: newId,
          revokedReason: 'rotated',
          revokedAt: now,
        },
      },
      { returnDocument: 'after' }
    );
    return (result as unknown as { value: RefreshTokenDocument | null } | null)?.value ?? null;
  }

  /**
   * Flags a token as a suspected reuse (token theft signal).
   */
  async markReuseDetected(tokenHash: string): Promise<void> {
    const coll = await getRefreshTokensCollection();
    await coll.updateOne(
      { tokenHash },
      {
        $set: {
          reuseDetected: true,
          revoked: true,
          revokedReason: 'reuse_detected',
          revokedAt: new Date(),
        },
      }
    );
  }

  /**
   * Revokes every token belonging to a session (logout / compromise response).
   */
  async revokeBySession(
    sessionId: ObjectId,
    reason: RevokedReason = 'logout'
  ): Promise<void> {
    const coll = await getRefreshTokensCollection();
    await coll.updateMany(
      { sessionId, revoked: false },
      { $set: { revoked: true, revokedReason: reason, revokedAt: new Date() } }
    );
  }

  /**
   * FIX-10: revokes every token belonging to a set of sessions in one write.
   * Used alongside SessionRepository.revokeManyByIds to batch-revoke the
   * refresh families of overflow sessions from the concurrent-session cap.
   */
  async revokeBySessions(
    sessionIds: ObjectId[],
    reason: RevokedReason = 'session_revoked'
  ): Promise<void> {
    if (sessionIds.length === 0) return;
    const coll = await getRefreshTokensCollection();
    await coll.updateMany(
      { sessionId: { $in: sessionIds }, revoked: false },
      { $set: { revoked: true, revokedReason: reason, revokedAt: new Date() } }
    );
  }

  /**
   * Records usage metadata (IP / UA) for anomaly detection — non-blocking best-effort.
   */
  async recordUsage(tokenHash: string, ip: string | null, userAgent: string | null): Promise<void> {
    const coll = await getRefreshTokensCollection();
    await coll.updateOne(
      { tokenHash },
      { $set: { lastUsedAt: new Date(), lastUsedIp: ip, lastUsedUserAgent: userAgent } }
    );
  }
}
