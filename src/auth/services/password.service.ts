import { ObjectId } from 'mongodb';
import { getUsersCollection } from '@/database';
import { UserRepository } from '../repositories/user.repository';
import { PasswordHistoryRepository } from '../repositories/password-history.repository';
import { PasswordPolicyRepository } from '../repositories/password-policy.repository';
import { VerificationTokenRepository } from '../repositories/verification-token.repository';
import { AuditLogRepository } from '../repositories/audit-log.repository';
import { LoginAttemptRepository } from '../repositories/login-attempt.repository';
import { AlertingService } from './alerting.service';
import { getClientIp } from '../lib/request';
import { hashPassword, verifyPassword } from '../crypto/password';
import {
  buildPasswordSchema,
  passwordChangeSchema,
  DEFAULT_PASSWORD_POLICY,
} from '../validation/password-policy';
import { sendMail } from './mailer';
import { getEnv } from '../config/env';
import { hashToken } from '../crypto/token';
import { SessionRepository } from '../repositories/session.repository';

const RESET_TTL_MS = 30 * 60 * 1000; // 30 minutes

/**
 * Password lifecycle: change (authenticated), reset (email link), history +
 * reuse prevention, and expiry enforcement.
 */
export class PasswordService {
  private userRepo = new UserRepository();
  private historyRepo = new PasswordHistoryRepository();
  private policyRepo = new PasswordPolicyRepository();
  private tokenRepo = new VerificationTokenRepository();
  private auditRepo = new AuditLogRepository();
  private loginAttemptRepo = new LoginAttemptRepository();
  private alertingService = new AlertingService();

  async changePassword(
    userId: ObjectId,
    currentPassword: string,
    newPassword: string,
    currentSessionId?: string
  ): Promise<void> {
    const policy = await this.policyRepo.getActivePolicy();
    const parsed = buildPasswordSchema(policy).safeParse(newPassword);
    if (!parsed.success) {
      throw new Error(parsed.error.issues[0]?.message ?? 'Password does not meet policy.');
    }

    const user = await this.userRepo.findById(userId);
    if (!user || !user.password?.hash) {
      throw new Error('No password set for this account.');
    }

    const ok = await verifyPassword(user.password.hash, currentPassword);
    if (!ok) {
      await this.auditRepo.log({
        userId, sessionId: null, action: 'auth.password.change.failure',
        status: 'FAILURE', errorCode: 'AUTH_INVALID_CREDENTIALS',
        actor: { type: 'user', id: userId },
        source: { platform: 'web', appVersion: '0.1.0' },
        correlationId: null, requestId: null, resource: null,
        metadata: { reason: 'current password mismatch' }, ipAddress: null, userAgent: null,
      });
      throw new Error('Current password is incorrect.');
    }

    await this.rejectIfReused(userId, newPassword, policy.historyCount);

    const hash = await hashPassword(newPassword);
    const usersColl = await getUsersCollection();
    await usersColl.updateOne(
      { _id: userId },
      {
        $set: {
          password: { hash, algorithm: 'argon2id' as const },
          passwordChangedAt: new Date(),
          'security.forcePasswordChange': false,
          'security.accountSecurityVersion': (user.security.accountSecurityVersion ?? 1) + 1,
          updatedAt: new Date(),
        },
      }
    );

    await this.historyRepo.record(userId, hash, 'argon2id', policy.historyCount);
    // Revoke every OTHER active session so a stolen session is ended on password change.
    await new SessionRepository().revokeAllUserSessionsExcept(
      userId,
      currentSessionId ? new ObjectId(currentSessionId) : null,
      'user'
    );
    await this.tokenRepo.invalidateAll(userId, 'password_reset');

    await this.auditRepo.log({
      userId, sessionId: null, action: 'auth.password.change.success',
      status: 'SUCCESS', errorCode: null,
      actor: { type: 'user', id: userId },
      source: { platform: 'web', appVersion: '0.1.0' },
      correlationId: null, requestId: null, resource: null,
      metadata: { reason: 'user initiated' }, ipAddress: null, userAgent: null,
    });
  }

