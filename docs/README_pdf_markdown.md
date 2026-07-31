# PDF Scene Catalog

A reference Next.js codebase for this pipeline:

```text
PDF upload
  -> PDF.js structural parsing
  -> scene JSON + semantic Markdown
  -> original PDF stored in Cloudinary
  -> MongoDB catalog record
  -> PDF.js canvas replay as a continuous webpage
  -> transparent selectable text + clickable annotation overlays
```

## Important accuracy decision

A normal Markdown document cannot store or replay every PDF graphics feature. This
codebase therefore stores:

1. **Original PDF** in Cloudinary — canonical visual source.
2. **Scene JSON** in MongoDB — text positions, font/style hints, image placements,
   vector/paint operations, links, transforms, structure tree, and unsupported
   operator counts.
3. **Semantic Markdown** in MongoDB — search, indexing, accessibility, and AI use.

The public viewer does **not** use an iframe or browser PDF toolbar. It uses PDF.js
to render each page into a canvas inside one continuously scrolling web page. The
stored scene supplies selectable text and link overlays.

This gives higher fidelity than attempting to rebuild arbitrary PDFs from HTML.
The visual output still depends on PDF.js support for the PDF feature set.

## Included files

- Server PDF parser based on `getTextContent()`, `getOperatorList()`,
  `getAnnotations()`, and `getStructTree()`.
- Text semantic classification for titles, headings, headers, footers, captions,
  and paragraphs.
- Semantic Markdown generation.
- Operator state tracking for colors, transformations, vector paints, and image
  placement metadata.
- Cloudinary original-PDF storage and rollback.
- MongoDB/Mongoose catalog model.
- Admin upload and publish APIs.
- Continuous canvas viewer with lazy page rendering.
- Same-origin PDF source proxy with HTTP Range forwarding.
- Demo upload screen and demo token authorization adapter.
- Root parallel/intercepting route that opens catalog links in a modal during client navigation while retaining the full-page route.
- Agent integration prompt in `AGENT_IMPLEMENTATION_PROMPT.md`.

## Setup

```bash
cp .env.example .env.local
npm install
npm run dev
```

`@napi-rs/canvas` is included because PDF.js uses it for Node-side canvas and geometry polyfills.

The `postinstall` script copies the PDF.js worker to:

```text
public/pdf.worker.min.mjs
```

Configure MongoDB, Cloudinary, and `DEMO_ADMIN_TOKEN` in `.env.local`.

Open:

```text
http://localhost:3000/admin/catalogs/new
```

## Integrating into an existing application

Replace `src/server/auth/catalog-permissions.ts` with your existing authentication
and resource-level permission system.

Required permission mapping:

- Category association: user can add or edit that category.
- Product association: user can add or edit that product.
- Both associations: both permissions are required.

`src/server/catalog/domain-adapter.ts` automatically checks existing Mongoose
models named `Category` and `Product` when those models are already registered.
Adapt this file if your model names or data-access layer differ.

## Storage model

MongoDB stores:

- catalog metadata and category/product associations;
- Cloudinary source-PDF metadata;
- parsed scene JSON;
- semantic Markdown;
- publication state.

The parser enforces a default 12 MB scene limit because MongoDB documents have a
16 MB BSON limit. For unusually complex PDFs, move `scene` JSON to Cloudinary raw
or S3 and keep only its storage key in MongoDB.

## What the scene parser detects

### Text

Stored per text run:

- content;
- x/y position;
- width/height;
- six-value transformation matrix;
- rotation angle;
- PDF font name and inferred family;
- font size, inferred weight, and inferred italic style;
- best-effort text fill color;
- direction and line-ending hints;
- inferred semantic role.

### Images

Stored per image paint operation:

- image operator type;
- object reference when available;
- current transformation matrix;
- inferred page bounding box;
- opacity and paint order.

The image binary is not duplicated. Exact image rendering comes from replaying the
stored source PDF through PDF.js.

### Vector graphics and paint operations

Stored for important path/paint operators:

- operator name;
- sanitized arguments;
- current transform;
- fill/stroke colors;
- line width;
- opacity;
- paint order.

### Links

Link annotations are stored as positioned overlays and become clickable in the
web viewer.

### Structure

The PDF structure tree is stored when the PDF is tagged. For untagged PDFs,
headers/headings/paragraphs are inferred heuristically.

## Known limitations

- PDF has no universal semantic representation of “header”, “paragraph”, or
  “table”; untagged files require heuristics.
- Text color matching from the operator list is best effort for complex nested
  text operations.
- The scene JSON is not a complete independent PDF graphics interpreter.
- Exact visuals come from rendering the retained source PDF with PDF.js.
- Some advanced PDF features may not render identically to Adobe Acrobat.
- Forms, media, JavaScript actions, 3D objects, and other interactive features are
  not reconstructed as editable web controls.
- The transparent text overlay is intended for selection/accessibility; the
  visible text comes from the canvas.

## Production hardening checklist

- Replace the demo token adapter.
- Add malware scanning before parsing untrusted uploads.
- Run parsing in an isolated worker/container for high-volume deployments.
- Enforce request, page-count, scene-size, and execution-time limits.
- Add rate limits and audit logs.
- Add catalog update/delete flows and Cloudinary cleanup reconciliation.
- Add category/product detail integration and adapt the included root parallel-route modal to the application route groups when necessary.
- Pin and regularly update PDF.js because PDF parsers handle untrusted files.
- Test representative PDFs from your real catalog workflow.

## Validation status

This repository was generated as an integration reference. Package installation
and a full Next.js build could not be executed in the generation environment
because its npm registry did not provide the required public packages. The source
was syntax-reviewed, but the receiving agent must run:

```bash
npm install
npm run typecheck
npm run lint
npm run build
```

and resolve any repository-specific integration differences.
