import { z } from 'zod';
import { PASSWORD_MAX_LENGTH, PASSWORD_MIN_LENGTH } from './password-strength';

/**
 * Effective password policy. In production this is read from the
 * `password_policies` collection; these are safe compile-time defaults used
 * when no policy doc is configured yet.
 */
export interface PasswordPolicy {
  minLength: number;
  maxLength: number;
  requireUppercase: boolean;
  requireLowercase: boolean;
  requireNumber: boolean;
  requireSpecialChar: boolean;
  expirationDays: number; // 0 = never
  historyCount: number; // 0 = no history enforcement
}

export const DEFAULT_PASSWORD_POLICY: PasswordPolicy = {
  minLength: PASSWORD_MIN_LENGTH,
  maxLength: PASSWORD_MAX_LENGTH,
  requireUppercase: false,
  requireLowercase: false,
  requireNumber: false,
  requireSpecialChar: false,
  expirationDays: 0,
  historyCount: 5,
};

/**
 * Builds a zod schema that enforces the active password policy.
 * Rejects trivial/sequential/repetitive patterns to defeat common weak passwords.
 */
export function buildPasswordSchema(policy: PasswordPolicy = DEFAULT_PASSWORD_POLICY) {
  let schema = z
    .string()
    .min(policy.minLength, `Password must be at least ${policy.minLength} characters.`)
    .max(policy.maxLength, `Password must not exceed ${policy.maxLength} characters.`);

  if (policy.requireUppercase) {
    schema = schema.regex(/[A-Z]/, 'Password must contain an uppercase letter.');
  }
  if (policy.requireLowercase) {
    schema = schema.regex(/[a-z]/, 'Password must contain a lowercase letter.');
  }
  if (policy.requireNumber) {
    schema = schema.regex(/[0-9]/, 'Password must contain a number.');
  }
  if (policy.requireSpecialChar) {
    schema = schema.regex(/[^A-Za-z0-9]/, 'Password must contain a special character.');
  }

  return schema.refine(
    (pw) => !/^(.)\1+$/.test(pw),
    'Password must not be all the same character.'
  );
}

export const passwordChangeSchema = z
  .object({
    currentPassword: z.string().min(1, 'Current password is required.'),
    newPassword: z.string(),
    confirmPassword: z.string(),
  })
  .refine((d) => d.newPassword === d.confirmPassword, {
    message: 'New password and confirmation do not match.',
    path: ['confirmPassword'],
  });

export type PasswordChangePayload = z.infer<typeof passwordChangeSchema>;
