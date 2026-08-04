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
  defaultSeoTitle?: string;
  defaultSeoDescription?: string;
  siteName?: string;
  googleSiteVerification?: string;
  bingSiteVerification?: string;
  gtmId?: string;
  alternateBusinessName?: string;
  titleTemplate?: string;
  companyDescription?: string;
  defaultLanguage?: string;
  defaultLocale?: string;
  favicon?: string;
  appleTouchIcon?: string;
  manifestDisplayName?: string;
  country?: string;
  serviceRegions?: string[];
  foundingYear?: number;
  publicBusinessType?: string;
  contactDepartments?: string[];
  geographicMarkets?: string[];
  openingHours?: string[];
  defaultOgTitle?: string;
  defaultOgDescription?: string;
  defaultOgImage?: string;
  defaultTwitterTitle?: string;
  defaultTwitterDescription?: string;
  defaultTwitterImage?: string;
  defaultTwitterCardType?: 'summary' | 'summary_large_image';
  analyticsEnabled?: boolean;
  conversionTrackingEnabled?: boolean;
  updatedAt: Date;
  updatedBy: ObjectId | null;
}

export interface PageSeoDocument {
  _id: ObjectId;
  path: string; // e.g. '/', '/about', '/contact'
  title?: string;
  description?: string;
  canonicalUrl?: string;
  noindex?: boolean;
  nofollow?: boolean;
  includeInSitemap?: boolean;
  socialTitle?: string;
  socialDescription?: string;
  socialImage?: string;
  breadcrumbLabel?: string;
  primaryTopic?: string;
  secondaryTopics?: string[];
  reviewStatus?: 'draft' | 'needs_review' | 'approved';
  internalNotes?: string;
  lastReviewedAt?: Date | null;
  createdAt: Date;
  createdBy: ObjectId | null;
  updatedAt: Date;
  updatedBy: ObjectId | null;
}

export interface RedirectDocument {
  _id: ObjectId;
  source: string;
  destination: string;
  statusCode: 301 | 302;
  active: boolean;
  reason?: string;
  notes?: string;
  startsAt?: Date | null;
  endsAt?: Date | null;
  createdAt: Date;
  createdBy: ObjectId | null;
  updatedAt: Date;
  updatedBy: ObjectId | null;
}
