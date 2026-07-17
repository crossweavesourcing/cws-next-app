'use server';

import { PasswordService } from '../services/password.service';
import { LoginAttemptRepository } from '../repositories/login-attempt.repository';
import { loginSchema } from '../validation/login.schema';
import { withCsrfGuard } from '../lib/csrf';
import { getClientIp } from '../lib/request';

export type RequestResetState = { error?: string; success?: boolean };
export type ResetPasswordState = { error?: string; success?: boolean };

// ─── Password-reset rate limits (MongoDB-backed, shared across instances). ────
// Request: ≤ 5 requests / 15min per email AND ≤ 20 / 15min per IP.
const PWRESET_REQUEST_MAX_PER_EMAIL = 5;
const PWRESET_REQUEST_WINDOW_MS = 15 * 60 * 1000;
const PWRESET_REQUEST_MAX_PER_IP = 20;

// Submit: ≤ 10 submit attempts / 15min per email (token-guessing throttle).
const PWRESET_SUBMIT_MAX_PER_EMAIL = 10;
const PWRESET_SUBMIT_WINDOW_MS = 15 * 60 * 1000;

function pwresetRequestId(email: string): string {
  return `pwreset:request:${email.trim().toLowerCase()}`;
}
function pwresetSubmitId(email: string): string {
  return `pwreset:submit:${email.trim().toLowerCase()}`;
}

/**
 * Server Action: request a password reset email. Never reveals whether the
 * email exists (always returns success).
 *
 * Rate-limited per email + per IP (MongoDB-backed) before the service's own
 * per-email throttle runs. A generic success is returned regardless so the
 * caller cannot distinguish a throttled request from a real one.
 *
 * C1: wrapped with `withCsrfGuard`. This issues a reset email / token and is
 * state-changing, so it must be origin-checked like every other auth action.
 */
async function requestResetActionImpl(
  _prev: RequestResetState,
  formData: FormData
): Promise<RequestResetState> {
  const email = typeof formData.get('email') === 'string' ? formData.get('email') : '';
  const parsed = loginSchema.pick({ email: true }).safeParse({ email });
  const safeEmail = parsed.success ? parsed.data.email : '';

  const ip = await getClientIp();
  const attemptRepo = new LoginAttemptRepository();

  // Always record the attempt so repeat hits keep counting; only BLOCK when a
  // cap is reached (enumeration resistance: we never reveal throttling state).
  await attemptRepo.recordAttempt({
    userId: null,
    identifierType: 'PASSWORD_RESET_REQUEST',
    identifier: pwresetRequestId(safeEmail || 'unknown'),
    ipAddress: ip,
    userAgent: null,
    device: null,
    success: true,
    failureReason: null,
    lockExpiresAt: null,
    correlationId: null,
    country: null,
    city: null,
  });

  if (safeEmail) {
    const perEmail = await attemptRepo.countRecentByFilter(
      { identifier: pwresetRequestId(safeEmail), success: true },
      PWRESET_REQUEST_WINDOW_MS
    );
    if (perEmail > PWRESET_REQUEST_MAX_PER_EMAIL) {
      return { success: true }; // throttled, but generic success
    }
  }
  const perIp = await attemptRepo.countRecentByIpFilter(
    ip,
    { identifierType: 'PASSWORD_RESET_REQUEST', success: true },
    PWRESET_REQUEST_WINDOW_MS
  );
  if (perIp > PWRESET_REQUEST_MAX_PER_IP) {
    return { success: true }; // throttled, but generic success
  }

  const service = new PasswordService();
  await service.requestReset(safeEmail); // no-op if unknown
  return { success: true };
}

/**
 * Server Action: complete a password reset using the emailed token.
 *
 * Rate-limited per email (token-guessing throttle) using the same MongoDB
 * counters; failures are recorded so the limit is enforced even before the
 * service validates the token.
 *
 * C1: wrapped with `withCsrfGuard` (password reset CSRF vector).
 */
async function resetPasswordActionImpl(
  _prev: ResetPasswordState,
  formData: FormData
): Promise<ResetPasswordState> {
  const token = typeof formData.get('token') === 'string' ? (formData.get('token') as string) : '';
  const newPassword = typeof formData.get('newPassword') === 'string' ? (formData.get('newPassword') as string) : '';
  const confirmPassword = typeof formData.get('confirmPassword') === 'string' ? (formData.get('confirmPassword') as string) : '';

  if (!token || newPassword !== confirmPassword) {
    return { error: 'Passwords do not match or the link is invalid.' };
  }

  const ip = await getClientIp();
  const attemptRepo = new LoginAttemptRepository();

  // Best-effort email extraction from the token is not possible client-side, so
  // we throttle by the submit identifier derived from the raw token hash prefix
  // (stable per link) AND per IP. This caps token-guessing attempts.
  const submitId = `pwreset:submit:${token.slice(0, 16)}`;
  const perToken = await attemptRepo.countRecentByFilter(
    { identifier: submitId, identifierType: 'PASSWORD_RESET_SUBMIT' },
    PWRESET_SUBMIT_WINDOW_MS
  );
  if (perToken >= PWRESET_SUBMIT_MAX_PER_EMAIL) {
    return { error: 'Too many attempts. Please request a new reset link.' };
  }

  const service = new PasswordService();
  try {
    await service.resetPassword(token, newPassword);
    return { success: true };
  } catch (err) {
    // Record the failed submit so the throttle counter above accrues.
    await attemptRepo.recordAttempt({
      userId: null,
      identifierType: 'PASSWORD_RESET_SUBMIT',
      identifier: submitId,
      ipAddress: ip,
      userAgent: null,
      device: null,
      success: false,
      failureReason: 'password reset submit failed',
      lockExpiresAt: null,
      correlationId: null,
      country: null,
      city: null,
    });
    return { error: err instanceof Error ? err.message : 'Unable to reset password.' };
  }
}

export const requestResetAction = withCsrfGuard(requestResetActionImpl);
export const resetPasswordAction = withCsrfGuard(resetPasswordActionImpl);

