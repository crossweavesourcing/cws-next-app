import { z } from 'zod';

const envSchema = z.object({
  MONGODB_URI: z.string().url(),
  // Note: we intentionally do NOT enforce a min length here (any string is
  // schema-valid). The >=16-char requirement for production is enforced in
  // validateSecurityConfig as a fail-closed boot guard with a clear message,
  // mirroring SESSION_SECRET. Dev stays warn-only so local boot works without it.
  ARGON2_SECRET: z.string().optional(),
  SESSION_SECRET: z.string().min(32),
  TOTP_ENCRYPTION_KEY: z.string().length(64).optional(),
  APP_URL: z.string().url(),

  // Public variables
  NEXT_PUBLIC_SITE_ENV: z.string().optional(),
  NEXT_PUBLIC_GTM_ID: z.string().optional(),
  NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION: z.string().optional(),
  NEXT_PUBLIC_BING_SITE_VERIFICATION: z.string().optional(),

  // Session / token lifetimes (milliseconds). Defaults applied when absent.
  ACCESS_SESSION_TTL_MS: z.coerce.number().int().positive().default(15 * 60 * 1000), // 15 min
  IDLE_TIMEOUT_MS: z.coerce.number().int().positive().default(30 * 60 * 1000), // 30 min
  REFRESH_TOKEN_TTL_MS: z.coerce.number().int().positive().default(7 * 24 * 60 * 60 * 1000), // 7 days

  // Mobile API token policy. Access tokens are short-lived EdDSA JWTs;
  // refresh tokens remain opaque and server-backed.
  MOBILE_ACCESS_TOKEN_TTL_MS: z.coerce.number().int().positive().default(15 * 60 * 1000),
  MOBILE_REFRESH_TOKEN_TTL_MS: z.coerce.number().int().positive().default(7 * 24 * 60 * 60 * 1000),
  MOBILE_JWT_KEY_ID: z.string().min(1).optional(),
  MOBILE_JWT_PRIVATE_KEY_B64: z.string().min(1).optional(),
  MOBILE_JWT_PUBLIC_KEYS_JSON: z.string().min(1).optional(),
  MOBILE_JWT_ISSUER: z.string().url().optional(),
  MOBILE_GOOGLE_CLIENT_IDS: z.string().optional().transform((value) =>
    value ? value.split(',').map((item) => item.trim()).filter(Boolean) : []
  ),
  MOBILE_ALLOWED_ORIGINS: z.string().optional().transform((value) =>
    value ? value.split(',').map((item) => item.trim()).filter(Boolean) : []
  ),

  // Google OAuth (Authorization Code + PKCE)
  GOOGLE_CLIENT_ID: z.string().min(1).optional(),
  GOOGLE_CLIENT_SECRET: z.string().min(1).optional(),
  GOOGLE_REDIRECT_URI: z.string().url().optional(),

  // Trusted-proxy IP header (optional). When set, getClientIp() prefers this
  // platform-supplied header (e.g. 'x-vercel-proxied-for') over client-supplied
  // x-forwarded-for for client IP resolution. Leave unset to use XFF (first hop).
  TRUSTED_PROXY_IP_HEADER: z.string().min(1).optional(),

  // Email delivery (Nodemailer + Gmail SMTP) — used for 2FA codes + password reset links.
  // Optional. When unset, emails are logged to the server console (dev) instead of sent.
  // EMAIL_PASSWORD must be a Gmail "App Password" (16 chars), not the account password.
  EMAIL_FROM: z.string().email().optional(),
  EMAIL_USER: z.string().min(1).optional(),
  EMAIL_PASSWORD: z.string().min(1).optional(),

  ADMIN_SEED_EMAIL: z.string().email().optional(),
  // dotenv represents `ADMIN_SEED_PASSWORD=` as an empty string. Treat that
  // as unset so local runtime auth can start without enabling user seeding.
  // Production still requires a non-empty value in validateSecurityConfig().
  ADMIN_SEED_PASSWORD: z.preprocess(
    (value) => value === '' ? undefined : value,
    z.string().min(12).optional()
  ),
  ADMIN_SEED_FIRST_NAME: z.string().min(1).optional(),
  ADMIN_SEED_LAST_NAME: z.string().min(1).optional(),
  ADMIN_SEED_EMPLOYEE_ID: z.string().min(1).optional(),
  ADMIN_SEED_DEPARTMENT: z.string().min(1).optional(),

  // Step-up MFA (Item 9). ON by default (opt-out, not opt-in): an internal app
  // with a small fixed set of seeded admin users tolerates a re-verify on a new
  // device or a resolvable country change. When true, a login from a NEW device
  // OR a COUNTRY CHANGE requires email 2FA before the session becomes usable.
  // Override to 'false' (or '0') only to deliberately relax step-up in an
  // emergency/debugging — `validateSecurityConfig` warns loudly when you do so
  // in production (it is a relaxation, never a silent default).
  STEP_UP_ENABLED: z
    .enum(['true', 'false', '1', '0'])
    .optional()
    .transform((v) => (v === undefined ? true : v === 'true' || v === '1')),

  // Optional geo-IP lookup endpoint. When set, `coarseLocation` queries this URL
  // (GET, with the IP as a `?ip=` query param or path segment — see geoip.ts) to
  // resolve country/region/city. If unset, an offline DB (geoip-lite) is tried,
  // and if that is unavailable too, the lookup fails open to null.
  GEOIP_LOOKUP_URL: z.string().url().optional(),

  // WebAuthn / passkey relying-party config. When omitted, the runtime derives
  // RP ID + origin from APP_URL. Explicit overrides are useful for subdomain
  // deployments where the RP ID should be the parent domain.
  WEBAUTHN_RP_ID: z.string().min(1).optional(),
  WEBAUTHN_ORIGIN: z.string().url().optional(),

  // Explicit, fail-closed cookie `secure` control (Item 14). When unset, the
  // `secure` flag defaults to the existing `NODE_ENV === 'production'` behavior
  // (so local dev over plain HTTP keeps working). In production this MUST be
  // the literal string `'true'`; `validateSecurityConfig` refuses to boot if it
  // is anything else. This prevents a misconfigured proxy / non-prod alias that
  // reports `NODE_ENV=production` from serving a cleartext auth cookie, or a
  // staging box from silently leaking cookies over HTTP.
  SECURE_COOKIES: z
    .enum(['true', 'false'])
    .optional()
    .transform((v) => v === 'true'),
});

