'use server';

import { PasswordService } from '../services/password.service';
import { loginSchema } from '../validation/login.schema';

export type RequestResetState = { error?: string; success?: boolean };
export type ResetPasswordState = { error?: string; success?: boolean };

/**
 * Server Action: request a password reset email. Never reveals whether the
 * email exists (always returns success).
 */
export async function requestResetAction(
  _prev: RequestResetState,
  formData: FormData
): Promise<RequestResetState> {
  const email = typeof formData.get('email') === 'string' ? formData.get('email') : '';
  const parsed = loginSchema.pick({ email: true }).safeParse({ email });
  const safeEmail = parsed.success ? parsed.data.email : '';

  const service = new PasswordService();
  await service.requestReset(safeEmail); // no-op if unknown
  return { success: true };
}

/**
 * Server Action: complete a password reset using the emailed token.
 */
export async function resetPasswordAction(
  _prev: ResetPasswordState,
  formData: FormData
): Promise<ResetPasswordState> {
  const token = typeof formData.get('token') === 'string' ? (formData.get('token') as string) : '';
  const newPassword = typeof formData.get('newPassword') === 'string' ? (formData.get('newPassword') as string) : '';
  const confirmPassword = typeof formData.get('confirmPassword') === 'string' ? (formData.get('confirmPassword') as string) : '';

  if (!token || newPassword !== confirmPassword) {
    return { error: 'Passwords do not match or the link is invalid.' };
  }

  const service = new PasswordService();
  try {
    await service.resetPassword(token, newPassword);
    return { success: true };
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Unable to reset password.' };
  }
}
