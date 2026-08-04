# 20 — Production Readiness Checklist

- [x] **Dynamic Robots.txt**: `/robots.txt` blocks private admin & API routes (`/dashboard/`, `/api/`).
- [x] **Dynamic Sitemap**: `/sitemap.xml` lists static pages, active products, and catalogs with valid `lastModified` dates.
- [x] **Production Build Verification**: `pnpm build` executes cleanly with zero TypeScript or linting errors.
- [x] **Unit & Integration Testing**: `pnpm test:unit` passes 100% of tests (267 passed).
- [x] **Global Settings Management**: Admins can edit site title, meta description, brand logo, organization address, phone, and social links via CMS.
- [x] **Static Page SEO Overrides**: Admins can override title, description, canonical URL, and noindex on static routes via `page_seo`.
- [x] **Product SEO Overrides**: Admins can set custom SEO metadata per product via `Product.seoOverrides`.
- [x] **Image Delivery & CWV**: Native `<img>` tags migrated to `next/image` with responsive sizing and LCP priority.
- [x] **Security & Authorization**: All mutation endpoints enforced with `requireRole('admin')`.
- [ ] **Category & Catalog UI Overrides**: Add missing form controls for category and catalog SEO overrides in CMS (P0 Blocker).