  async resetPassword(token: string, newPassword: string): Promise<void> {
    const policy = await this.policyRepo.getActivePolicy();
    const parsed = buildPasswordSchema(policy).safeParse(newPassword);
    if (!parsed.success) {
      throw new Error(parsed.error.issues[0]?.message ?? 'Password does not meet policy.');
    }

    const redeemed = await this.tokenRepo.redeem(hashToken(token));
    if (!redeemed || redeemed.userId === null) {
      throw new Error('This password reset link is invalid or has expired.');
    }

    const userId = redeemed.userId;
    await this.rejectIfReused(userId, newPassword, policy.historyCount);

    const hash = await hashPassword(newPassword);
    const usersColl = await getUsersCollection();
    await usersColl.updateOne(
      { _id: userId },
      {
        $set: {
          password: { hash, algorithm: 'argon2id' as const },
          passwordChangedAt: new Date(),
          'security.forcePasswordChange': false,
          'security.lockedUntil': null,
          updatedAt: new Date(),
        },
      }
    );

    await this.historyRepo.record(userId, hash, 'argon2id', policy.historyCount);
    await new SessionRepository().revokeAllUserSessionsExcept(userId, null, 'user');
    await this.tokenRepo.invalidateAll(userId, 'password_reset');

    // Confirmation email (best-effort) so the user knows the reset succeeded.
    const confirmEmail = await this.userRepo.findPrimaryEmail(userId);
    if (confirmEmail) {
      await sendMail({
        to: confirmEmail,
        subject: 'CWS Admin — Password Changed',
        text:
          'Your account password was successfully reset.\n\n' +
          'If this was not you, contact an administrator immediately.',
      }).catch((err) => console.error('reset confirmation email failed:', err));
    }

    await this.auditRepo.log({
      userId, sessionId: null, action: 'auth.password.reset.success',
      status: 'SUCCESS', errorCode: null,
      actor: { type: 'user', id: userId },
      source: { platform: 'web', appVersion: '0.1.0' },
      correlationId: null, requestId: null, resource: null,
      metadata: { reason: 'email reset link' }, ipAddress: null, userAgent: null,
    });

    // Forward a `auth.password.reset.success` event to the security sink so a
    // reset the user did not initiate is watched, not just stored.
    await this.alertingService.alertPasswordResetSuccess(userId)
      .catch((err) => console.error('password-reset-success alert failed:', err));
  }

  async requestReset(email: string): Promise<void> {
    const normalized = email.trim().toLowerCase();

    // FIX-07: throttle reset requests per email to prevent email-bombing of any
    // address. The cap is applied BEFORE any token is minted or email sent, and
    // a record is written regardless (so repeated hits keep counting). The
    // generic "always success" response is preserved by the caller.
    const RESET_MAX_PER_WINDOW = 5;
    const RESET_WINDOW_MS = 15 * 60 * 1000;
    const ipAddress = await getClientIp();
    const recent = await this.loginAttemptRepo.countRecentResetRequests(
      normalized,
      RESET_WINDOW_MS
    );
    await this.loginAttemptRepo.recordResetRequest(normalized, ipAddress);
    if (recent >= RESET_MAX_PER_WINDOW) {
      // Throttled: do not mint a token or send an email. Return silently so the
      // caller still reports generic success (enumeration resistance preserved).
      return;
    }

    const user = await this.userRepo.findByEmail(email);
    const raw = user
      ? await this.tokenRepo.create(
          { userId: user._id, type: 'password_reset', payload: { email } },
          RESET_TTL_MS
        )
      : null;
    if (raw && user) {
      const env = getEnv();
      const link = `${env.APP_URL}/dashboard/reset-password?token=${raw}`;
      await sendMail({
        to: email,
        subject: 'CWS Admin — Password Reset',
        text: `A password reset was requested.\n\nReset your password (valid 30 minutes):\n${link}\n\nIf you did not request this, you can ignore this email.`,
      });
    }
  }

  async isExpired(userId: ObjectId): Promise<boolean> {
    const policy = await this.policyRepo.getActivePolicy();
    if (policy.expirationDays <= 0) return false;
    const user = await this.userRepo.findById(userId);
    if (!user?.passwordChangedAt) return false;
    const ageMs = Date.now() - user.passwordChangedAt.getTime();
    return ageMs > policy.expirationDays * 24 * 60 * 60 * 1000;
  }

  private async rejectIfReused(userId: ObjectId, newPassword: string, historyCount: number): Promise<void> {
    if (historyCount <= 0) return;
    const recent = await this.historyRepo.getRecent(userId, historyCount);
    for (const entry of recent) {
      if (await verifyPassword(entry.hash, newPassword)) {
        throw new Error(`You cannot reuse one of your last ${historyCount} passwords.`);
      }
    }
  }

  parseChange(raw: unknown) {
    return passwordChangeSchema.safeParse(raw);
  }

  async getPolicy() {
    try {
      return await this.policyRepo.getActivePolicy();
    } catch {
      return DEFAULT_PASSWORD_POLICY;
    }
  }
}
