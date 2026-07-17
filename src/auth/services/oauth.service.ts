import * as crypto from 'crypto';
import { ObjectId } from 'mongodb';
import { OAuthAccountRepository } from '../repositories/oauth-account.repository';
import { UserRepository } from '../repositories/user.repository';
import { SessionService } from './session.service';
import { PasswordService } from './password.service';
import { AuditLogRepository } from '../repositories/audit-log.repository';
import { AlertingService } from './alerting.service';
import { getEnv } from '../config/env';
import { ensureDeviceId, setServerDeviceToken } from '../lib/device';

const GOOGLE_AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';
const GOOGLE_JWKS_URL = 'https://www.googleapis.com/oauth2/v3/certs';

export interface GoogleProfile {
  sub: string;
  email: string | null;
  email_verified: boolean;
}

export interface OAuthStartResult {
  authorizationUrl: string;
  state: string;
  codeVerifier: string;
  nonce: string;
}

/**
 * Implements Google "Authorization Code + PKCE" login with CSRF `state`,
 * `nonce` replay protection, and account linking to existing internal users.
 *
 * No public registration: an OAuth identity is only accepted if it already
 * maps to a provisioned account (by provider sub, or by verified email).
 */
export class OAuthService {
  private oauthRepo = new OAuthAccountRepository();
  private userRepo = new UserRepository();
  private sessionService = new SessionService();
  private auditRepo = new AuditLogRepository();
  private alertingService = new AlertingService();

  /**
   * Builds the Google authorization URL and returns the PKCE/state/nonce secrets
   * the caller must persist in a short-lived, httpOnly cookie.
   */
  buildAuthorizationUrl(): OAuthStartResult {
    const env = getEnv();
    if (!env.GOOGLE_CLIENT_ID || !env.GOOGLE_REDIRECT_URI) {
      throw new Error('Google OAuth is not configured (GOOGLE_CLIENT_ID / GOOGLE_REDIRECT_URI).');
    }

    const state = crypto.randomBytes(32).toString('hex');
    const codeVerifier = crypto.randomBytes(48).toString('hex');
    const nonce = crypto.randomBytes(24).toString('hex');

    const codeChallenge = crypto
      .createHash('sha256')
      .update(codeVerifier)
      .digest('base64url');

    const params = new URLSearchParams({
      client_id: env.GOOGLE_CLIENT_ID,
      redirect_uri: env.GOOGLE_REDIRECT_URI,
      response_type: 'code',
      scope: 'openid email profile',
      state,
      nonce,
      code_challenge: codeChallenge,
      code_challenge_method: 'S256',
      prompt: 'select_account',
    });

    return {
      authorizationUrl: `${GOOGLE_AUTH_URL}?${params.toString()}`,
      state,
      codeVerifier,
      nonce,
    };
  }

  /**
   * Exchanges the authorization code, verifies the id_token, links/looks up the
   * user, and creates a session + refresh token. Throws on any validation failure.
   */
  /**
   * Result of completing the OAuth callback.
   * - `authenticated`: a session was created; the caller issues the cookies.
   * - `mfa_required`: the account has MFA enabled; set `cws_2fa_pending` and
   *   redirect to `/dashboard/verify-2fa` to complete login (parity with the
   *   password flow — FIX-03).
   * - `force_change`: the password is expired/forced-change; set `cws_pw_pending`
   *   and redirect to `/dashboard/change-password` (parity with FIX-02).
   */
  private passwordService = new PasswordService();

