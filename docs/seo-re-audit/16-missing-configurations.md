# 16 — Missing Configurations

This document details remaining missing SEO configurations and CMS management capabilities that should be added to achieve full marketing completeness.

## Missing CMS Form Inputs
1. **Category SEO Overrides**: The `CategoryDocument` model in `src/types/catalog.ts` supports `seoOverrides`, but `EditCategoryClient.tsx` has no input fields for custom titles, meta descriptions, or canonical URLs.
2. **Catalog SEO Overrides**: The `CatalogDocument` model supports `seoOverrides`, but `CatalogForm.tsx` lacks input fields for custom titles and meta descriptions.

## Missing Marketing Integration Configurations
1. **GTM & GA4 Container Configuration**: Currently, Google Tag Manager IDs are read from environment variables (`NEXT_PUBLIC_GTM_ID`). Adding dynamic CMS override support would enable marketing teams to manage analytics tags directly.
2. **Redirect Manager UI**: The `RedirectRepository` and redirection handler exist in code, but there is no full CRUD interface in the admin CMS for non-technical users to manage 301 redirects.
