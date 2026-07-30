'use server';

import { cookies, headers } from 'next/headers';
import { ObjectId } from 'mongodb';
import { MfaService } from '../services/mfa.service';
import { SessionService } from '../services/session.service';
import { UserRepository } from '../repositories/user.repository';
import { LoginAttemptRepository } from '../repositories/login-attempt.repository';
import { PendingAuthenticationRepository } from '../repositories/pending-authentication.repository';
import * as crypto from 'crypto';
import { getClientIp } from '../lib/request';
import { ensureDeviceId, setServerDeviceToken } from '../lib/device';
import { setAuthCookies, clearingCookieOpts } from '../lib/cookies';
import { withCsrfGuard } from '../lib/csrf';

import { AuditLogRepository } from '../repositories/audit-log.repository';

export type VerifyTotpState = {
  error?: string;
  success?: boolean;
  showTrustPrompt?: boolean;
  pendingDeviceId?: string;
};

const TWO_FA_PENDING_COOKIE = 'cws_2fa_pending';

function totpIdentifier(userId: ObjectId): string {
  return `totp:${userId.toHexString()}`;
}

/**
 * Server Action: verifies the TOTP code and, on success, issues the real
 * session + refresh cookies (completing the login).
 */
async function verifyTotpActionImpl(
  _prev: VerifyTotpState,
  formData: FormData
): Promise<VerifyTotpState> {
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
  if (pendingAuth.primaryAuthenticationMethod === 'passkey' || pendingAuth.primaryAuthenticationMethod === 'google') {
    return { error: 'Use the email code to finish this sign-in.' };
  }

  if (pendingAuth.attemptsRemaining <= 0) {
    cookieStore.set(TWO_FA_PENDING_COOKIE, '', clearingCookieOpts('strict', '/'));
    return { error: 'Too many attempts. Please sign in again.' };
  }

  const ip = await getClientIp();
  const ua = (await headers()).get('user-agent') || null;
  const attemptRepo = new LoginAttemptRepository();
  const auditRepo = new AuditLogRepository();

  const code = formData.get('code');
  if (typeof code !== 'string' || code.trim().length !== 6) {
    return { error: 'Please enter the 6-digit TOTP code.' };
  }

  // Check global rate limit before verifying
  const recentFailures = await attemptRepo.countRecentTotpFailures(userId, 15 * 60 * 1000);
  if (recentFailures >= 5) {
    const userRepo = new UserRepository();
    await userRepo.lockAccount(userId, new Date(Date.now() + 15 * 60 * 1000));
    await pendingRepo.consume(pendingAuth._id);
    cookieStore.set(TWO_FA_PENDING_COOKIE, '', clearingCookieOpts('strict', '/'));
    return { error: 'Account locked due to too many failed verification attempts. Try again in 15 minutes.' };
  }

  const mfaService = new MfaService();
  const ok = await mfaService.verifyTotpLogin(userId, code.trim());
  await attemptRepo.recordAttempt({
    userId,
    identifierType: 'EMAIL',
    identifier: totpIdentifier(userId),
    ipAddress: ip,
    userAgent: ua,
    device: null,
    success: ok,
    failureReason: ok ? null : 'TOTP verification failed',
    lockExpiresAt: null,
    correlationId: null,
    country: null,
    city: null,
  });

  await auditRepo.log({
    userId,
    sessionId: null,
    action: ok ? 'auth.mfa.totp.verified' : 'auth.mfa.totp.failed',
    status: ok ? 'SUCCESS' : 'FAILURE',
    errorCode: ok ? null : 'AUTH_MFA_TOTP_INVALID',
    actor: { type: 'user', id: userId },
    source: { platform: 'web', appVersion: '0.1.0' },
    correlationId: null,
    requestId: null,
    resource: null,
    metadata: {},
    ipAddress: ip,
    userAgent: ua,
  });

  if (!ok) {
    if (recentFailures + 1 >= 5) {
      const userRepo = new UserRepository();
      await userRepo.lockAccount(userId, new Date(Date.now() + 15 * 60 * 1000));
      await pendingRepo.consume(pendingAuth._id);
      cookieStore.set(TWO_FA_PENDING_COOKIE, '', clearingCookieOpts('strict', '/'));
      return { error: 'Account locked due to too many failed verification attempts. Try again in 15 minutes.' };
    }

    const attemptsLeft = await pendingRepo.decrementAttempts(pendingAuth._id);
    if (attemptsLeft <= 0) {
      cookieStore.set(TWO_FA_PENDING_COOKIE, '', clearingCookieOpts('strict', '/'));
      return { error: 'Too many attempts. Please sign in again.' };
    }
    return { error: 'Invalid TOTP code. Please try again.' };
  }

  await pendingRepo.consume(pendingAuth._id);

  // Issue the real session now that TOTP passed.
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
  
  if (created.status !== 'authenticated') {
    return { error: 'Unable to complete sign-in. Please try again.' };
  }
  
  const { sessionCookie, refreshToken, deviceObjectId } = created;

  if (deviceObjectId) {
    await setServerDeviceToken(deviceObjectId);
  }

  await setAuthCookies({ sessionCookie, refreshToken });

  // Clear both pending cookies. Use Strict to mirror issuance (same as
  // verify-2fa.ts). clearingCookieOpts routes the `secure` flag through the
  // single `isSecureCookies()` source of truth.
  for (const name of [TWO_FA_PENDING_COOKIE]) {
    cookieStore.set(name, '', clearingCookieOpts('strict', '/'));
  }

  let showTrustPrompt = false;
  let pendingDeviceId: string | undefined;

  if (pendingAuth.deviceObjectId) {
    // Import here to avoid circular dependency issues if any
    const { DeviceRepository } = await import('../repositories/device.repository');
    const deviceRepo = new DeviceRepository();
    const d = await deviceRepo.findByServerDeviceId(pendingAuth.deviceObjectId, userId);
    if (d && !d.trusted && !d.blocked) {
      showTrustPrompt = true;
      pendingDeviceId = d.deviceId;
    }
  }

  return { success: true, showTrustPrompt, pendingDeviceId }; // success -> client redirects
}

export const verifyTotpAction = withCsrfGuard(verifyTotpActionImpl);
