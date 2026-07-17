import { ObjectId } from 'mongodb';
import { getRecoveryCodesCollection } from '@/database';
import { generateToken, hashToken } from '@/auth/crypto/token';
import type { RecoveryCodeDocument } from '@/types/auth';

/** Number of single-use recovery codes issued per (re)generation. */
export const RECOVERY_CODE_COUNT = 10;

/** Length of each raw recovery code (hex chars from generateToken). */
const RECOVERY_CODE_BYTE_LENGTH = 16;

export type GeneratedRecoveryCodes = {
  /** Raw codes — shown to the user ONCE, never persisted. */
  rawCodes: string[];
  /** Number of codes stored (== rawCodes.length). */
  count: number;
};

export class RecoveryCodeRepository {
  /**
   * Replaces a user's recovery codes with a fresh set of N codes.
   * Returns the RAW codes (plaintext) for one-time display; only their SHA-256
   * hashes are persisted. Prior codes are invalidated by deletion.
   */
  async generate(userId: ObjectId): Promise<GeneratedRecoveryCodes> {
    const coll = await getRecoveryCodesCollection();

    // Invalidate all prior codes first (regeneration invalidates prior codes).
    await coll.deleteMany({ userId });

    const now = new Date();
    const rawCodes: string[] = [];
    const docs: RecoveryCodeDocument[] = [];

    for (let i = 0; i < RECOVERY_CODE_COUNT; i++) {
      const raw = generateToken(RECOVERY_CODE_BYTE_LENGTH);
      rawCodes.push(raw);
      docs.push({
        _id: new ObjectId(),
        userId,
        codeHash: hashToken(raw),
        used: false,
        usedAt: null,
        createdAt: now,
      });
    }

    await coll.insertMany(docs);
    return { rawCodes, count: rawCodes.length };
  }

  /**
   * Redeems a single recovery code (single-use). Hashes the submitted code and
   * atomically marks the matching unused code as used. Returns the userId on
   * success, or null if the code is unknown / already used / not this user.
   */
  async redeem(rawCode: string, expectedUserId: ObjectId): Promise<boolean> {
    const coll = await getRecoveryCodesCollection();
    const codeHash = hashToken(rawCode);
    const res = await coll.updateOne(
      { userId: expectedUserId, codeHash, used: false },
      { $set: { used: true, usedAt: new Date() } }
    );
    return res.matchedCount === 1;
  }

  /**
   * Counts remaining (unused) recovery codes for a user — used by the UI to
   * show status without ever revealing the codes themselves.
   */
  async countRemaining(userId: ObjectId): Promise<number> {
    const coll = await getRecoveryCodesCollection();
    return coll.countDocuments({ userId, used: false });
  }

  /**
   * Returns true if the user has any unused recovery codes provisioned.
   */
  async hasActiveCodes(userId: ObjectId): Promise<boolean> {
    const coll = await getRecoveryCodesCollection();
    const doc = await coll.findOne({ userId, used: false }, { projection: { _id: 1 } });
    return doc !== null;
  }
}
