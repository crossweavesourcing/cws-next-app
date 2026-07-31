# Implement PDF Catalog Documents

## Summary

Add `CatalogDocument` as a standalone MongoDB entity associated explicitly with a category, a product, or both. Catalog PDFs will be uploaded to Cloudinary, converted into ordered lossless PNG pages, stored as page metadata plus generated Markdown, and displayed publicly as a continuous scrolling webpage.

The implementation will cover the web dashboard, public product pages, secured mobile admin APIs, OpenAPI documentation, cleanup and rollback, tests, and technical documentation without changing existing category or product behavior.

## Backend And Storage

- Add `CatalogDocument`, `CatalogPage`, asset, rendering, and status types using MongoDB `ObjectId` fields internally and serialized strings at client/API boundaries.
- Add a `catalog_documents` collection with strict validation and indexes for:
  - Unique slug.
  - `categoryId`, status, and update date.
  - `productId`, status, and update date.
  - Publication and dashboard listing queries.
- Require at least one association. Validate referenced categories/products and prevent sequential-page, URL, page-count, or association invariants from being bypassed.
- Add catalog repository, validation helpers, permission helpers, Cloudinary asset service, Markdown generator, and orchestration service.
- Use the existing permissions:
  - Category association requires `categories`.
  - Product association requires `products`.
  - Shared catalogs require both.
  - Content replacement and deletion require permissions for every current association.
  - Detaching an association requires its corresponding permission and cannot leave the catalog associationless.
- Extend category/product deletion so shared catalogs lose only the deleted association, while catalogs whose final association is deleted are removed with their Cloudinary assets.
- Persist completed creations as `draft`; expose `processing` as the active upload UI state. Failed creation leaves no catalog record and returns a safe error after cleanup. Existing records retain their prior working version if replacement fails, with a safe `processingError`.
- Replacement will process the new PDF first, atomically replace the catalog document, then remove old assets. Cleanup failures will be logged separately without rolling back a successful database update.
- Publishing requires a complete PDF, sequential pages, valid Markdown, and at least one live association. Only `published` records are available from public queries.

## Upload And PDF Processing

- Use a two-step signed direct-upload flow because Netlify's binary request limit is approximately 4.5 MB, below the requested 25 MB catalog limit. See [Netlify Functions limits](https://docs.netlify.com/build/functions/configuration/?fn-language=js).
- First authorize the user and associations server-side, then issue short-lived, tightly scoped signed Cloudinary upload parameters with a generated asset identifier and signed ownership context.
- After direct upload, the server will retrieve and verify the Cloudinary asset rather than trusting the browser response:
  - Expected asset identifier and ownership context.
  - PDF format and MIME metadata.
  - Original filename and byte limit.
  - `%PDF-` signature using a ranged read.
  - Non-empty page count within the configured limit.
  - Successful Cloudinary page transformation, which rejects unsupported and password-protected image-type PDFs.
- Generate every page through Cloudinary's numbered PDF-page transformations at the configured DPI and PNG format. Cloudinary reports PDF page counts and supports page-specific image conversion and density controls. See [PDF uploads](https://cloudinary.com/documentation/ts_how_to_upload_manage_and_deliver_pdf_files) and the [transformation reference](https://cloudinary.com/documentation/transformation_reference).
- Request and store each generated page's URL, width, height, byte size, public ID where available, and sequential page number.
- Generate Markdown exclusively from the ordered `pages[]` source.
- On validation, transformation, or database failure, delete the provisional PDF and all known derived assets.
- Use Cloudinary transformations as the sole renderer for this implementation. If PDF transformations are disabled for the deployed Cloudinary environment, return a safe configuration error and document how to enable them; do not silently introduce a native Netlify renderer.
- Add `PDF_MAX_UPLOAD_MB=25`, `PDF_MAX_PAGES=100`, and `PDF_RENDER_DPI=200`, validating DPI within 72-300.
- Update the dashboard CSP in both Next config and proxy-generated policy to permit authenticated direct uploads only to `https://api.cloudinary.com`.

## Application Interfaces

- Add shared catalog service operations for creation finalization, lookup, filtered listing, metadata updates, PDF replacement, association updates, publish/unpublish, and deletion.
- Add web Server Actions for dashboard mutations and signed-upload initialization, preserving server-side session, CSRF/origin, permission checks, safe action-state errors, and cache revalidation.
- Add secured bearer-token mobile endpoints and OpenAPI definitions for:
  - Catalog creation initialization/finalization and filtered listing.
  - Catalog detail, metadata update, and deletion.
  - PDF replacement initialization/finalization.
  - Association changes.
  - Publish and unpublish.
- Keep business rules in the shared service so Server Actions and mobile routes use identical validation and authorization.
- Return serialized catalog summaries rather than MongoDB or Cloudinary SDK objects. Never return Cloudinary secrets or internal errors.
- Regenerate the OpenAPI document and register every new mobile path in the assembler.

