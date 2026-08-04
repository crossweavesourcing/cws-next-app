# 17 — Over-Configuration Risks

This document highlights fields or controls that should **NOT** be made configurable in the admin dashboard to protect application stability, SEO integrity, and security.

## Controls That Must Remain Developer-Only
1. **Raw `robots.txt` File Editing**: Exposing a raw text editor for `robots.txt` allows administrators to accidentally de-index critical paths (like `/products`) or remove security protections for `/dashboard/`. The current programmatically generated `/robots.ts` should remain.
2. **Raw JSON-LD Script Ingestion**: Allowing admins to paste arbitrary `<script type="application/ld+json">` code opens XSS attack vectors. Schema generation must always use strongly-typed data fields built by `schema-builders.ts`.
3. **Canonical Base URL (`APP_URL`)**: Domain roots should stay strictly in environment variables to prevent canonical mismatch loops across environments.
