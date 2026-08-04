# Production Readiness Checklist

## Crawlability and indexing

- [x] Public pages crawlable
- [x] Dashboard blocked
- [x] API blocked
- [x] Staging and previews noindexed
- [x] Sitemap valid in unit tests
- [x] Drafts/unpublished catalogs excluded
- [x] Canonical validation added
- [x] Redirect validation added
- [x] Redirect chain checks added
- [x] Redirect loop checks added

## Metadata

- [x] Global metadata valid
- [x] Page overrides valid
- [x] Product overrides valid
- [x] Catalog overrides dashboard-configurable
- [x] Category strategy finalized
- [x] Social previews supported by fallback hierarchy
- [x] Search verification remains dashboard-configurable

## Dashboard

- [x] Catalog SEO fields persist end to end
- [x] Category fields work with dedicated category pages
- [x] Redirect manager works with internal-only validation
- [x] Permissions enforced through existing CMS permissions
- [x] Cache invalidation paths updated
- [ ] Full production dashboard update test executed

## Marketing analytics

- [x] Production GTM isolated by environment variable
- [x] Staging/preview analytics disabled by default
- [x] Contact lead event implemented
- [ ] Quote event verified; no quote form found
- [x] Catalog view/download/open events implemented
- [x] PII stripping implemented
- [x] Event deduplication implemented

## Security

- [ ] GeoIP production configuration verified
- [ ] High-risk fallback production policy verified
- [x] Redirect open-redirect protection implemented
- [x] Raw technical editors not exposed
- [x] Server authorization retained

## Quality

- [x] Lint passes
- [x] Unit tests pass
- [x] E2E tests executed
- [x] Production build passes
- [ ] Full runtime SEO inspection executed
- [x] Accessibility regression executed locally
- [ ] Performance regression executed
