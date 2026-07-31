# Agentic AI integration prompt

Integrate the `pdf-scene-catalog` reference codebase into the current application.
Do not replace the application's existing architecture. Inspect the repository
first, then adapt the reference implementation to its conventions.

## Required outcome

Implement PDF catalogs associated with a category, a product, or both. Categories
and products may each have zero, one, or multiple catalogs. Products without a
category must support product-only catalogs.

A catalog upload must create:

- an original PDF asset in the existing Cloudinary account;
- parsed scene JSON with page dimensions, text positions/styles, image placements,
  vector/paint metadata, links, transforms, structure information, and unsupported
  operator counts;
- semantic Markdown for search/indexing/accessibility;
- a MongoDB catalog record with associations and status.

The public catalog must appear as a normal continuous webpage. Do not use iframe,
object/embed, browser PDF toolbar, or the stock PDF.js viewer. Render visible pages
through the custom canvas viewer and apply the stored text/link overlays.

## Critical architectural rule

Do not attempt Markdown-only visual reconstruction. Keep:

1. original PDF as canonical visual source;
2. scene JSON as parsed layout/semantic data;
3. semantic Markdown as companion content.

The custom viewer may use PDF.js to replay the retained original PDF because a
complete scene-only replay engine would require reimplementing a PDF renderer.

## Repository integration tasks

1. Inspect the current Next.js version, App Router route tree, MongoDB layer,
   Cloudinary wrapper, category/product models, authentication, permissions,
   dashboard detail pages, public product page, modal implementation, testing,
   and cache strategy.
2. Merge parser files under the current server/library conventions.
3. Merge the CatalogDocument model into the current data layer.
4. Replace the demo token permission adapter with current resource-level checks:
   - category association requires category add/edit permission;
   - product association requires product add/edit permission;
   - both associations require both permissions.
5. Validate referenced category/product records.
6. Add category-detail and product-detail dashboard catalog management.
7. Add full-page published catalog route.
8. Add product-page catalog buttons.
9. Add an App Router intercepting/parallel-route modal using the same viewer.
10. Implement replace, publish/unpublish, detach, and delete flows with Cloudinary
    rollback and cleanup.
11. Preserve uncategorized products.
12. Add unit, integration, permission, and browser tests.
13. Run typecheck, lint, tests, and production build.

## Non-negotiable requirements

- Never trust client permission claims.
- At least one category/product association is required.
- Do not infer a category association from a product.
- Do not store Base64 PDF/image data in MongoDB.
- Do not expose draft/failed catalogs publicly.
- Do not delete the old asset before a replacement is fully stored.
- Do not enable executable MDX or raw administrator HTML.
- Do not claim exact independent scene replay; visual fidelity comes from PDF.js
  rendering of the retained source.
- Record unsupported parser operators so limitations are observable.

## Final report

After implementation, report files changed, final schema, routes, permission
matrix, storage/rollback behavior, modal route structure, tests run, typecheck,
lint, build result, and any unsupported PDF cases found. Do not claim commands
were run unless they actually completed.
