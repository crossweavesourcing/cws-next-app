import { ObjectId } from 'mongodb';
import { getTotpCredentialsCollection, getWebAuthnCredentialsCollection } from '@/database';
import type { TOTPCredentialDocument, WebAuthnCredentialDocument } from '@/types/auth';

export class MfaRepository {
  async saveTotpSecret(userId: ObjectId, secret: string): Promise<void> {
    const coll = await getTotpCredentialsCollection();
    const now = new Date();
    await coll.updateOne(
      { userId },
      {
        $set: {
          secret,
          verifiedAt: now,
          updatedAt: now,
        },
        $setOnInsert: {
          _id: new ObjectId(),
          createdAt: now,
        },
      },
      { upsert: true }
    );
  }

  async getTotpSecret(userId: ObjectId): Promise<string | null> {
    const coll = await getTotpCredentialsCollection();
    const doc = await coll.findOne({ userId });
    return doc?.secret ?? null;
  }

  async removeTotpSecret(userId: ObjectId): Promise<void> {
    const coll = await getTotpCredentialsCollection();
    await coll.deleteOne({ userId });
  }

  async saveWebAuthnCredential(
    userId: ObjectId,
    credential: Omit<WebAuthnCredentialDocument, '_id' | 'userId' | 'createdAt' | 'updatedAt' | 'lastUsedAt'>
  ): Promise<void> {
    const coll = await getWebAuthnCredentialsCollection();
    const now = new Date();
    await coll.insertOne({
      _id: new ObjectId(),
      userId,
      ...credential,
      lastUsedAt: null,
      createdAt: now,
      updatedAt: now,
    });
  }

  async getWebAuthnCredentials(userId: ObjectId): Promise<WebAuthnCredentialDocument[]> {
    const coll = await getWebAuthnCredentialsCollection();
    return coll.find({ userId }).toArray();
  }

  async getWebAuthnCredentialById(credentialID: string): Promise<WebAuthnCredentialDocument | null> {
    const coll = await getWebAuthnCredentialsCollection();
    return coll.findOne({ credentialID });
  }

  async updateWebAuthnCredentialUsage(id: ObjectId, newCounter: number): Promise<void> {
    const coll = await getWebAuthnCredentialsCollection();
    await coll.updateOne(
      { _id: id },
      {
        $set: {
          counter: newCounter,
          lastUsedAt: new Date(),
          updatedAt: new Date(),
        },
      }
    );
  }

  async removeWebAuthnCredential(id: ObjectId, userId: ObjectId): Promise<void> {
    const coll = await getWebAuthnCredentialsCollection();
    await coll.deleteOne({ _id: id, userId });
  }
}