export type EnvConfig = z.infer<typeof envSchema>;

let cachedEnv: EnvConfig | null = null;
let securityConfigValidated = false;

/**
 * FIX-05: Defense-in-depth check for the Argon2 pepper. When running in
 * production (or preview) without ARGON2_SECRET set, a DB leak of the password
 * hashes would expose them without the application-secret protection layer.
 * We warn loudly rather than failing dev, but in production this indicates a
 * misconfiguration that should be corrected in the secret store.
 */
function validateSecurityConfig(env: EnvConfig): void {
  if (securityConfigValidated) return;
  securityConfigValidated = true;

  const isProd = process.env.NODE_ENV === 'production';

  // FIX-C1: fail-closed guard for the session-signing secret. A weak / default /
  // example SESSION_SECRET lets an attacker forge the HMAC-signed cws_session,
  // cws_2fa_pending and cws_pw_pending cookies. Refuse to boot in production if
  // the value is missing, too short, or equal to a known default. Dev keeps
  // working with the committed .env.example placeholder.
  const DEFAULT_SESSION_SECRETS = new Set([
    'default_session_secret_must_be_thirty_two_characters_long',
    '34857aa209984d1b883753dbf3f82dd5ce9ee6065882c414f4883e6dc12a6489', // previously shipped static value
  ]);
  if (
    isProd &&
    (!env.SESSION_SECRET ||
      env.SESSION_SECRET.length < 32 ||
      DEFAULT_SESSION_SECRETS.has(env.SESSION_SECRET))
  ) {
    throw new Error(
      'FATAL: SESSION_SECRET is missing, too short (<32 chars), or equal to a known default. ' +
        'Generate a unique value per environment with: openssl rand -hex 32'
    );
  }

  // SECRETS-PRESENT PRE-FLIGHT (separate from the per-secret guards above).
  // Makes a misconfigured deploy FAIL CLOSED instead of booting with a missing
  // secret pulled from the manager. Asserts every required secret is non-empty
  // in production. We intentionally do NOT log any secret VALUE — only the
  // MISSING variable NAME — so the failure message never leaks a secret.
  //
  // GOOGLE_CLIENT_SECRET is only required when Google OAuth is enabled
  // (GOOGLE_CLIENT_ID configured). EMAIL_PASSWORD is only required when email
  // delivery is enabled (EMAIL_USER configured). The other five (MONGODB_URI,
  // SESSION_SECRET, ARGON2_SECRET, ADMIN_SEED_PASSWORD, TOTP_ENCRYPTION_KEY) are always required in
  // production. ADMIN_SEED_PASSWORD is required so db:seed can provision the
  // initial admin account; if you do not seed in prod you may relax this, but
  // keeping it required avoids a no-op seed silently deploying without an admin.
  if (isProd) {
    const missing: string[] = [];

    if (!env.MONGODB_URI?.trim()) missing.push('MONGODB_URI');
    if (!env.SESSION_SECRET?.trim()) missing.push('SESSION_SECRET');
    if (!env.ARGON2_SECRET?.trim()) missing.push('ARGON2_SECRET');
    if (!env.TOTP_ENCRYPTION_KEY?.trim()) missing.push('TOTP_ENCRYPTION_KEY');
    if (!env.ADMIN_SEED_PASSWORD?.trim()) missing.push('ADMIN_SEED_PASSWORD');

    // Google OAuth secret — only when OAuth is enabled (GOOGLE_CLIENT_ID set).
    if (env.GOOGLE_CLIENT_ID?.trim() && !env.GOOGLE_CLIENT_SECRET?.trim()) {
      missing.push('GOOGLE_CLIENT_SECRET');
    }

    // Email SMTP password — only when email delivery is enabled (EMAIL_USER set).
    if (env.EMAIL_USER?.trim() && !env.EMAIL_PASSWORD?.trim()) {
      missing.push('EMAIL_PASSWORD');
    }

    if (missing.length > 0) {
      throw new Error(
        'FATAL: the following required secret(s) are MISSING in production: ' +
          missing.join(', ') +
          '. Inject them via the secret manager (Vercel/Netlify project env, ' +
          'HashiCorp Vault, AWS Secrets Manager). The app refuses to boot with ' +
          'a missing secret rather than running insecurely. (No secret values ' +
          'are printed in this message.) Note: TOTP_ENCRYPTION_KEY must be generated ' +
          'with `openssl rand -hex 32`.'
      );
    }
  } else {
    // Dev-only: warn (do NOT fail) when the optional-by-feature secrets are
    // absent so local boot still works without them. Must remain a warning —
    // never throw outside production.
    const devMissing: string[] = [];
    if (!env.MONGODB_URI?.trim()) devMissing.push('MONGODB_URI');
    if (!env.TOTP_ENCRYPTION_KEY?.trim()) devMissing.push('TOTP_ENCRYPTION_KEY');
    if (env.GOOGLE_CLIENT_ID?.trim() && !env.GOOGLE_CLIENT_SECRET?.trim()) {
      devMissing.push('GOOGLE_CLIENT_SECRET');
    }
    if (env.EMAIL_USER?.trim() && !env.EMAIL_PASSWORD?.trim()) {
      devMissing.push('EMAIL_PASSWORD');
    }
    if (devMissing.length > 0) {
      console.warn(
        '⚠️  SECURITY: optional/required secrets absent in dev: ' +
          devMissing.join(', ') +
          '. Local boot continues; always inject these via the secret manager ' +
          'in production. (No secret values are printed.)'
      );
    }
  }

  // FIX-C1: fail-closed guard for the Argon2 application pepper. Mirrors the
  // SESSION_SECRET guard above. A missing / short (<16 char) pepper means password
  // hashes are stored WITHOUT the application-secret protection layer, so a stolen
  // DB is immediately crackable without the secret. Refuse to boot in production.
  // Dev keeps working (warn-only below) so local boot does not require the pepper.
  // NOTE: enabling the pepper AFTER users already exist requires re-hashing every
  // existing password, because old hashes were computed without it and will no
  // longer verify.
  if (isProd && (!env.ARGON2_SECRET || env.ARGON2_SECRET.length < 16)) {
    throw new Error(
      'FATAL: ARGON2_SECRET is missing or too short (<16 chars) in production. ' +
        'Password hashes would be stored WITHOUT the application pepper, exposing ' +
        'them in a DB leak. Set a unique >=16-char ARGON2_SECRET via the secret ' +
        'manager (e.g. Vercel/Netlify env, Vault, AWS Secrets Manager). ' +
        'NOTE: enabling the pepper after users exist requires re-hashing existing ' +
        'passwords (old hashes were computed without it and will fail verifyPassword).'
    );
  }

  // FIX-C2: fail-closed guard for the trusted-proxy IP header. Mirrors the
  // SESSION_SECRET / ARGON2_SECRET guards above. Without TRUSTED_PROXY_IP_HEADER
  // in production, getClientIp() cannot resolve a trustworthy client IP and
  // returns the '0.0.0.0' sentinel for ALL traffic. Keying the per-IP rate limit
  // on that constant collapses every request into ONE global bucket, so ~20
  // cross-user login failures in 15 min lock out every login platform-wide
  // (availability DoS). Refuse to boot in production until it is configured.
  // The edge/CDN MUST also strip inbound x-forwarded-for before appending its own
  // hop, otherwise the header remains spoofable. Dev keeps working (warn-only
  // below) so local boot does not require a proxy.
  if (isProd && !env.TRUSTED_PROXY_IP_HEADER?.trim()) {
    throw new Error(
      'FATAL: TRUSTED_PROXY_IP_HEADER is not set in production. Client IP would ' +
        'resolve to the untrusted 0.0.0.0 sentinel for all traffic, collapsing the ' +
        'per-IP login rate limit into a single global bucket (platform-wide lockout ' +
        'DoS). Set TRUSTED_PROXY_IP_HEADER to your platform’s trusted header (e.g. ' +
        "'x-vercel-proxied-for') and configure the edge to STRIP inbound " +
        'x-forwarded-for before appending its own hop.'
    );
  }

  // Dev-only: warn (do NOT fail) when the trusted-proxy header is absent so local
  // boot still works. This must remain a warning — never throw outside production.
  if (!isProd && !env.TRUSTED_PROXY_IP_HEADER?.trim()) {
    console.warn(
      '⚠️  SECURITY: TRUSTED_PROXY_IP_HEADER is not set. Client IP resolution ' +
        'falls back to x-forwarded-for (dev only). Always set it in production ' +
        'and strip inbound x-forwarded-for at the edge.'
    );
  }

  // Dev-only: warn (do NOT fail) when the pepper is absent so local boot still
  // works. This must remain a warning — never throw outside production.
  if (!isProd && !env.ARGON2_SECRET) {
    console.warn(
      '⚠️  SECURITY: ARGON2_SECRET is not set. Password hashes will be stored ' +
        'WITHOUT the application pepper. This is acceptable for local dev only — ' +
        'always set a >=16-char ARGON2_SECRET in production via the secret manager.'
    );
  }

  // FIX-14: fail-closed guard for the explicit cookie `secure` control. Mirrors
  // the SESSION_SECRET / ARGON2_SECRET guards above. In production the auth
  // cookies MUST be marked `secure` (HTTPS-only) — set SECURE_COOKIES='true'.
  // Refuse to boot if it is unset or explicitly 'false', because:
  //   - an unset value only defaults to `NODE_ENV === 'production'`, which a
  //     misconfigured proxy or a non-prod alias reporting NODE_ENV=production
  //     would make true-but-transported-over-cleartext;
  //   - an explicit 'false' in prod means auth cookies would leak over plain
  //     HTTP. Either way we fail closed rather than ship insecure cookies.
  // Dev (and unset prod-that-truly-means-dev) keeps working: the helper
  // `isSecureCookies()` falls back to `NODE_ENV === 'production'` when unset.
  if (isProd && env.SECURE_COOKIES !== true) {
    throw new Error(
      'FATAL: SECURE_COOKIES is not set to "true" in production. Auth cookies ' +
        'would be served without the Secure flag, leaking over plain HTTP. Set ' +
        'SECURE_COOKIES=true in the production environment (and ensure APP_URL is ' +
        'https:// with HSTS at the edge). Refusing to boot insecurely.'
    );
  }

  // Dev-only: warn (do NOT fail) when SECURE_COOKIES is unset so local boot
  // still works over HTTP. This must remain a warning — never throw outside
  // production.
  if (!isProd && env.SECURE_COOKIES === undefined) {
    console.warn(
      '⚠️  SECURITY: SECURE_COOKIES is not set. Cookies will use the ' +
        '`NODE_ENV === "production"` fallback (false in dev, so they work over ' +
        'HTTP). Always set SECURE_COOKIES=true in production via the secret manager.'
    );
  }

  // STEP-UP (Item 9) production stance: ON by default. A deliberate relaxation
  // (STEP_UP_ENABLED explicitly 'false') is permitted in production for
  // emergencies/debugging, but it is NOT silent — we warn loudly so the
  // relaxation is visible in logs (it is a relaxation, never a default). When
  // the flag is left unset it defaults to true, so this branch only fires on an
  // explicit opt-out.
  if (isProd && env.STEP_UP_ENABLED === false) {
    console.warn(
      '⚠️  SECURITY: STEP_UP_ENABLED is explicitly false in production. Step-up ' +
        'MFA (email 2FA on new device / resolvable country change) is DISABLED — ' +
        'a new device or unknown location will NOT be challenged. This is a ' +
        'deliberate relaxation; re-enable (unset or set to true) as soon as the ' +
        'emergency passes. Normal logins continue.'
    );
  }

  // Geo-IP / step-up interaction guard: step-up is ON, but no geo source is
  // configured. Because geo lookup is fail-open (null on any miss), the
  // country-change branch of step-up can never fire — only NEW-DEVICE step-up
  // will. This is safe (no false positives) but the operator should know
  // country-change protection is effectively inert until GEOIP_LOOKUP_URL is
  // configured. Warn; do NOT throw (it is still a strict improvement over
  // alert-only, and we must not block boot on a non-secret optional var).
  if (isProd && env.STEP_UP_ENABLED === true && !env.GEOIP_LOOKUP_URL?.trim()) {
    console.warn(
      '⚠️  SECURITY: STEP_UP_ENABLED is on but GEOIP_LOOKUP_URL is not set. Geo ' +
        'resolution is fail-open (null on miss), so the country-change branch of ' +
        'step-up MFA will NOT trigger — only NEW-DEVICE logins will be challenged. ' +
        'Configure GEOIP_LOOKUP_URL in production to enable country-change step-up.'
    );
  }

  const webAuthn = deriveWebAuthnConfig(env);
  const webAuthnOriginUrl = new URL(webAuthn.origin);
  const webAuthnHost = webAuthnOriginUrl.hostname;
  const rpMatchesOrigin =
    webAuthnHost === webAuthn.rpID || webAuthnHost.endsWith(`.${webAuthn.rpID}`);

  if (isProd && webAuthnOriginUrl.protocol !== 'https:') {
    throw new Error(
      'FATAL: WebAuthn origin must use HTTPS in production. Set APP_URL or ' +
        'WEBAUTHN_ORIGIN to the public https:// origin.'
    );
  }
  if (!rpMatchesOrigin) {
    throw new Error(
      'FATAL: WebAuthn RP ID must match the WebAuthn origin host or a parent domain. ' +
        `RP ID "${webAuthn.rpID}" is not valid for origin "${webAuthn.origin}".`
    );
  }
}

