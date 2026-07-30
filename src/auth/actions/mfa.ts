'use server';

import { MfaService } from '../services/mfa.service';
import { requireSudoMode } from '../dal';
import { SudoRequiredError } from '../errors/auth-errors';
import { withCsrfGuard } from '../lib/csrf';
import { UserRepository } from '../repositories/user.repository';
import type { TwoFaPreference } from '@/types/auth/user.types';
import { revalidatePath } from 'next/cache';

type TwoFaMethod = 'email' | 'totp';

export type UpdateTwoFaPreferencesResult = {
  success: boolean;
  error?: string;
  preference?: TwoFaPreference;
  defaultMethod?: TwoFaMethod;
  requiresSudo?: boolean;
};

async function generateTotpSecretActionImpl(): Promise<{ secret?: string; otpauthUrl?: string; error?: string; requiresSudo?: boolean }> {
  try {
    const session = await requireSudoMode();
    const mfaService = new MfaService();
    const userRepo = new UserRepository();
    
    const email = await userRepo.findPrimaryEmail(session.userId);
    if (!email) throw new Error('Primary email not found');

    const { secret, otpauthUrl } = await mfaService.generateTotpSecret(session.userId, email);
    return { secret, otpauthUrl };
  } catch (err) {
    if (err instanceof SudoRequiredError) {
      return { error: err.publicMessage, requiresSudo: true };
    }
    return { error: 'An unexpected error occurred.' };
  }
}

export const generateTotpSecretAction = withCsrfGuard(generateTotpSecretActionImpl);

async function verifyAndEnableTotpActionImpl(secret: string, token: string): Promise<{ success: boolean; error?: string; requiresSudo?: boolean }> {
  try {
    const session = await requireSudoMode();
    const mfaService = new MfaService();

    const success = await mfaService.verifyAndEnableTotp(session.userId, secret, token);
    if (!success) {
      return { success: false, error: 'Invalid code' };
    }
    return { success: true };
  } catch (err) {
    if (err instanceof SudoRequiredError) {
      return { success: false, error: err.publicMessage, requiresSudo: true };
    }
    return { success: false, error: 'An unexpected error occurred.' };
  }
}

export const verifyAndEnableTotpAction = withCsrfGuard(verifyAndEnableTotpActionImpl);

async function disableTotpActionImpl(): Promise<{ success: boolean; error?: string; requiresSudo?: boolean }> {
  try {
    const session = await requireSudoMode();
    const mfaService = new MfaService();

    await mfaService.disableTotp(session.userId);
    return { success: true };
  } catch (err) {
    if (err instanceof SudoRequiredError) {
      return { success: false, error: err.publicMessage, requiresSudo: true };
    }
    return { success: false, error: 'An unexpected error occurred.' };
  }
}

export const disableTotpAction = withCsrfGuard(disableTotpActionImpl);

async function updateTwoFaPreferencesActionImpl(
  preference: TwoFaPreference,
  defaultMethod: TwoFaMethod | null
): Promise<UpdateTwoFaPreferencesResult> {
  try {
    const session = await requireSudoMode();
    const userRepo = new UserRepository();

    if (!['always', 'new_device_only', 'off'].includes(preference)) {
      return { success: false, error: 'Invalid preference.' };
    }
    if (!['email', 'totp', null].includes(defaultMethod ?? null)) {
      return { success: false, error: 'Invalid default method.' };
    }

    const user = await userRepo.findById(session.userId);
    if (!user) {
      return { success: false, error: 'Account information is unavailable.' };
    }

    const savedMethod = defaultMethod ?? 'email';
    if (savedMethod === 'totp' && !user.security.totpEnabled) {
      return { success: false, error: 'Set up an authenticator app before making it your default method.' };
    }

    await userRepo.updateSecurity(session.userId, {
      twoFaPreference: preference,
      defaultTwoFaMethod: savedMethod,
    });

    revalidatePath('/dashboard/account-security');
    return { success: true, preference, defaultMethod: savedMethod };
  } catch (err) {
    if (err instanceof SudoRequiredError) {
      return { success: false, error: err.publicMessage, requiresSudo: true };
    }
    return { success: false, error: 'An unexpected error occurred.' };
  }
}

export const updateTwoFaPreferencesAction = withCsrfGuard(updateTwoFaPreferencesActionImpl);
