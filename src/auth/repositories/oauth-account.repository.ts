import { ObjectId } from 'mongodb';
import { getOAuthAccountsCollection } from '@/database';
import type { OAuthAccountDocument } from '@/types/auth';

/**
 * Links external OAuth provider accounts (Google) to internal user records.
 */
export class OAuthAccountRepository {
  /**
   * Finds a linked provider account by (provider, providerAccountId).
   */
  async findByProvider(
    provider: 'google',
    providerAccountId: string
  ): Promise<OAuthAccountDocument | null> {
    const coll = await getOAuthAccountsCollection();
    return coll.findOne({ provider, providerAccountId });
  }

  /**
   * Links a provider account to a user. Idempotent on (provider, providerAccountId).
   */
  async link(
    userId: ObjectId,
    provider: 'google',
    providerAccountId: string,
    providerEmail: string | null
  ): Promise<OAuthAccountDocument> {
    const coll = await getOAuthAccountsCollection();
    const existing = await coll.findOne({ provider, providerAccountId });
    if (existing) {
      await coll.updateOne(
        { _id: existing._id },
        { $set: { providerEmail, lastUsedAt: new Date() } }
      );
      return { ...existing, providerEmail, lastUsedAt: new Date() };
    }

    const doc: OAuthAccountDocument = {
      _id: new ObjectId(),
      userId,
      provider,
      providerAccountId,
      providerEmail,
      profile: null,
      linkedAt: new Date(),
      lastUsedAt: new Date(),
    };
    await coll.insertOne(doc);
    return doc;
  }

  /**
   * Records usage of a linked provider account (e.g. on successful OAuth login).
   */
  async touchLastUsed(providerAccountId: string, provider: 'google'): Promise<void> {
    const coll = await getOAuthAccountsCollection();
    await coll.updateOne(
      { provider, providerAccountId },
      { $set: { lastUsedAt: new Date() } }
    );
  }
}
