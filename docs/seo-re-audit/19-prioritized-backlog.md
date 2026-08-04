# 19 — Prioritized Backlog

This backlog outlines actionable tasks grouped by priority level to complete the marketing readiness cycle.

## Priority P0: Production Blockers
1. **Category SEO Overrides UI**: Add "SEO Overrides" input fields to `src/app/(admin)/dashboard/(cms)/categories/_components/EditCategoryClient.tsx`.
2. **Catalog SEO Overrides UI**: Add "SEO Overrides" input fields to `src/app/(admin)/dashboard/(cms)/catalogs/_components/CatalogForm.tsx`.
3. **GeoIP Step-Up MFA Key**: Configure `GEOIP_LOOKUP_URL` environment variable for production step-up security.

## Priority P1: SEO Completeness Improvements
1. **Redirect Manager UI**: Implement a lightweight admin CRUD interface for Managing dynamic 301 redirects in `/dashboard/seo`.
2. **Dynamic GTM Container Settings**: Expose GTM container ID configuration inside `GlobalSettingsForm` so marketing teams can update tracking tags without redeploying code.

## Priority P2: Marketing & Conversion Growth
1. **Catalog Download Conversion Tracking**: Implement a client-side GTM event trigger when users view or download PDF catalogs.
2. **Contact Form Submission Analytics Event**: Wire up explicit GA4 custom conversion events on contact form success.
