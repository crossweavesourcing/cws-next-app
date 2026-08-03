import type { ObjectId } from 'mongodb';

export interface GlobalSettingsDocument {
  _id: ObjectId;
  brandName?: string;
  defaultSocialImage?: string;
  organizationName?: string;
  organizationLegalName?: string;
  organizationUrl?: string;
  organizationLogo?: string;
  contactEmail?: string;
  contactPhone?: string;
  contactAddress?: string;
  socialLinks?: string[];
  updatedAt: Date;
  updatedBy: ObjectId | null;
}

export interface RedirectDocument {
  _id: ObjectId;
  source: string;
  destination: string;
  statusCode: 301 | 302 | 307 | 308;
  active: boolean;
  createdAt: Date;
  createdBy: ObjectId | null;
  updatedAt: Date;
  updatedBy: ObjectId | null;
}
