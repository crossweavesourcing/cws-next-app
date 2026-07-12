import type { ObjectId } from 'mongodb';

export interface RoleDocument {
  readonly _id: ObjectId;
  name:         string;
  slug:         string;
  description:  string;
  permissions:  Array<ObjectId | string>;
  isSystem:     boolean;
  readonly createdAt: Date;
  updatedAt:          Date;
}
