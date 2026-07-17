import type { ObjectId } from 'mongodb';

export interface SystemSettingDocument {
  readonly _id: ObjectId;
  key:          string;
  value:        unknown; // Can be string, number, boolean, object, or array
  updatedBy:    ObjectId | null;
  updatedAt:    Date;
}
