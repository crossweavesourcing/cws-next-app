# 08 — Database Audit

This document details the MongoDB database schemas backing the SEO and CMS configurability engine.

## Collection: `global_settings`
- **File**: `src/database/schemas/global-settings.schema.ts`
- **Singleton**: Yes (ensured via single document query pattern in `GlobalSettingsRepository`).
- **Fields**:
  - `siteName`: string (Required)
  - `brandName`: string (Optional)
  - `defaultSeoTitle`: string (Required)
  - `defaultSeoDescription`: string (Required)
  - `defaultSocialImage`: string (Optional)
  - `organizationName`: string (Optional)
  - `organizationLegalName`: string (Optional)
  - `organizationLogo`: string (Optional)
  - `contactEmail`: string (Optional)
  - `contactPhone`: string (Optional)
  - `contactAddress`: string (Optional)
  - `socialLinks`: string[] (Optional)
  - `googleSiteVerification`: string (Optional)
  - `bingSiteVerification`: string (Optional)
  - `updatedAt`: Date
  - `updatedBy`: ObjectId

## Collection: `page_seo`
- **File**: `src/database/schemas/page-seo.schema.ts`
- **Indexes**: Unique index on `path: 1`
- **Fields**:
  - `path`: string (Required, Unique)
  - `title`: string (Optional)
  - `description`: string (Optional)
  - `canonicalUrl`: string (Optional)
  - `noindex`: boolean (Default: false)
  - `createdAt`: Date
  - `updatedAt`: Date

## Embedded Schema: `SeoOverrides` (Products, Categories, Catalogs)
- **File**: `src/types/catalog.ts` & `src/types/seo.ts`
- **Fields**:
  - `title`: string (Optional)
  - `description`: string (Optional)
  - `canonicalUrl`: string (Optional)
  - `noindex`: boolean (Optional)

## Audit Assessment
- **Indexes**: `page_seo.path` is properly indexed for fast $O(1)$ lookups during `generateMetadata`.
- **Integrity**: Timestamps (`createdAt`, `updatedAt`) and updater IDs (`updatedBy`) are strictly updated by repositories.