function deriveWebAuthnConfig(env: EnvConfig): { rpID: string; origin: string } {
  const appUrl = new URL(env.APP_URL);
  const configuredOrigin = env.WEBAUTHN_ORIGIN
    ? new URL(env.WEBAUTHN_ORIGIN)
    : appUrl;
  const rpID = (env.WEBAUTHN_RP_ID ?? appUrl.hostname).trim().toLowerCase();

  if (
    configuredOrigin.username ||
    configuredOrigin.password ||
    configuredOrigin.pathname !== '/' ||
    configuredOrigin.search ||
    configuredOrigin.hash
  ) {
    throw new Error(
      'FATAL: WEBAUTHN_ORIGIN must be an origin only (scheme, host, and optional port), without credentials, path, query, or fragment.'
    );
  }
  if (
    !rpID ||
    rpID.includes('://') ||
    rpID.includes('/') ||
    rpID.includes(':') ||
    rpID.startsWith('.') ||
    rpID.endsWith('.') ||
    rpID.includes('..')
  ) {
    throw new Error('FATAL: WEBAUTHN_RP_ID must be a hostname without a scheme, port, or path.');
  }

  return { rpID, origin: configuredOrigin.origin };
}

export function getWebAuthnConfig(): { rpName: string; rpID: string; origin: string } {
  const env = getEnv();
  const webAuthn = deriveWebAuthnConfig(env);
  return {
    rpName: 'CWS Next App',
    ...webAuthn,
  };
}

