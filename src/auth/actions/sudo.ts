'use server';

import { cookies } from 'next/headers';
import { PasswordService } from '../services/password.service';
import { signSessionId } from '../crypto/token';
import { getEnv } from '../config/env';
import { AuthError } from '../errors/auth-errors';
import { requireActiveSession } from '../dal';
import { withCsrfGuard } from '../lib/csrf';
import { isSecureCookies } from '../lib/cookies';

const SUDO_COOKIE = 'cws_sudo';

export type SudoState = {
  error?: string;
  success?: boolean;
};

async function verifySudoPasswordActionImpl(
  _prev: SudoState,
  formData: FormData
): Promise<SudoState> {
  const session = await requireActiveSession();
  const password = formData.get('password');

  if (!password || typeof password !== 'string') {
    return { error: 'Password is required' };
  }

  const passwordService = new PasswordService();

  try {
    const isValid = await passwordService.verifyPassword(session.userId, password);
    if (!isValid) {
      return { error: 'Incorrect password' };
    }

    const cookieStore = await cookies();
    const token = signSessionId(session._id.toString(), getEnv().SESSION_SECRET);

    cookieStore.set(SUDO_COOKIE, token, {
      httpOnly: true,
      secure: isSecureCookies(),
      sameSite: 'lax',
      path: '/',
      maxAge: 15 * 60, // 15 minutes
    });

    return { success: true };
  } catch (err) {
    if (err instanceof AuthError) return { error: err.publicMessage };
    return { error: 'An unexpected error occurred' };
  }
}

export const verifySudoPasswordAction = withCsrfGuard(verifySudoPasswordActionImpl);
