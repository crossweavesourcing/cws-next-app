'use server';

import { cookies, headers } from 'next/headers';
import { ObjectId } from 'mongodb';
import { MfaService } from '../services/mfa.service';
import { SessionService } from '../services/session.service';
import { UserRepository } from '../repositories/user.repository';
import { verifySessionSignature } from '../crypto/token';
import { getEnv } from '../config/env';
import { getClientIp } from '../lib/request';
import { ensureDeviceId, setServerDeviceToken } from '../lib/device';
import { setAuthCookies } from '../lib/cookies';

export type VerifyTotpState = { error?: string };

const TWO_FA_PENDING_COOKIE = 'cws_2fa_pending';
const STEPUP_PENDING_COOKIE = 'cws_stepup_pending';

export async function verifyTotpAction(
  _prev: VerifyTotpState,
  formData: FormData
): Promise<VerifyTotpState> {
  const cookieStore = await cookies();
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
  if (typeof code !== 'string' || code.trim().length !== 6) {
    return { error: 'Please enter the 6-digit TOTP code.' };
  }

  const mfaService = new MfaService();
  const ok = await mfaService.verifyTotpLogin(userId, code.trim());
  if (!ok) {
    return { error: 'Invalid TOTP code. Please try again.' };
  }

  // Issue the real session now that TOTP passed.
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
  
  if (created.status !== 'authenticated') {
    return { error: 'Unable to complete sign-in. Please try again.' };
  }
  
  const { sessionCookie, refreshToken, deviceObjectId } = created;

  if (deviceObjectId) {
    await setServerDeviceToken(deviceObjectId);
  }

  await setAuthCookies({ sessionCookie, refreshToken });

  for (const name of [TWO_FA_PENDING_COOKIE, STEPUP_PENDING_COOKIE]) {
    cookieStore.set(name, '', { maxAge: 0, path: '/' });
  }

  return {}; // success -> client redirects
}
