# 09 — API Validation & Permission Audit

This document audits the Server Actions and API endpoints handling SEO mutations.

| Server Action / Endpoint | Permission Required | Validation Schema | Audit Logged? | Cache Invalidation | Sanitization | Status |
| ------------------------ | ------------------- | ----------------- | ------------- | ------------------ | ------------ | ------ |
| `saveGlobalSettingsAction` | `requireRole('admin')` | `globalSettingsSchema` (Zod) | Yes | `revalidateTag('global-settings')` | Yes | PASS |
| `savePageSeoAction` | `requireRole('admin')` | `pageSeoSchema` (Zod) | Yes | `revalidateTag('page-seo')` | Yes | PASS |
| `deletePageSeoAction` | `requireRole('admin')` | Path ID string | Yes | `revalidateTag('page-seo')` | Yes | PASS |
| `updateProductAction` | `requireRole('admin')` | `productSchema` (Zod) | Yes | `revalidateTag('products')` | Yes | PASS |
| `createProductAction` | `requireRole('admin')` | `productSchema` (Zod) | Yes | `revalidateTag('products')` | Yes | PASS |

## Validation & Security Findings
1. **Zod Validation**: Input values for URLs (`canonicalUrl`, `defaultSocialImage`) are sanitized and validated to ensure valid URL structure.
2. **Role Enforcement**: Every mutation mandates active admin session validation (`requireRole('admin')`), preventing unauthenticated or non-admin edits.
3. **Cache Coherency**: Server actions trigger Next.js `revalidateTag()` and `revalidatePath()`, purging outdated static pages instantly upon form submit.
