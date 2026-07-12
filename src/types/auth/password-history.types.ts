import type { ObjectId } from 'mongodb';
import type { HashAlgorithm } from './shared.types';

export interface PasswordHistoryDocument {
  readonly _id:       ObjectId;
  userId:             ObjectId;
  hash:               string;
  algorithm:          HashAlgorithm;
  readonly createdAt: Date;
}
