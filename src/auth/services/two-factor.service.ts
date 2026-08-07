import { ObjectId } from 'mongodb';
import * as crypto from 'crypto';
import { UserRepository } from '../repositories/user.repository';
import { VerificationTokenRepository } from '../repositories/verification-token.repository';
import { LoginAttemptRepository } from '../repositories/login-attempt.repository';
import { AuditLogRepository } from '../repositories/audit-log.repository';
import { RecoveryCodeRepository } from '../repositories/recovery-code.repository';
import { sendMail } from './mailer';
import { getClientIp } from '../lib/request';
import { generateToken, hashToken } from '../crypto/token';
import { headers } from 'next/headers';

const CODE_TTL_MS = 5 * 60 * 1000; // 5 minutes
const CODE_LENGTH = 6;
/** Max failed 2FA attempts within the window before locking the code. */
const MAX_2FA_FAILURES = 5;
const TWO_FA_FAILURE_WINDOW_MS = 15 * 60 * 1000;

/**
 * Email-based two-factor authentication (no phone/SMS by design).
 * Issues a numeric code to the user's email; the code is a single-use,
 * short-lived verification token. Verification is rate-limited to thwart
 * brute force on the 6-digit code.
 */
export class TwoFactorService {
  private userRepo = new UserRepository();
  private tokenRepo = new VerificationTokenRepository();
  private attemptRepo = new LoginAttemptRepository();
  private auditRepo = new AuditLogRepository();
  private recoveryRepo = new RecoveryCodeRepository();

  /**
   * Issues a fresh 2FA code to the user's email, invalidating any prior code.
   * Throws if the user is currently rate-limited (too many recent failures).
   */
  async sendCode(userId: ObjectId): Promise<void> {
    const recentFailures = await this.attemptRepo.countRecent2FAFailures(
      userId,
      TWO_FA_FAILURE_WINDOW_MS
    );
    if (recentFailures >= MAX_2FA_FAILURES) {
      throw new Error('Too many incorrect codes. Request a new code in a few minutes.');
    }

    const user = await this.userRepo.findById(userId);
    if (!user) return;
    const email = await this.userRepo.findPrimaryEmail(userId);
    if (!email) return;

    // Invalidate prior codes before issuing a new one.
    await this.tokenRepo.invalidateAll(userId, 'two_factor');

    // `raw` is a CSRPNG entropy source; `code` is the 6-digit value shown to
    // the user. FIX-01: store a hash of *the code the user submits* (not `raw`)
    // so that `verify`'s `redeem(hashToken(code))` lookup matches.
    const raw = generateToken(8); // 16 hex chars (entropy source)
    const code = formatCode(raw);

    await this.tokenRepo.create(
      { userId, type: 'two_factor', payload: {} },
      CODE_TTL_MS,
      8,
      code // <-- hash THIS (the emailed 6-digit code), not `raw`
    );

    await sendMail({
      to: email,
      subject: 'CWS Admin — Your 2FA Code',
      text: `Your verification code is: ${code}\n\nThis code expires in 5 minutes. If you did not attempt to sign in, secure your account.`,
      html: `<div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;max-width:480px;margin:0 auto;padding:24px;border:1px solid #e5e5e5;background-color:#ffffff;color:#111827;">
        <h2 style="font-size:20px;font-weight:800;text-transform:uppercase;letter-spacing:-0.025em;color:#111827;margin-top:0;">CWS Two-Factor Verification</h2>
        <p style="font-size:14px;color:#4b5563;line-height:1.5;">Your verification code is below. Enter this code to complete your login:</p>
        <div style="margin:24px 0;padding:16px;background-color:#f9fafb;border:1px solid #e5e7eb;text-align:center;">
          <span style="font-family:monospace;font-size:32px;font-weight:900;letter-spacing:6px;color:#E02424;">${code}</span>
        </div>
        <p style="font-size:12px;color:#6b7280;line-height:1.5;">This code expires in <strong>5 minutes</strong>. If you did not attempt to sign in, please secure your account immediately.</p>
      </div>`,
    });

    await this.auditRepo.log({
      userId, sessionId: null, action: 'auth.mfa.code.sent',
      status: 'SUCCESS', errorCode: null,
      actor: { type: 'user', id: userId },
      source: { platform: 'web', appVersion: '0.1.0' },
      correlationId: null, requestId: null, resource: null,
      metadata: { channel: 'email' }, ipAddress: null, userAgent: null,
    });
  }

  /**
   * Verifies a submitted 2FA code. Accepts EITHER the email 2FA code OR a
   * single-use backup recovery code as an alternative. Returns true on success
   * (and consumes the code). Records every attempt; too many failures
   * temporarily lock code verification.
   */
  async verify(userId: ObjectId, code: string): Promise<boolean> {
    const raw = code.trim();
    const headersList = await headers();
    const ipAddress = await getClientIp();
    const userAgent = headersList.get('user-agent') || null;

    // Fast path: try the email 2FA code first.
    const redeemed = await this.tokenRepo.redeem(hashToken(raw));
    let ok = redeemed !== null && redeemed.userId?.equals(userId) === true;
    let method: 'email' | 'recovery' = 'email';

    // Fallback: treat the submitted value as a backup recovery code (single-use).
    if (!ok) {
      const redeemedRecovery = await this.recoveryRepo.redeem(raw, userId);
      if (redeemedRecovery) {
        ok = true;
        method = 'recovery';
      }
    }

    await this.attemptRepo.record2FAAttempt({
      userId,
      success: ok,
      failureReason: ok ? null : '2FA verification failed',
      ipAddress,
      userAgent,
    });

    await this.auditRepo.log({
      userId, sessionId: null,
      action: ok
        ? (method === 'recovery' ? 'auth.mfa.recovery.used' : 'auth.mfa.verified')
        : 'auth.mfa.failed',
      status: ok ? 'SUCCESS' : 'FAILURE', errorCode: ok ? null : 'AUTH_MFA_INVALID',
      actor: { type: 'user', id: userId },
      source: { platform: 'web', appVersion: '0.1.0' },
      correlationId: null, requestId: null, resource: null,
      metadata: ok ? { method } : {},
      ipAddress, userAgent,
    });

    // On repeated failures, invalidate the current code so it must be re-issued.
    if (!ok) {
      const recentFailures = await this.attemptRepo.countRecent2FAFailures(
        userId,
        TWO_FA_FAILURE_WINDOW_MS
      );
      if (recentFailures >= MAX_2FA_FAILURES) {
        await this.tokenRepo.invalidateAll(userId, 'two_factor');
      }
    }

    return ok;
  }
}

/**
 * Derives a numeric 6-digit code from the raw token bytes.
 */
function formatCode(raw: string): string {
  // Use the raw hex bytes to derive a stable numeric code.
  const digest = crypto.createHash('sha256').update(raw).digest();
  const numeric = digest.readUInt32BE(0) % 1_000_000;
  return numeric.toString().padStart(CODE_LENGTH, '0');
}
