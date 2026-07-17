import { z } from 'zod';

const envSchema = z.object({
  MONGODB_URI: z.string().url(),
  // Note: we intentionally do NOT enforce a min length here (any string is
  // schema-valid). The >=16-char requirement for production is enforced in
  // validateSecurityConfig as a fail-closed boot guard with a clear message,
  // mirroring SESSION_SECRET. Dev stays warn-only so local boot works without it.
  ARGON2_SECRET: z.string().optional(),
  SESSION_SECRET: z.string().min(32),
  APP_URL: z.string().url(),

  // Session / token lifetimes (milliseconds). Defaults applied when absent.
  ACCESS_SESSION_TTL_MS: z.coerce.number().int().positive().default(15 * 60 * 1000), // 15 min
  IDLE_TIMEOUT_MS: z.coerce.number().int().positive().default(30 * 60 * 1000), // 30 min
  REFRESH_TOKEN_TTL_MS: z.coerce.number().int().positive().default(7 * 24 * 60 * 60 * 1000), // 7 days

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
  ADMIN_SEED_PASSWORD: z.string().min(12).optional(),
  ADMIN_SEED_FIRST_NAME: z.string().min(1).optional(),
  ADMIN_SEED_LAST_NAME: z.string().min(1).optional(),
  ADMIN_SEED_EMPLOYEE_ID: z.string().min(1).optional(),
  ADMIN_SEED_DEPARTMENT: z.string().min(1).optional(),

  // Step-up MFA (Item 9). OFF by default so the alert-only behavior is preserved
  // until geo-IP monitoring is trusted. When true, a login from a new device OR a
  // country change requires email 2FA before the session becomes usable.
  STEP_UP_ENABLED: z
    .string()
    .optional()
    .transform((v) => v === 'true' || v === '1'),

  // Optional geo-IP lookup endpoint. When set, `coarseLocation` queries this URL
  // (GET, with the IP as a `?ip=` query param or path segment — see geoip.ts) to
  // resolve country/region/city. If unset, an offline DB (geoip-lite) is tried,
  // and if that is unavailable too, the lookup fails open to null.
  GEOIP_LOOKUP_URL: z.string().url().optional(),
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
  // delivery is enabled (EMAIL_USER configured). The other four (MONGODB_URI,
  // SESSION_SECRET, ARGON2_SECRET, ADMIN_SEED_PASSWORD) are always required in
  // production. ADMIN_SEED_PASSWORD is required so db:seed can provision the
  // initial admin account; if you do not seed in prod you may relax this, but
  // keeping it required avoids a no-op seed silently deploying without an admin.
  if (isProd) {
    const missing: string[] = [];

    if (!env.MONGODB_URI?.trim()) missing.push('MONGODB_URI');
    if (!env.SESSION_SECRET?.trim()) missing.push('SESSION_SECRET');
    if (!env.ARGON2_SECRET?.trim()) missing.push('ARGON2_SECRET');
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
          'are printed in this message.)'
      );
    }
  } else {
    // Dev-only: warn (do NOT fail) when the optional-by-feature secrets are
    // absent so local boot still works without them. Must remain a warning —
    // never throw outside production.
    const devMissing: string[] = [];
    if (!env.MONGODB_URI?.trim()) devMissing.push('MONGODB_URI');
    if (!env.ARGON2_SECRET?.trim()) devMissing.push('ARGON2_SECRET');
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
