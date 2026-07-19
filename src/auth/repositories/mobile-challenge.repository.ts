import { ObjectId } from 'mongodb';
import { getMobileAuthChallengesCollection } from '@/database';
import type { LoginMethod, MobileAuthChallengeDocument, MobileMfaMethod } from '@/types/auth';

export class MobileChallengeRepository {
  async create(params: {
    tokenHash: string;
    userId: ObjectId;
    loginMethod: LoginMethod;
    methods: MobileMfaMethod[];
    expiresAt: Date;
    ipAddress: string;
    userAgent: string | null;
    maxAttempts?: number;
  }): Promise<MobileAuthChallengeDocument> {
    const doc: MobileAuthChallengeDocument = {
      _id: new ObjectId(),
      tokenHash: params.tokenHash,
      userId: params.userId,
      loginMethod: params.loginMethod,
      methods: params.methods,
      attempts: 0,
      maxAttempts: params.maxAttempts ?? 5,
      expiresAt: params.expiresAt,
      usedAt: null,
      ipAddress: params.ipAddress,
      userAgent: params.userAgent,
      createdAt: new Date(),
    };
    await (await getMobileAuthChallengesCollection()).insertOne(doc);
    return doc;
  }

  async findActive(tokenHash: string): Promise<MobileAuthChallengeDocument | null> {
    return (await getMobileAuthChallengesCollection()).findOne({
      tokenHash,
      usedAt: null,
      expiresAt: { $gt: new Date() },
    });
  }

  async recordFailure(tokenHash: string): Promise<MobileAuthChallengeDocument | null> {
    const coll = await getMobileAuthChallengesCollection();
    const result = await coll.findOneAndUpdate(
      {
        tokenHash,
        usedAt: null,
        expiresAt: { $gt: new Date() },
        $expr: { $lt: ['$attempts', '$maxAttempts'] },
      },
      { $inc: { attempts: 1 } },
      { returnDocument: 'after' }
    );
    return result;
  }

  async redeem(tokenHash: string): Promise<MobileAuthChallengeDocument | null> {
    const coll = await getMobileAuthChallengesCollection();
    const result = await coll.findOneAndUpdate(
      {
        tokenHash,
        usedAt: null,
        expiresAt: { $gt: new Date() },
        $expr: { $lt: ['$attempts', '$maxAttempts'] },
      },
      { $set: { usedAt: new Date() } },
      { returnDocument: 'before' }
    );
    return result;
  }

  async setWebAuthnChallenge(tokenHash: string, challenge: string): Promise<boolean> {
    const result = await (await getMobileAuthChallengesCollection()).updateOne(
      { tokenHash, usedAt: null, expiresAt: { $gt: new Date() } },
      { $set: { webauthnChallenge: challenge } }
    );
    return result.modifiedCount === 1;
  }
}