export function getMobileAuthConfig(): {
  keyId: string;
  privateKeyB64: string;
  publicKeys: Record<string, string>;
  issuer: string;
  googleClientIds: string[];
  allowedOrigins: string[];
  accessTokenTtlMs: number;
  refreshTokenTtlMs: number;
} {
  const env = getEnv();
  if (!env.MOBILE_JWT_KEY_ID || !env.MOBILE_JWT_PRIVATE_KEY_B64 || !env.MOBILE_JWT_PUBLIC_KEYS_JSON) {
    throw new Error('Mobile authentication is not configured.');
  }
  let publicKeys: Record<string, string>;
  try {
    publicKeys = JSON.parse(env.MOBILE_JWT_PUBLIC_KEYS_JSON) as Record<string, string>;
  } catch {
    throw new Error('Mobile JWT public key configuration is invalid.');
  }
  if (!publicKeys[env.MOBILE_JWT_KEY_ID]) {
    throw new Error('Mobile JWT active key is not present in the public key set.');
  }
  return {
    keyId: env.MOBILE_JWT_KEY_ID,
    privateKeyB64: env.MOBILE_JWT_PRIVATE_KEY_B64,
    publicKeys,
    issuer: env.MOBILE_JWT_ISSUER ?? `${env.APP_URL}/api/mobile/v1`,
    googleClientIds: env.MOBILE_GOOGLE_CLIENT_IDS,
    allowedOrigins: env.MOBILE_ALLOWED_ORIGINS,
    accessTokenTtlMs: env.MOBILE_ACCESS_TOKEN_TTL_MS,
    refreshTokenTtlMs: env.MOBILE_REFRESH_TOKEN_TTL_MS,
  };
}

export function getEnv(): EnvConfig {
  if (cachedEnv) return cachedEnv;

  const parsed = envSchema.safeParse(process.env);
  
  if (!parsed.success) {
    console.error('❌ Invalid environment variables:', parsed.error.format());
    throw new Error('Invalid environment variables');
  }

  cachedEnv = parsed.data;
  validateSecurityConfig(cachedEnv);
  return cachedEnv;
}

export function __clearEnvCacheForTests(): void {
  cachedEnv = null;
  securityConfigValidated = false;
}
