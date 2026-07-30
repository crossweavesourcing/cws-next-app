import { ObjectId } from 'mongodb';
import { getTotpCredentialsCollection, getWebAuthnCredentialsCollection } from '@/database';
import type { TOTPCredentialDocument, WebAuthnCredentialDocument } from '@/types/auth';
import { getEnv } from '@/auth/config/env';
import { encryptSymmetric, decryptSymmetric } from '@/auth/lib/encryption';

function encrypt(secret: string): string {
  const key = getEnv().TOTP_ENCRYPTION_KEY;
  if (!key) throw new Error('TOTP_ENCRYPTION_KEY is required to encrypt TOTP secrets.');
  return encryptSymmetric(secret, key);
}

function decrypt(payload: string): string {
  if (!payload.startsWith('v1:')) return payload; // Legacy plaintext
  const key = getEnv().TOTP_ENCRYPTION_KEY;
  if (!key) throw new Error('TOTP_ENCRYPTION_KEY is required to decrypt this secret.');
  return decryptSymmetric(payload, key);
}

export class MfaRepository {
  async saveTotpSecret(userId: ObjectId, secret: string): Promise<void> {
    const coll = await getTotpCredentialsCollection();
    const now = new Date();
    await coll.updateOne(
      { userId },
      {
        $set: {
          secret: encrypt(secret),
          verifiedAt: now,
          // A newly enrolled secret starts a new replay-prevention sequence.
          lastAcceptedTimeStep: null,
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
    return doc?.secret ? decrypt(doc.secret) : null;
  }

  async getTotpCredential(userId: ObjectId): Promise<TOTPCredentialDocument | null> {
    const coll = await getTotpCredentialsCollection();
    const doc = await coll.findOne({ userId });
    if (doc?.secret) {
      doc.secret = decrypt(doc.secret);
    }
    return doc;
  }

  async markTotpTimeStepAccepted(userId: ObjectId, timeStep: number): Promise<boolean> {
    const coll = await getTotpCredentialsCollection();
    const result = await coll.updateOne(
      {
        userId,
        $or: [
          { lastAcceptedTimeStep: null },
          { lastAcceptedTimeStep: { $exists: false } },
          { lastAcceptedTimeStep: { $lt: timeStep } },
        ],
      },
      {
        $set: {
          lastAcceptedTimeStep: timeStep,
          updatedAt: new Date(),
        },
      }
    );
    return result.modifiedCount === 1;
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
    return coll.find({ userId }).sort({ createdAt: 1 }).toArray();
  }

  async getWebAuthnCredentialsForDevice(
    userId: ObjectId,
    deviceObjectId: ObjectId
  ): Promise<WebAuthnCredentialDocument[]> {
    const coll = await getWebAuthnCredentialsCollection();
    return coll.find({ userId, deviceObjectId }).sort({ createdAt: 1 }).toArray();
  }

  async getWebAuthnCredentialById(credentialID: string): Promise<WebAuthnCredentialDocument | null> {
    const coll = await getWebAuthnCredentialsCollection();
    return coll.findOne({ credentialID });
  }

  async getWebAuthnCredentialByIdForDevice(
    credentialID: string,
    deviceObjectId: ObjectId
  ): Promise<WebAuthnCredentialDocument | null> {
    const coll = await getWebAuthnCredentialsCollection();
    return coll.findOne({ credentialID, deviceObjectId });
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

  async renameWebAuthnCredential(id: ObjectId, userId: ObjectId, name: string | null): Promise<boolean> {
    const coll = await getWebAuthnCredentialsCollection();
    const result = await coll.updateOne(
      { _id: id, userId },
      {
        $set: {
          name,
          updatedAt: new Date(),
        },
      }
    );
    return result.modifiedCount === 1;
  }

  async removeWebAuthnCredential(id: ObjectId, userId: ObjectId): Promise<void> {
    const coll = await getWebAuthnCredentialsCollection();
    await coll.deleteOne({ _id: id, userId });
  }
}
