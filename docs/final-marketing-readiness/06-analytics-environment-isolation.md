# Analytics Environment Isolation

Implemented matrix:

| Environment | GTM/GA4 loading |
| --- | --- |
| Production | Loads GTM only when `NEXT_PUBLIC_SITE_ENV=production` and `NEXT_PUBLIC_GTM_ID` is present |
| Staging | Disabled by default |
| Preview | Disabled by default |
| Local development | Disabled for delivery; dev console logging may occur |
| Test | No real analytics delivery |

Changes:

- Runtime GTM loading uses environment variables, not CMS `global_settings.gtmId`.
- `NEXT_PUBLIC_GA4_MEASUREMENT_ID` was added to env validation and `.env.example`.
- Global settings form no longer exposes an editable GTM ID.
- Analytics events are deduped by `event_id` and strip known PII keys.

Production requirement:

- Configure production and staging/preview values separately in the hosting environment.
