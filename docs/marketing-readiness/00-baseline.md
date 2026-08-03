# Marketing Readiness Baseline

This document provides a static inventory of the CWS application's routing, rendering, metadata, and schema implementation before any SEO/marketing fixes are applied.

## 1. Route Inventory

| Route | Visibility | Indexable Status | Rendering Strategy |
|---|---|---|---|
| `/` | Public | Indexable | Static (Pre-rendered as static HTML) |
| `/products` | Public | Indexable | Static (Pre-rendered as static HTML) |
| `/products/[slug]` | Public | Indexable | SSG (Uses `generateStaticParams`) |
| `/catalogs/[slug]` | Public | Indexable | Dynamic (Server-rendered on demand) |
| `/dashboard/*` | Private | Technically Indexable (No robots/noindex applied) | Dynamic (Server-rendered on demand) |
| `/api/*` | Private | Technically Indexable (No robots/noindex applied) | Dynamic (API Handlers) |

## 2. Coverage Report

- **Metadata Configuration**: 
  - **Title & Description**: Present on root layout and dynamic routes.
  - **OpenGraph & Twitter Cards**: Missing.
  - **metadataBase**: Missing.
  - **Hreflang / x-default**: Missing.
- **Canonical URLs**: Missing across all routes.
- **Sitemap.xml**: Missing.
- **Robots.txt**: Missing.
- **Structured Data (Schemas)**: Missing entirely. No `Organization`, `WebSite`, or `Product` JSON-LD implemented.

## 3. Lighthouse & Accessibility Baselines (Static Analysis)

- **Performance**: High risk for Largest Contentful Paint (LCP) and Interaction to Next Paint (INP) due to `unoptimized: true` globally applied to Next.js images, and heavy client-side hydration on the homepage (`HomePageClient.tsx`).
- **Accessibility**: Missing focus-ring states on custom interactive elements. Multiple SVGs and decorative elements lack `aria-hidden="true"`. Missing "Skip to Main Content" link. Heading tag hierarchy is occasionally used for styling rather than document outline.
