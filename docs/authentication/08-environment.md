# Environment Variables

The authentication system requires a specific set of environment variables to operate securely. These are strictly validated at boot time in `src/auth/config/env.ts`.

## Required Production Variables

If any of these are missing or misconfigured in a production environment (`NODE_ENV=production`), the application will immediately throw a fatal error and refuse to boot.

| Variable | Description | Security Guard |
| :--- | :--- | :--- |
| `MONGODB_URI` | Connection string for the MongoDB cluster. | Must be a valid URL. |
| `SESSION_SECRET` | Cryptographic secret used to sign the `cws_session` cookie. | Must be exactly or greater than 32 characters. Must not match known defaults. |
| `ARGON2_SECRET` | The application-wide pepper combined with passwords before hashing. | Must be exactly or greater than 16 characters. |
| `SECURE_COOKIES` | Enforces HTTPS-only cookies. | MUST be explicitly set to the string `'true'`. |
| `TRUSTED_PROXY_IP_HEADER` | The header provided by the deployment platform containing the real client IP (e.g., `x-vercel-proxied-for`). | Must be non-empty. Prevents rate-limit bucket collapse. |
| `ADMIN_SEED_PASSWORD` | The password used to provision the initial admin user during database seeding. | Must be provided to prevent deploying a system without access. |

## Optional Variables (Feature Flags)

| Variable | Description | Default / Fallback |
| :--- | :--- | :--- |
| `GOOGLE_CLIENT_ID` | Enables Google OAuth login. | If set, `GOOGLE_CLIENT_SECRET` becomes required. |
| `GOOGLE_CLIENT_SECRET` | Secret for Google OAuth token exchange. | Required only if Client ID is set. |
| `EMAIL_USER` | SMTP username (usually Gmail) for sending 2FA codes. | If set, `EMAIL_PASSWORD` becomes required. |
| `EMAIL_PASSWORD` | App Password for the SMTP user. | Required only if Email User is set. |
| `STEP_UP_ENABLED` | Toggles Step-Up MFA for new devices and locations. | `'true'` (ON by default). Can be set to `'false'` for emergency debugging. |
| `GEOIP_LOOKUP_URL` | Endpoint for resolving IPs to countries for Step-Up MFA. | If unset, falls back to offline db or null (fail-open). |

## Development Behavior
In local development (`NODE_ENV=development`), the system relaxes some of the fail-closed requirements so developers can boot the app easily. Missing secrets like `SESSION_SECRET` or `ARGON2_SECRET` will emit a loud `⚠️ SECURITY` warning in the console instead of crashing the server.
