# PDF Catalog Documents

## Architecture

Catalog documents are a shared admin domain used by the web dashboard and mobile admin API. The browser/mobile client uploads the original PDF directly to Cloudinary with short-lived signed parameters. The server then inspects that asset, verifies its PDF signature and limits, renders every page through Cloudinary, and stores only metadata in MongoDB.

MongoDB never stores PDF or PNG bytes. `catalog_documents` stores the original Cloudinary asset identifier, ordered page URLs and dimensions, generated image-only Markdown, associations, publication state, and audit fields. The original PDF remains the source of truth; Markdown is a deterministic page manifest, not extracted document text.

## Associations And Permissions

- Category-only catalogs require the `categories` permission.
- Product-only catalogs require the `products` permission.
- Shared catalogs require both permissions.
- Replacement and deletion require permission for every current association.
- Detaching is allowed only when another association remains.
- Deleting a category/product detaches shared catalogs and unpublishes them. A catalog whose final association is removed is deleted with its Cloudinary asset.

## Upload And Processing

1. The client requests signed upload parameters with title and explicit associations.
2. The shared service authenticates permissions, checks that associations exist, creates an actor-scoped random public ID, and signs the exact Cloudinary parameters.
3. The client sends the PDF directly to `https://api.cloudinary.com` and reports upload progress.
4. Finalization retrieves the asset from Cloudinary and verifies ownership context, resource type, PDF format, byte limit, page limit, and the `%PDF-` signature.
5. Cloudinary renders each numbered page to a signed PNG URL at `PDF_RENDER_DPI`. The server downloads each result once to verify rendering and read its PNG dimensions and byte size.
6. Pages are checked for a complete one-based sequence. Markdown is generated only from the ordered page array.
7. A completed creation is saved as `draft`. Publishing is always explicit.

Creation failures remove the provisional asset and do not create a record. Replacement renders the new PDF first, atomically swaps the stored asset/page metadata, then removes the old asset. A failed replacement preserves the previous working version and records a safe `processingError`.

## Viewer Safety

`CatalogWebView` accepts only generated `p` and `img` Markdown nodes. Raw HTML and MDX are disabled. Every image URL must be HTTPS on `res.cloudinary.com` and must exactly match an entry in the catalog's stored `pages[]`. The viewer rejects Markdown that does not exactly equal a fresh manifest generated from `pages[]`.

Published catalogs are available at `/catalogs/[slug]`. Client navigation from a product page opens the same content through the site `@modal` slot; direct navigation and refresh render the canonical full page. `/dashboard/catalogs/[id]/preview` permits authorized previews of drafts.

## Mobile API

Bearer-authenticated routes live below `/api/mobile/v1/admin/catalogs`. They support filtered listing, upload initialization/finalization, detail, metadata, associations, publication, replacement, and deletion. All handlers call `CatalogDocumentService`; no catalog business rules are duplicated in route handlers. The routes are registered in the generated OpenAPI document.

## Configuration

- `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`: secret Cloudinary configuration.
- `PDF_MAX_UPLOAD_MB=25`: accepted original PDF size.
- `PDF_MAX_PAGES=100`: page count ceiling.
- `PDF_RENDER_DPI=200`: rendering density; accepted range is 72-300.

Authenticated PDF delivery and page transformations must be enabled in Cloudinary. The dashboard CSP permits connections only to the Cloudinary upload API in addition to same-origin requests.

## Database And Deployment

Run `pnpm db:init` in each environment after deployment to create/update the `catalog_documents` validator and indexes. Creation and page rendering are synchronous and must fit the hosting function timeout. Large page counts should be tested against the production Cloudinary account and Netlify timeout before increasing the defaults.

## Orphan Review

Catalog assets use `cws_catalogs/<actor-user-id>/<uuid>`. To review orphans safely, list Cloudinary resources under `cws_catalogs/`, export the `asset.publicId` values from `catalog_documents`, and compare the two sets. Treat Cloudinary-only IDs as candidates, not automatic deletions: verify that no catalog creation/finalization is active, retain an age buffer, and archive the candidate list before using Cloudinary's destroy API. Database-only IDs indicate missing assets and should be unpublished and investigated.

## Known Limitations

- This feature preserves visual pages, not semantic PDF text, links, forms, accessibility tags, animation, or selectable text.
- Password-protected or unsupported PDFs fail during Cloudinary rendering.
- Exact visual output depends on Cloudinary's PDF renderer; the original PDF is retained for recovery and replacement.
