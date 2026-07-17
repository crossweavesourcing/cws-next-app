'use server';

import { cookies } from 'next/headers';
import { ObjectId } from 'mongodb';
import { TwoFactorService } from '../services/two-factor.service';
import { SessionService } from '../services/session.service';
import { UserRepository } from '../repositories/user.repository';
import { verifySessionSignature } from '../crypto/token';
import { getEnv } from '../config/env';
import { getClientIp } from '../lib/request';
import { ensureDeviceId, setServerDeviceToken } from '../lib/device';
import { headers } from 'next/headers';
import { setAuthCookies, clearingCookieOpts } from '../lib/cookies';
import { withCsrfGuard } from '../lib/csrf';

export type Verify2FAState = { error?: string };

const TWO_FA_PENDING_COOKIE = 'cws_2fa_pending';
const STEPUP_PENDING_COOKIE = 'cws_stepup_pending';

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

  const code = formData.get('code');
  if (typeof code !== 'string' || code.trim().length < 4) {
    return { error: 'Please enter the 6-digit code sent to your email.' };
  }

  const twoFactor = new TwoFactorService();
  const ok = await twoFactor.verify(userId, code.trim());
  if (!ok) {
    return { error: 'Invalid or expired code. Request a new code and try again.' };
  }

  // Issue the real session now that 2FA passed.
  const userRepo = new UserRepository();
  const user = await userRepo.findById(userId);
  if (!user) return { error: 'Account not found.' };

  const ip = await getClientIp();
  const ua = (await headers()).get('user-agent') || null;
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
 * C1: wrapped with `withCsrfGuard`.
 */
async function resend2faActionImpl(): Promise<void> {
  const cookieStore = await cookies();
  const pending =
    cookieStore.get(TWO_FA_PENDING_COOKIE) ?? cookieStore.get(STEPUP_PENDING_COOKIE);
  const userIdStr = pending?.value
    ? verifySessionSignature(pending.value, getEnv().SESSION_SECRET)
    : null;
  if (!userIdStr) return;
  const twoFactor = new TwoFactorService();
  await twoFactor.sendCode(new ObjectId(userIdStr));
}

export const verify2faAction = withCsrfGuard(verify2faActionImpl);
export const resend2faAction = withCsrfGuard(resend2faActionImpl);
