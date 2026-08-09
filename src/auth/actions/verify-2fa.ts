'use server';

import { cookies, headers } from 'next/headers';
import { ObjectId } from 'mongodb';
import { TwoFactorService } from '../services/two-factor.service';
import { SessionService } from '../services/session.service';
import { UserRepository } from '../repositories/user.repository';
import { LoginAttemptRepository } from '../repositories/login-attempt.repository';
import { PendingAuthenticationRepository } from '../repositories/pending-authentication.repository';
import * as crypto from 'crypto';
import { getClientIp } from '../lib/request';
import { ensureDeviceId, setServerDeviceToken } from '../lib/device';
import { setAuthCookies, clearingCookieOpts } from '../lib/cookies';
import { withCsrfGuard } from '../lib/csrf';

export type Verify2FAState = {
  error?: string;
  success?: boolean;
  showTrustPrompt?: boolean;
  pendingDeviceId?: string;
};

const TWO_FA_PENDING_COOKIE = 'cws_2fa_pending';

// ─── Rate-limit windows (MongoDB-backed, no in-memory state). ──────────────────

// Resend throttle: at most 1 resend per 30s AND at most 5 per 10min per user.
const RESEND_MIN_INTERVAL_MS = 30 * 1000;
const RESEND_MAX_PER_WINDOW = 5;
const RESEND_WINDOW_MS = 10 * 60 * 1000;



function twoFactorResendIdentifier(userId: ObjectId): string {
  return `2fa_resend:${userId.toHexString()}`;
}

/**
 * Server Action: verifies the email 2FA code and, on success, issues the real
 * session + refresh cookies (completing the login).
 *
 * C1: wrapped with `withCsrfGuard`; the pending cookies are cleared Strict
 * (matching how they were issued in login.ts).
 */
async function verify2faActionImpl(
  _prev: Verify2FAState,
  formData: FormData
): Promise<Verify2FAState> {
  const cookieStore = await cookies();
  const pending = cookieStore.get(TWO_FA_PENDING_COOKIE);
  if (!pending?.value) {
    return { error: 'Your verification session expired. Please sign in again.' };
  }

  const tokenHash = crypto.createHash('sha256').update(pending.value).digest('hex');
  const pendingRepo = new PendingAuthenticationRepository();
  const pendingAuth = await pendingRepo.findByTokenHash(tokenHash);

  if (!pendingAuth || pendingAuth.consumedAt || pendingAuth.expiresAt.getTime() < Date.now()) {
    cookieStore.set(TWO_FA_PENDING_COOKIE, '', clearingCookieOpts('strict', '/'));
    return { error: 'Your verification session is invalid or has expired. Please sign in again.' };
  }

  const userId = pendingAuth.userId;

  if (pendingAuth.attemptsRemaining <= 0) {
    cookieStore.set(TWO_FA_PENDING_COOKIE, '', clearingCookieOpts('strict', '/'));
    return { error: 'Too many attempts. Please sign in again.' };
  }

  const ip = await getClientIp();
  const ua = (await headers()).get('user-agent') || null;

  const code = formData.get('code');
  if (typeof code !== 'string' || code.trim().length < 4) {
    return { error: 'Please enter the 6-digit code sent to your email.' };
  }

  const twoFactor = new TwoFactorService();
  const ok = await twoFactor.verify(userId, code.trim());

  if (!ok) {
    const attemptsLeft = await pendingRepo.decrementAttempts(pendingAuth._id);
    if (attemptsLeft <= 0) {
      cookieStore.set(TWO_FA_PENDING_COOKIE, '', clearingCookieOpts('strict', '/'));
      return { error: 'Too many attempts. Please sign in again.' };
    }
    return { error: 'Invalid or expired code. Request a new code and try again.' };
  }

  await pendingRepo.consume(pendingAuth._id);

  // Issue the real session now that 2FA passed.
  const userRepo = new UserRepository();
  const user = await userRepo.findById(userId);
  if (!user) return { error: 'Account not found.' };

  const device = await ensureDeviceId();
  const sessionService = new SessionService();
  const created = await sessionService.createSession(
    userId,
    ip,
    ua,
    pendingAuth.primaryAuthenticationMethod,
    device
  );
  // createSession returns `step_up` only when step-up is required — but we are
  // already on the verified-2FA path, so the fresh session is always `authenticated`.
  if (created.status !== 'authenticated') {
    return { error: 'Unable to complete sign-in. Please try again.' };
  }
  const { sessionCookie, refreshToken, deviceObjectId } = created;

  // Persist the server-issued device record id on the client (see login flow).
  if (deviceObjectId) {
    await setServerDeviceToken(deviceObjectId);
  }

  await setAuthCookies({ sessionCookie, refreshToken });

  let showTrustPrompt = false;
  let pendingDeviceId: string | undefined;

  if (pendingAuth.deviceObjectId) {
    const { DeviceRepository } = await import('../repositories/device.repository');
    const deviceRepo = new DeviceRepository();
    const d = await deviceRepo.findByServerDeviceId(pendingAuth.deviceObjectId, userId);
    
    if (d && !d.trusted && !d.blocked) {
      showTrustPrompt = true;
      pendingDeviceId = d.deviceId;
    }
  }

  if (!showTrustPrompt) {
    cookieStore.set(TWO_FA_PENDING_COOKIE, '', clearingCookieOpts('strict', '/'));
  }
  return { success: true, showTrustPrompt, pendingDeviceId }; // success -> client redirects
}

