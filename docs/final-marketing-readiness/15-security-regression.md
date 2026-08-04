# Security Regression

Implemented:

- Canonical and redirect validation rejects unsafe protocols and private/internal paths.
- Admin category mutations now use CSRF guard wrappers.
- Analytics IDs are environment-controlled for runtime loading.
- Analytics PII stripping expanded.
- Redirects are internal-only for launch.
- No raw robots, sitemap, JSON-LD, CSP, script, or environment controls were exposed.

Validation:

- `pnpm test:unit` passed.
- `pnpm lint` passed with warnings.
- `pnpm build` security scan passed with 0 critical/high findings.

Remaining:

- Production GeoIP configuration is unverified.
- Production CSP/analytics behavior should be checked after deployment.
