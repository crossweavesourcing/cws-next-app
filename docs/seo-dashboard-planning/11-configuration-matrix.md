# Configuration Matrix

| ID | Module | Parameter | Description | Current | Recommended Control | Type | Auto-Output | Risk | Priority |
|---|---|---|---|---|---|---|---|---|---|
| GLOBAL-01 | Identity | Brand Name | Base for titles | Hardcoded | Admin | String | Title templates | Low | P0 |
| PROD-01 | Product | SEO Title | Override default | Exists | Editor | String | `<title>` | Low | P0 |
| PROD-02 | Product | SEO Desc | Override default | Exists | Editor | String | `<meta name="description">` | Low | P0 |
| PROD-03 | Product | Noindex | Hide from search | Exists | Admin | Boolean | `robots` | Med | P0 |
| IMG-01 | Media | Alt Text | Accessibility/SEO | Exists | Editor | String | `alt=""` | Low | P0 |