/**
 * Server Action: resends the email 2FA code for the pending verification
 * session. Safe to call repeatedly (prior codes are invalidated).
 *
 * Throttled (MongoDB-backed, no module-level maps): at most 1 resend per 30s
 * AND at most 5 per 10min per user. The counters are keyed by
 * `2fa_resend:<userId>` so they survive across serverless instances.
 *
 * C1: wrapped with `withCsrfGuard`.
 */
async function resend2faActionImpl(): Promise<{ error?: string } | void> {
  const cookieStore = await cookies();
  const pending = cookieStore.get(TWO_FA_PENDING_COOKIE);
  if (!pending?.value) return;

  const tokenHash = crypto.createHash('sha256').update(pending.value).digest('hex');
  const pendingRepo = new PendingAuthenticationRepository();
  const pendingAuth = await pendingRepo.findByTokenHash(tokenHash);
  if (!pendingAuth || pendingAuth.consumedAt || pendingAuth.expiresAt.getTime() < Date.now()) return;
  const userId = pendingAuth.userId;

  const ip = await getClientIp();
  const attemptRepo = new LoginAttemptRepository();
  const resendId = twoFactorResendIdentifier(userId);

  // 1) Hard floor: no more than 1 resend per 30s (most-recent wins).
  const sinceLast = await attemptRepo.countRecentByFilter(
    { identifier: resendId, success: true },
    RESEND_MIN_INTERVAL_MS
  );
  if (sinceLast > 0) {
    return { error: 'Please wait a moment before requesting another code.' };
  }

  // 2) Burst cap: at most 5 resends per 10min per user.
  const inWindow = await attemptRepo.countRecentByFilter(
    { identifier: resendId, success: true },
    RESEND_WINDOW_MS
  );
  if (inWindow >= RESEND_MAX_PER_WINDOW) {
    return { error: 'Too many codes requested. Please try again later.' };
  }

  // Record the resend BEFORE sending so the counters above are accurate even
  // under concurrent calls (the count includes this attempt once persisted).
  await attemptRepo.recordAttempt({
    userId,
    identifierType: 'EMAIL',
    identifier: resendId,
    ipAddress: ip,
    userAgent: (await headers()).get('user-agent') || null,
    device: null,
    success: true,
    failureReason: null,
    lockExpiresAt: null,
    correlationId: null,
    country: null,
    city: null,
  });

  const twoFactor = new TwoFactorService();
  try {
    await twoFactor.sendCode(userId);
  } catch (error: any) {
    return { error: error.message || 'Unable to send code. Please try again later.' };
  }
}

export const verify2faAction = withCsrfGuard(verify2faActionImpl);
export const resend2faAction = withCsrfGuard(resend2faActionImpl);