  async handleCallback(
    code: string,
    state: string,
    expectedState: string,
    codeVerifier: string,
    expectedNonce: string,
    ipAddress: string,
    userAgent: string | null
  ): Promise<
    | { status: 'authenticated'; sessionCookie: string; refreshToken: string }
    | { status: 'mfa_required'; userId: ObjectId }
    | { status: 'force_change'; userId: ObjectId }
    | { status: 'step_up'; userId: ObjectId }
  > {
    try {
      return await this.handleCallbackInternal(
        code,
        state,
        expectedState,
        codeVerifier,
        expectedNonce,
        ipAddress,
        userAgent
      );
    } catch (err) {
      // Best-effort: surface OAuth failures to the security sink (watched,
      // not just thrown) then rethrow so the route still returns an error.
      await this.alertingService
        .alertOauthFailed({
          provider: 'google',
          userId: null,
          ipAddress,
          reason: err instanceof Error ? err.message : String(err),
        })
        .catch((alertErr) =>
          console.error('oauth-failed alert failed:', alertErr)
        );
      throw err;
    }
  }

  private async handleCallbackInternal(
    code: string,
    state: string,
    expectedState: string,
    codeVerifier: string,
    expectedNonce: string,
    ipAddress: string,
    userAgent: string | null
  ): Promise<
    | { status: 'authenticated'; sessionCookie: string; refreshToken: string }
    | { status: 'mfa_required'; userId: ObjectId }
    | { status: 'force_change'; userId: ObjectId }
    | { status: 'step_up'; userId: ObjectId }
  > {
    const env = getEnv();
    if (!env.GOOGLE_CLIENT_ID || !env.GOOGLE_CLIENT_SECRET || !env.GOOGLE_REDIRECT_URI) {
      throw new Error('Google OAuth is not configured.');
    }
    // CSRF protection: state must match the value issued at start.
    if (!state || !expectedState || state !== expectedState) {
      throw new Error('OAuth state mismatch (possible CSRF).');
    }

    const tokenSet = await this.exchangeCode(code, codeVerifier, env);
    const profile = await this.verifyIdToken(tokenSet.id_token, env, expectedNonce);

    // Resolve the internal user.
    // FIX-C3: explicit, pre-provisioned linking ONLY. For a fixed internal-user
    // app (no public registration) we must NOT auto-link by verified email —
    // that lets anyone controlling a Google identity asserting a matching
    // verified email link to / authenticate as a provisioned internal user,
    // bypassing password/MFA discipline (account takeover). An admin/user must
    // explicitly connect Google from an authenticated, password+MFA-gated
    // session (later workstream) to create the oauth_accounts row.
    const oauthAccount = await this.oauthRepo.findByProvider('google', profile.sub);
    if (!oauthAccount) {
      // No pre-provisioned link exists. Do NOT log in and do NOT create a row.
      throw new Error('Google sign-in is not enabled for this account. Contact an administrator.');
    }
    const userId = oauthAccount.userId;

    // Enforce account lifecycle status.
    const user = await this.userRepo.findById(userId);
    if (!user || user.status !== 'active') {
      throw new Error('This account is not active. Please contact an administrator.');
    }

    await this.oauthRepo.touchLastUsed(profile.sub, 'google');

    // NOTE: the `auth.oauth.linked` event is intentionally NOT emitted here.
    // That event belongs to the explicit, password+MFA-gated connect flow (a
    // later workstream), not to login-time linking — and login-time auto-linking
    // was removed (FIX-C3) to prevent account takeover via verified-email match.

    // FIX-03: OAuth must enforce the same post-auth steps as password login.
    // MFA-enabled and force-password-change accounts are gated here instead of
    // being silently fully authenticated via Google.
    if (user.security?.mfaEnabled) {
      return { status: 'mfa_required', userId };
    }
    if (user.security?.forcePasswordChange || (await this.passwordService.isExpired(userId))) {
      // Keep the flag set so the force-change flow behaves identically to login.
      await this.userRepo.forcePasswordChange(userId);
      return { status: 'force_change', userId };
    }

    const device = await ensureDeviceId();
    const result = await this.sessionService.createSession(
      userId,
      ipAddress,
      userAgent,
      'google',
      device
    );

    // Step-up path (Item 9): session created but revoked pending email 2FA.
    // Return `step_up` so the route sets `cws_stepup_pending` + redirects.
    if (result.status === 'step_up') {
      return { status: 'step_up', userId };
    }

    const { sessionId, sessionCookie, refreshToken, deviceObjectId } = result;

    // Persist the server-issued device record id on the client (see login flow).
    if (deviceObjectId) {
      await setServerDeviceToken(deviceObjectId);
    }

    await this.auditRepo.log({
      userId,
      sessionId: new ObjectId(sessionId),
      action: 'auth.login.success',
      status: 'SUCCESS',
      errorCode: null,
      actor: { type: 'user', id: userId },
      source: { platform: 'web', appVersion: '0.1.0' },
      correlationId: null,
      requestId: null,
      resource: { type: 'session', id: sessionId },
      metadata: { loginMethod: 'google' },
      ipAddress,
      userAgent,
    });

    return { status: 'authenticated', sessionCookie, refreshToken };
  }

