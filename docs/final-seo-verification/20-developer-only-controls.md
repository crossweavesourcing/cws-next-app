# Developer-Only Controls Report

## Scope & Objective
Audit developer-only parameters to ensure they remain protected from the admin dashboard and cannot be mutated by end users.

## Protected Developer Parameters

| Parameter / System Control | Location / Definition | Dashboard Exposure | Security Status |
| :--- | :--- | :---: | :---: |
| **`APP_URL` / Base Origin** | Environment variable `NEXT_PUBLIC_APP_URL` | **Hidden** | `DEVELOPER_CONTROLLED_VERIFIED` |
| **CSP & Security Headers** | `src/proxy.ts` middleware | **Hidden** | `DEVELOPER_CONTROLLED_VERIFIED` |
| **Database Connection Strings** | `MONGODB_URI` environment variable | **Hidden** | `DEVELOPER_CONTROLLED_VERIFIED` |
| **Session Secrets / JWT Keys** | Environment variables | **Hidden** | `DEVELOPER_CONTROLLED_VERIFIED` |
| **Robots / Sitemap Logic** | `src/app/robots.ts` & `src/app/sitemap.ts` | **Hidden** | `DEVELOPER_CONTROLLED_VERIFIED` |

## Conclusion
Developer-only controls are strictly isolated and protected from non-developer UI forms.
