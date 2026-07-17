import { ObjectId } from 'mongodb';
import { getVerificationTokensCollection } from '@/database';
import { generateToken, hashToken } from '@/auth/crypto/token';
import type { VerificationTokenType } from '@/types/auth';

export type NewVerificationToken = {
  userId: ObjectId | null;
  type: VerificationTokenType;
  payload: Record<string, unknown>;
};

/**
 * Issue + redeem short-lived, single-use tokens (2FA codes, password reset, etc.).
 * Only the SHA-256 hash is stored; the raw token is returned to the caller once.
 */
export class VerificationTokenRepository {
  /**
   * Creates a token and returns the raw value (never stored). Defaults to a
   * 10-char hex token (suitable for 2FA codes / reset links).
   */
  async create(
    data: NewVerificationToken,
    ttlMs: number,
    byteLength = 8,
    tokenOverride?: string
  ): Promise<string> {
    // `tokenOverride` lets callers store a hash of a value they generated
    // elsewhere (e.g. a 6-digit 2FA code) instead of the random raw token.
    // When omitted, a fresh CSRPNG token is generated and hashed as before.
    const raw = tokenOverride ?? generateToken(byteLength);
    const coll = await getVerificationTokensCollection();
    await coll.insertOne({
      _id: new ObjectId(),
      userId: data.userId,
      type: data.type,
      tokenHash: hashToken(raw),
      payload: data.payload,
      expiresAt: new Date(Date.now() + ttlMs),
      used: false,
      usedAt: null,
      createdAt: new Date(),
    });
    return raw;
  }

  /**
   * Marks a token used and returns its doc, or null if unknown/expired/already used.
   */
  async redeem(tokenHash: string): Promise<{ userId: ObjectId | null; payload: Record<string, unknown> } | null> {
    const coll = await getVerificationTokensCollection();
    const doc = await coll.findOne({ tokenHash, used: false, expiresAt: { $gt: new Date() } });
    if (!doc) return null;
    await coll.updateOne({ _id: doc._id }, { $set: { used: true, usedAt: new Date() } });
    return { userId: doc.userId, payload: doc.payload };
  }

  /**
   * Finds an active (unused, unexpired) token of a type for a user — used to
   * rate-limit re-issuance and to invalidate prior codes on new issuance.
   */
  async findActive(userId: ObjectId, type: VerificationTokenType) {
    const coll = await getVerificationTokensCollection();
    return coll.findOne({ userId, type, used: false, expiresAt: { $gt: new Date() } });
  }

  /**
   * Invalidates all active tokens of a type for a user (e.g. before issuing a new
   * 2FA code, or on password change to cancel pending resets).
   */
  async invalidateAll(userId: ObjectId, type: VerificationTokenType): Promise<void> {
    const coll = await getVerificationTokensCollection();
    await coll.updateMany(
      { userId, type, used: false },
      { $set: { used: true, usedAt: new Date() } }
    );
  }
}
