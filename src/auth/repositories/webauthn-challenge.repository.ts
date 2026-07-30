import { ObjectId } from 'mongodb';
import { getWebAuthnChallengesCollection } from '@/database';
import type { WebAuthnChallengeDocument, WebAuthnChallengePurpose } from '@/types/auth';

const DEFAULT_TTL_MS = 5 * 60 * 1000;

export class WebAuthnChallengeRepository {
  async create(params: {
    challenge: string;
    purpose: WebAuthnChallengePurpose;
    userId?: ObjectId | null;
    tokenHash?: string | null;
    deviceObjectId?: ObjectId | null;
    platform: 'web' | 'mobile';
    ipAddress?: string | null;
    userAgent?: string | null;
    ttlMs?: number;
    maxAttempts?: number;
  }): Promise<WebAuthnChallengeDocument> {
    const now = new Date();
    const doc: WebAuthnChallengeDocument = {
      _id: new ObjectId(),
      challenge: params.challenge,
      purpose: params.purpose,
      userId: params.userId ?? null,
      tokenHash: params.tokenHash ?? null,
      deviceObjectId: params.deviceObjectId ?? null,
      platform: params.platform,
      ipAddress: params.ipAddress ?? null,
      userAgent: params.userAgent ?? null,
      attempts: 0,
      maxAttempts: params.maxAttempts ?? 5,
      expiresAt: new Date(now.getTime() + (params.ttlMs ?? DEFAULT_TTL_MS)),
      usedAt: null,
      createdAt: now,
      updatedAt: now,
    };
    await (await getWebAuthnChallengesCollection()).insertOne(doc);
    return doc;
  }

  async consume(params: {
    challenge: string;
    purpose: WebAuthnChallengePurpose;
    userId?: ObjectId | null;
    tokenHash?: string | null;
  }): Promise<WebAuthnChallengeDocument | null> {
    const filter: Record<string, unknown> = {
      challenge: params.challenge,
      purpose: params.purpose,
      usedAt: null,
      expiresAt: { $gt: new Date() },
      $expr: { $lt: ['$attempts', '$maxAttempts'] },
    };

    if (params.userId !== undefined) filter.userId = params.userId;
    if (params.tokenHash !== undefined) filter.tokenHash = params.tokenHash;

    const result = await (await getWebAuthnChallengesCollection()).findOneAndUpdate(
      filter,
      {
        $set: {
          usedAt: new Date(),
          updatedAt: new Date(),
        },
        $inc: { attempts: 1 },
      },
      { returnDocument: 'before' }
    );
    return result;
  }

  async recordFailure(params: {
    challenge: string;
    purpose: WebAuthnChallengePurpose;
    userId?: ObjectId | null;
    tokenHash?: string | null;
  }): Promise<void> {
    const filter: Record<string, unknown> = {
      challenge: params.challenge,
      purpose: params.purpose,
      usedAt: null,
      expiresAt: { $gt: new Date() },
      $expr: { $lt: ['$attempts', '$maxAttempts'] },
    };
    if (params.userId !== undefined) filter.userId = params.userId;
    if (params.tokenHash !== undefined) filter.tokenHash = params.tokenHash;
    await (await getWebAuthnChallengesCollection()).updateOne(filter, {
      $inc: { attempts: 1 },
      $set: { updatedAt: new Date() },
    });
  }
}
