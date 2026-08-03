# Current State Analysis

## Overview
The application is a Next.js App Router project utilizing React Server Components (RSC) and standard Next.js metadata features. The current architecture separates public marketing routes `src/app/(site)` from private administrative routes `src/app/(admin)`.

## Inspected Components
* **Public Routes**: `/`, `/products`, `/products/[slug]`, `/catalogs/[slug]`.
* **Private Routes**: `/dashboard/*`.
* **Metadata**: Hardcoded/fallback metadata in `layout.tsx` and dynamic metadata in `generateMetadata` for products.
* **SEO Files**: `robots.ts` and `sitemap.ts` generate dynamically based on published products and catalogs.
* **Configuration**: `next.config.ts` contains robust security headers and CSP, and injects `X-Robots-Tag: noindex` for non-production environments.
* **Database Models**: Products, Categories, Catalog Documents, Sections (for homepage content).
* **Analytics**: GTM/GA4 configuration exists via environment variables (`src/auth/config/env.ts`).
* **Structured Data**: Builders for `Organization`, `WebSite`, `Product`, and `BreadcrumbList` exist in `src/lib/seo/schema-builders.ts`.
