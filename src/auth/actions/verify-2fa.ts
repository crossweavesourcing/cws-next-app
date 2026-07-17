'use server';

import { cookies, headers } from 'next/headers';
import { ObjectId } from 'mongodb';
import { TwoFactorService } from '../services/two-factor.service';
import { SessionService } from '../services/session.service';
import { UserRepository } from '../repositories/user.repository';
import { LoginAttemptRepository } from '../repositories/login-attempt.repository';
import { verifySessionSignature } from '../crypto/token';
import { getEnv } from '../config/env';
import { getClientIp } from '../lib/request';
import { ensureDeviceId, setServerDeviceToken } from '../lib/device';
import { setAuthCookies, clearingCookieOpts } from '../lib/cookies';
import { withCsrfGuard } from '../lib/csrf';

export type Verify2FAState = { error?: string };

const TWO_FA_PENDING_COOKIE = 'cws_2fa_pending';
const STEPUP_PENDING_COOKIE = 'cws_stepup_pending';

// ─── Rate-limit windows (MongoDB-backed, no in-memory state). ──────────────────
// Email 2FA code verification: at most 5 failed attempts per pending session
// (per userId) within 15 minutes, then force re-auth (do not loop).
const TWO_FA_MAX_FAILS = 5;
const TWO_FA_WINDOW_MS = 15 * 60 * 1000;

// Resend throttle: at most 1 resend per 30s AND at most 5 per 10min per user.
const RESEND_MIN_INTERVAL_MS = 30 * 1000;
const RESEND_MAX_PER_WINDOW = 5;
const RESEND_WINDOW_MS = 10 * 60 * 1000;

function twoFactorIdentifier(userId: ObjectId): string {
  return `2fa:${userId.toHexString()}`;
}

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
  // Accept BOTH the standard MFA pending cookie and the step-up pending cookie
  // (Item 9). Both carry the same HMAC-signed userId, so the 2FA flow is identical.
  const pending =
    cookieStore.get(TWO_FA_PENDING_COOKIE) ?? cookieStore.get(STEPUP_PENDING_COOKIE);
  if (!pending?.value) {
    return { error: 'Your verification session expired. Please sign in again.' };
  }

  const userIdStr = verifySessionSignature(pending.value, getEnv().SESSION_SECRET);
  if (!userIdStr) {
    return { error: 'Your verification session is invalid. Please sign in again.' };
  }
  const userId = new ObjectId(userIdStr);

  const ip = await getClientIp();
  const ua = (await headers()).get('user-agent') || null;
  const attemptRepo = new LoginAttemptRepository();

  // Rate-limit: count recent FAILED verifications for this pending session
  // (identifier = `2fa:<userId>`), persisted in MongoDB so the limit holds
  // across serverless instances. Throws / blocks once the cap is reached.
  const recentFails = await attemptRepo.countRecentByFilter(
    { identifier: twoFactorIdentifier(userId), success: false },
    TWO_FA_WINDOW_MS
  );
  if (recentFails >= TWO_FA_MAX_FAILS) {
    // Force re-auth: invalidate the pending cookie so the brute-forcer cannot
    // keep looping on the same session. A generic error avoids leaking the
    // exact remaining-attempt count.
    for (const name of [TWO_FA_PENDING_COOKIE, STEPUP_PENDING_COOKIE]) {
      cookieStore.set(name, '', clearingCookieOpts('strict', '/'));
    }
    return { error: 'Too many attempts. Please sign in again.' };
  }

  const code = formData.get('code');
  if (typeof code !== 'string' || code.trim().length < 4) {
    return { error: 'Please enter the 6-digit code sent to your email.' };
  }

  const twoFactor = new TwoFactorService();
  const ok = await twoFactor.verify(userId, code.trim());

  // Record EVERY verification attempt (success + failure) under the shared
  // `2fa:<userId>` identifier so the failed-attempt counter above is accurate.
  await attemptRepo.recordAttempt({
    userId,
    identifierType: 'EMAIL',
    identifier: twoFactorIdentifier(userId),
    ipAddress: ip,
    userAgent: ua,
    device: null,
    success: ok,
    failureReason: ok ? null : '2FA verification failed',
    lockExpiresAt: null,
    correlationId: null,
    country: null,
    city: null,
  });

  if (!ok) {
    return { error: 'Invalid or expired code. Request a new code and try again.' };
  }

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
    'password',
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

  // Clear both pending cookies (only one was set, but clearing both is harmless).
  // Use Strict to mirror issuance.
  for (const name of [TWO_FA_PENDING_COOKIE, STEPUP_PENDING_COOKIE]) {
    cookieStore.set(name, '', clearingCookieOpts('strict', '/'));
  }

  return {}; // success -> client redirects
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
  const pending =
    cookieStore.get(TWO_FA_PENDING_COOKIE) ?? cookieStore.get(STEPUP_PENDING_COOKIE);
  const userIdStr = pending?.value
    ? verifySessionSignature(pending.value, getEnv().SESSION_SECRET)
    : null;
  if (!userIdStr) return;
  const userId = new ObjectId(userIdStr);

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
  await twoFactor.sendCode(userId);
}

export const verify2faAction = withCsrfGuard(verify2faActionImpl);
export const resend2faAction = withCsrfGuard(resend2faActionImpl);