  private async exchangeCode(
    code: string,
    codeVerifier: string,
    env: ReturnType<typeof getEnv>
  ): Promise<{ id_token: string }> {
    const body = new URLSearchParams({
      code,
      code_verifier: codeVerifier,
      client_id: env.GOOGLE_CLIENT_ID as string,
      client_secret: env.GOOGLE_CLIENT_SECRET as string,
      redirect_uri: env.GOOGLE_REDIRECT_URI as string,
      grant_type: 'authorization_code',
    });

    const res = await fetch(GOOGLE_TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body.toString(),
    });
    if (!res.ok) {
      throw new Error(`Google token exchange failed: ${res.status}`);
    }
    const json = (await res.json()) as { id_token?: string };
    if (!json.id_token) {
      throw new Error('Google token response missing id_token.');
    }
    return json as { id_token: string };
  }

  /**
   * Verifies the Google-issued OIDC id_token (signature via JWKS, standard claims).
   * Returns the verified profile. Throws on any invalid claim or signature.
   */
  private async verifyIdToken(
    idToken: string,
    env: ReturnType<typeof getEnv>,
    expectedNonce: string
  ): Promise<GoogleProfile> {
    const parts = idToken.split('.');
    if (parts.length !== 3) {
      throw new Error('Malformed id_token.');
    }
    const [headerB64, payloadB64, signatureB64] = parts;

    const jwks = await (await fetch(GOOGLE_JWKS_URL)).json() as {
      keys: Array<{ kid: string; n: string; e: string }>;
    };
    const header = JSON.parse(Buffer.from(headerB64, 'base64url').toString('utf8')) as { kid?: string };
    const jwk = jwks.keys.find((k) => k.kid === header.kid);
    if (!jwk) {
      throw new Error('No matching JWK for id_token.');
    }

    const key = crypto.createPublicKey({
      key: { kty: 'RSA', n: jwk.n, e: jwk.e },
      format: 'jwk',
    });

    const signature = Buffer.from(signatureB64, 'base64url');
    const data = Buffer.from(`${headerB64}.${payloadB64}`, 'utf8');
    const valid = crypto.verify('RSA-SHA256', data, key, signature);
    if (!valid) {
      throw new Error('id_token signature verification failed.');
    }

    const claims = JSON.parse(Buffer.from(payloadB64, 'base64url').toString('utf8')) as Record<string, unknown>;
    const now = Math.floor(Date.now() / 1000);

    if (typeof claims.iss !== 'string' || !claims.iss.includes('accounts.google.com')) {
      throw new Error('Invalid id_token iss.');
    }
    if (claims.aud !== env.GOOGLE_CLIENT_ID) {
      throw new Error('Invalid id_token aud.');
    }
    if (typeof claims.exp === 'number' && claims.exp < now) {
      throw new Error('id_token expired.');
    }
    if (claims.nonce !== expectedNonce) {
      throw new Error('id_token nonce mismatch (replay protection).');
    }

    return {
      sub: claims.sub as string,
      email: (claims.email as string | undefined) ?? null,
      email_verified: Boolean(claims.email_verified),
    };
  }
}
