# Developer-Only Controls

The following controls must NOT be exposed to the dashboard due to security, performance, or stability risks:

* **next.config.ts Settings**: Headers, rewrites, and output modes.
* **Content Security Policy (CSP)**: Must remain in `next.config.ts` and `src/proxy.ts`. Modifying via DB risks XSS.
* **Environment Secrets**: Database URIs, JWT secrets, OAuth client secrets.
* **Cache Revalidation Rules**: The ISR strategy (e.g., `revalidate = 3600`) must be code-controlled.
* **Raw JSON-LD / HTML Injection**: Exposing raw script injection invites XSS and malformed document structures.
* **Robots.txt generator**: Disallow rules for `/api` and `/dashboard` must be hardcoded.
* **Preview/Staging Protection**: The logic that injects `X-Robots-Tag: noindex` in non-production environments must remain in `next.config.ts`.
