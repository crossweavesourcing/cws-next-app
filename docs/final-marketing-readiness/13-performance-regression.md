# Performance Regression

Executed:

- `pnpm build` completed successfully.

Observed:

- Static generation emitted slow database query warnings for `catalog_documents`, `global_settings`, `products`, `categories`, and `sections`.
- Public category page remains server-rendered and uses optimized `next/image`.
- Analytics remains non-blocking and disabled outside production by default.

Not executed:

- Lighthouse/Core Web Vitals lab run.
- Real cache-hit measurement.

Risk:

- Metadata/global settings queries may need further deduplication if production build/runtime query latency remains high.
