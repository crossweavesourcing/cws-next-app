import type { ObjectId } from 'mongodb';
import type { LoginMethod } from './shared.types';

export type MobileMfaMethod = 'totp' | 'email' | 'webauthn';

export interface MobileAuthChallengeDocument {
  readonly _id: ObjectId;
  readonly tokenHash: string;
  readonly userId: ObjectId;
  readonly loginMethod: LoginMethod;
  readonly methods: MobileMfaMethod[];
  attempts: number;
  maxAttempts: number;
  expiresAt: Date;
  usedAt: Date | null;
  readonly ipAddress: string;
  readonly userAgent: string | null;
  webauthnChallenge?: string;
  readonly createdAt: Date;
}
