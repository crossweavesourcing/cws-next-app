# Redirect Manager

Implemented:

- Redirect UI remains integrated in `/dashboard/seo`.
- Launch policy is internal-only redirects.
- Supported status codes are 301 and 302.
- Fields include source, destination, status, active state, reason, notes, start date, and end date.
- Source/destination normalization rejects private/API/dashboard/auth/preview/framework paths, malformed paths, external URLs, unsafe protocols, self-loops, chains, and loops.
- Redirect list refreshes after create/update/delete through `router.refresh()`.
- Runtime catch-all checks active redirects for missing public routes.
- Active redirects respect start/end windows.
- Product, category, and catalog slug changes attempt automatic 301 redirect creation.

Important note:

- Next page-level `permanentRedirect()` emits framework-controlled permanent redirects. Exact 301/302 header verification should be completed in a deployed runtime test.
