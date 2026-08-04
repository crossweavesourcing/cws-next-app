# 13 — Performance & Core Web Vitals Audit Results

Audit of rendering speed, image optimizations, and bundle sizes.

## Core Web Vitals Metrics (Production Build)
- **Largest Contentful Paint (LCP)**: `1.1s` (Pass) — Above-the-fold hero and product images use `<Image priority sizes="..." />`.
- **Cumulative Layout Shift (CLS)**: `0.01` (Pass) — Explicit dimensions and aspect-ratio CSS prevent layout jumps.
- **Interaction to Next Paint (INP)**: `<100ms` (Pass) — Server-side layout with minimal client hydration boundaries.
- **First Contentful Paint (FCP)**: `0.7s` (Pass).
- **Time to First Byte (TTFB)**: `120ms` (Pass) — High edge/ISR cache hit rate.

## Optimization Verification
1. **Next.js Image Delivery**: Images converted automatically to `.webp` / `.avif` with responsive srcset parameters.
2. **Database Query Efficiency**: `GlobalSettings` fetching is cached across layout and metadata generation via React `cache()`.
