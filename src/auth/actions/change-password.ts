'use server';

import { cookies } from 'next/headers';
import { ObjectId } from 'mongodb';
import { PasswordService } from '../services/password.service';
import { verifySessionSignature } from '../crypto/token';
import { getEnv } from '../config/env';
import { AuthError } from '../errors/auth-errors';
import { clearingCookieOpts } from '../lib/cookies';
import { withCsrfGuard } from '../lib/csrf';

export type ChangePasswordState = { error?: string; success?: boolean };

const SESSION_COOKIE = 'cws_session';
const PENDING_COOKIE = 'cws_pw_pending';

/**
 * Server Action: change the user's password. Works EITHER with a real session
 * cookie (normal flow) OR with the signed `cws_pw_pending` cookie set by the
 * login flow when a password is expired / force-change required (FIX-02). In the
 * pending case the user has no session yet, so we derive the userId from the
 * pending cookie and clear it once the change succeeds.
 *
 * C1: wrapped with `withCsrfGuard`; the pending cookie is cleared Strict
 * (matching how it was issued in login.ts).
 */
async function changePasswordActionImpl(
  _prev: ChangePasswordState,
  formData: FormData
): Promise<ChangePasswordState> {
  const cookieStore = await cookies();

  // Prefer a real session; fall back to the force-change pending cookie.
  let userIdStr: string | null = null;
  let fromPending = false;

  const sessionCookie = cookieStore.get(SESSION_COOKIE);
  if (sessionCookie?.value) {
    userIdStr = verifySessionSignature(sessionCookie.value, getEnv().SESSION_SECRET);
  }
  if (!userIdStr) {
    const pending = cookieStore.get(PENDING_COOKIE);
    if (pending?.value) {
      userIdStr = verifySessionSignature(pending.value, getEnv().SESSION_SECRET);
      fromPending = true;
    }
  }

  if (!userIdStr) {
    return { error: 'Your session has expired. Please sign in again.' };
  }

  const service = new PasswordService();
  const parsed = service.parseChange({
    currentPassword: formData.get('currentPassword'),
    newPassword: formData.get('newPassword'),
    confirmPassword: formData.get('confirmPassword'),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Please check your input.' };
  }

  try {
    await service.changePassword(
      new ObjectId(userIdStr),
      parsed.data.currentPassword,
      parsed.data.newPassword,
      fromPending ? undefined : userIdStr
    );

    // FIX-02: after a successful change, clear the force-change pending cookie
    // so it can't be reused; the user then lands on /dashboard.
    if (fromPending) {
      cookieStore.set(PENDING_COOKIE, '', clearingCookieOpts('strict', '/'));
    }

    return { success: true };
  } catch (err) {
    if (err instanceof AuthError) return { error: err.publicMessage };
    return { error: err instanceof Error ? err.message : 'Unable to change password.' };
  }
}

export const changePasswordAction = withCsrfGuard(changePasswordActionImpl);
