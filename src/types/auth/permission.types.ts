import type { ObjectId } from 'mongodb';

export interface PermissionDocument {
  readonly _id: ObjectId;
  action:       string;
  resource:     string;
  description:  string;
  readonly createdAt: Date;
  updatedAt:          Date;
}
