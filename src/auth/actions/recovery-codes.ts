'use server';

import { revalidatePath } from 'next/cache';
import { requireActiveSession } from '../dal';
import { RecoveryCodeRepository } from '../repositories/recovery-code.repository';
import { AuditLogRepository } from '../repositories/audit-log.repository';

export type RecoveryCodeState = {
  error?: string;
  /** Set only on the generate/regenerate response — raw codes shown ONCE. */
  codes?: string[];
};

const recoveryRepo = new RecoveryCodeRepository();
const auditRepo = new AuditLogRepository();

/**
 * Generates a fresh set of recovery codes and returns the RAW codes for
 * one-time display. Only hashes are persisted; prior codes are invalidated.
 * Requires an active authenticated session.
 */
export async function generateRecoveryCodesAction(): Promise<RecoveryCodeState> {
  try {
    const session = await requireActiveSession();
    const userId = session.userId;

    const { rawCodes } = await recoveryRepo.generate(userId);

    await auditRepo.log({
      userId,
      sessionId: session._id,
      action: 'auth.mfa.recovery.generated',
      status: 'SUCCESS',
      errorCode: null,
      actor: { type: 'user', id: userId },
      source: { platform: 'web', appVersion: '0.1.0' },
      correlationId: null,
      requestId: null,
      resource: null,
      metadata: { count: rawCodes.length },
      ipAddress: session.ipAddress,
      userAgent: session.userAgent,
    });

    revalidatePath('/dashboard/security');
    // Return plaintext codes exactly once — caller must display and forget them.
    return { codes: rawCodes };
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Unable to generate recovery codes.' };
  }
}

/**
 * Regenerates the recovery codes (alias for generate). Invalidates prior codes
 * and returns a new set for one-time display.
 */
export async function regenerateRecoveryCodesAction(): Promise<RecoveryCodeState> {
  return generateRecoveryCodesAction();
}

/**
 * Returns non-sensitive status about the user's recovery codes: how many
 * remain unused. NEVER returns the codes themselves (hashes only are stored).
 */
export async function getRecoveryCodesStatusAction(): Promise<{
  error?: string;
  hasCodes: boolean;
  remaining: number;
}> {
  try {
    const session = await requireActiveSession();
    const remaining = await recoveryRepo.countRemaining(session.userId);
    return { hasCodes: remaining > 0, remaining };
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : 'Unable to read recovery code status.',
      hasCodes: false,
      remaining: 0,
    };
  }
}
