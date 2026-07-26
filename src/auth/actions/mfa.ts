'use server';

import { MfaService } from '../services/mfa.service';
import { requireActiveSession } from '../dal';
import { withCsrfGuard } from '../lib/csrf';
import { UserRepository } from '../repositories/user.repository';
import type { TwoFaPreference } from '@/types/auth/user.types';

async function generateTotpSecretActionImpl(): Promise<{ secret?: string; otpauthUrl?: string; error?: string }> {
  const session = await requireActiveSession();
  const mfaService = new MfaService();
  const userRepo = new UserRepository();
  
  const email = await userRepo.findPrimaryEmail(session.userId);
  if (!email) throw new Error('Primary email not found');

  const { secret, otpauthUrl } = await mfaService.generateTotpSecret(session.userId, email);
  return { secret, otpauthUrl };
}

export const generateTotpSecretAction = withCsrfGuard(generateTotpSecretActionImpl);

async function verifyAndEnableTotpActionImpl(secret: string, token: string): Promise<{ success: boolean; error?: string }> {
  const session = await requireActiveSession();
  const mfaService = new MfaService();

  const success = await mfaService.verifyAndEnableTotp(session.userId, secret, token);
  if (!success) {
    return { success: false, error: 'Invalid code' };
  }
  return { success: true };
}

export const verifyAndEnableTotpAction = withCsrfGuard(verifyAndEnableTotpActionImpl);

async function disableTotpActionImpl(): Promise<{ success: boolean; error?: string }> {
  const session = await requireActiveSession();
  const mfaService = new MfaService();

  await mfaService.disableTotp(session.userId);
  return { success: true };
}

export const disableTotpAction = withCsrfGuard(disableTotpActionImpl);

async function updateTwoFaPreferencesActionImpl(
  preference: TwoFaPreference,
  defaultMethod: 'email' | 'totp' | 'webauthn' | null
): Promise<{ success: boolean; error?: string }> {
  const session = await requireActiveSession();
  const userRepo = new UserRepository();

  // Validate inputs
  if (!['always', 'new_device_only', 'off', null].includes(preference ?? null)) {
    throw new Error('Invalid preference');
  }
  if (!['email', 'totp', 'webauthn', null].includes(defaultMethod ?? null)) {
    throw new Error('Invalid default method');
  }

  await userRepo.updateSecurity(session.userId, {
    twoFaPreference: preference,
    defaultTwoFaMethod: defaultMethod ?? undefined,
  });

  return { success: true };
}

export const updateTwoFaPreferencesAction = withCsrfGuard(updateTwoFaPreferencesActionImpl);