## Dashboard Experience

- Add a reusable catalog manager and upload/edit form to the existing category and product edit screens, since the application has no separate dashboard detail routes.
- Preselect and lock the originating resource:
  - Category screen locks the category and offers an optional product.
  - Product screen locks the product and offers an optional category.
  - Never infer a category from the selected product.
  - Uncategorized products support product-only catalogs.
- Show empty, loading, uploading/processing, draft, published, and failed-replacement states.
- Display title, associations, status, page count, update date, preview, edit metadata, replace PDF, publish/unpublish, detach, and delete actions according to permissions.
- Use a responsive existing-style modal with a fixed header/footer and internally scrolling body for long forms.
- Show filename, size, upload progress, processing progress, validation feedback, and disable duplicate submissions.
- Keep DPI controlled by environment configuration rather than exposing a technical quality control in the form.
- Add a protected dashboard preview route that can render drafts. Public catalog URLs remain restricted to published catalogs.

## Public Viewer And Routing

- Add `react-markdown` as the maintained Markdown parser; do not enable raw HTML or MDX.
- Build one reusable `CatalogWebView` shared by full-page, modal, and dashboard preview routes.
- Restrict rendering to generated paragraphs/images, validate every Markdown image URL against `pages[]`, and reject links, raw HTML, scripts, objects, embeds, and unexpected URLs.
- Render pages edge-to-edge with stored dimensions, no inter-page gaps, eager loading for page one, and lazy loading afterward.
- Add canonical `/catalogs/[slug]` pages with server fetching, metadata, direct navigation support, and `notFound()` for missing or unpublished catalogs.
- Query published product catalogs alongside the public product detail request and show one action per catalog, hiding the section when empty.
- Add a site-level `@modal` slot, required `default.tsx`, and `@modal/(.)catalogs/[slug]` interception under the existing site layout.
- Use the same viewer inside an accessible full-height dialog with focus restoration, background locking, Escape/backdrop/close-button handling, and internal scrolling.
- Catalog links use the canonical URL, so client navigation from a product opens the intercepted modal while direct navigation or refresh renders the full page.
- No new public category route will be introduced because none currently exists.

## Cache, Audit, And Cleanup

- Revalidate affected category edit, product edit, dashboard preview, public product, and canonical catalog routes after every mutation.
- Invalidate both old and new product/category paths when associations change.
- Add structured audit events for create, replace, metadata update, association changes, publish/unpublish, and delete without recording file contents or secrets.
- Document the Cloudinary folder/public-ID structure and provide a safe script or documented procedure for identifying assets with no matching catalog record.
- Preserve unrelated existing worktree changes, including the current add-user modal adjustment.

## Test Plan

- Unit-test PDF signature, size/page/DPI limits, association validation, slug validation, Markdown ordering, URL allowlisting, lifecycle transitions, and permission decisions.
- Service-test category-only, product-only, uncategorized-product, and shared creation; replacement ordering; publish restrictions; detach rules; category/product deletion effects; and cleanup after Cloudinary or MongoDB failures.
- Mock Cloudinary upload signing, resource inspection, transformations, and deletion. Normal tests will not use production assets.
- API-test authentication, bearer permissions, direct-upload finalization validation, safe errors, filtering, serialization, and OpenAPI contracts.
- UI/E2E-test zero/one/multiple catalogs, upload states, public visibility, canonical full page, intercepted modal navigation, browser back/forward, focus restoration, long-modal scrolling, and gapless page rendering.
- Run:
  - `pnpm lint`
  - `pnpm test:unit`
  - Focused Playwright catalog tests, followed by `pnpm test:e2e` when the environment supports its database/auth fixtures.
  - `pnpm docs:generate`
  - `pnpm docs:check`
  - `pnpm test:api-contract`
  - `pnpm build`
- Review the final diff for generated or unrelated changes and report every command exactly as passed, failed, or blocked.

## Documentation And Assumptions

- Add a repository document covering architecture, schema, associations, permission matrix, signed upload flow, Cloudinary processing, Markdown safety, routes, lifecycle, replacement, deletion, orphan cleanup, configuration, testing, deployment, and known limitations.
- Update `.env.example` with non-secret PDF limits only.
- Catalog slugs are generated from titles and receive a unique suffix on collision, matching the application's public slug preference.
- Catalog creation always starts as draft; publication is an explicit action.
- Existing CMS permissions are resource-type permissions, so "permission for a resource" maps to `categories` or `products`; this task does not introduce record-level ownership.
- Mobile catalog administration is included because existing category/product administration is shared with the mobile client.
- Cloudinary PDF transformations are assumed to be enabled in production; no worker or queue currently exists, so processing remains synchronous and must complete within Netlify's 60-second function limit.
