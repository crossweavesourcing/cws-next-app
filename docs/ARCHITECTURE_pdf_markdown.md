# Architecture

## Why not Markdown-only?

Markdown cannot represent arbitrary PDF transforms, clipping paths, vector paint
operations, masks, font programs, blend modes, transparency groups, or layer
ordering. Semantic Markdown is therefore a companion representation, not the
visual source.

## Data flow

```text
Admin Route Handler
  -> validate relationships and permission
  -> validate PDF signature and limits
  -> PDF.js parse in Node.js
      -> page viewport
      -> text content
      -> operator list
      -> annotations
      -> structure tree
  -> semantic classifier
  -> semantic Markdown generator
  -> Cloudinary raw upload of original PDF
  -> MongoDB transaction-like create
      -> cleanup Cloudinary on failure
```

```text
Public catalog page
  -> load published MongoDB catalog
  -> pass scene JSON to client viewer
  -> PDF.js requests same-origin source API
  -> source API checks publication and proxies Cloudinary PDF
  -> visible/near-visible pages render to canvas
  -> scene text becomes transparent selectable overlay
  -> scene links become annotation overlays
```

## Why retain the original PDF?

A complete scene replay engine would require implementing much of ISO 32000 and a
PDF graphics renderer. PDF.js already implements the rendering pipeline. Retaining
the original PDF avoids lossy translation while the scene JSON enables search,
semantics, accessibility overlays, inspection, and later transformations.

## Catalog association rules

A catalog has nullable `categoryId` and `productId` fields. At least one is
required. Both may be set. Multiple catalog documents may reference the same
category or product.

## Security boundaries

- Route Handlers are public endpoints; server authorization is mandatory.
- PDF.js is configured with `isEvalSupported: false`.
- The public source proxy only serves published catalog PDFs.
- Cloudinary credentials remain server-only.
- Scene values are sanitized and size-limited before MongoDB persistence.
- Viewer links use `noopener` and `noreferrer`.
- Original PDF parsing should be isolated further for hostile public uploads.
