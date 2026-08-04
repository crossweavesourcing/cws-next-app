# 11 — Dashboard Update Tests

Verification of real-time cache invalidation when saving SEO values in the admin dashboard.

| Tested Setting | Original Value | Updated Value | DB Persisted | Audit Log Created | Cache Invalidated | Rendered HTML Updated | Test Status |
| -------------- | -------------- | ------------- | ------------ | ----------------- | ----------------- | --------------------- | ----------- |
| Global Default Title | Old Brand Title | `CWS Garments | Global Sourcing` | Yes | Yes | Yes | Immediate | PASS |
| Product SEO Title | Default Product Name | `Custom Eco-Cotton Tote` | Yes | Yes | Yes | Immediate | PASS |
| Page Override (`/`) | Default Home Title | `Custom Homepage Title Override` | Yes | Yes | Yes | Immediate | PASS |
| Search Verification | Unset | `google1234567890abcdef` | Yes | Yes | Yes | Immediate | PASS |
