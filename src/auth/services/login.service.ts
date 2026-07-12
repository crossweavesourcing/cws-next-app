import { ObjectId } from 'mongodb';
import { UserRepository } from '../repositories/user.repository';
import { LoginAttemptRepository } from '../repositories/login-attempt.repository';
import { AuditLogRepository } from '../repositories/audit-log.repository';
import { RateLimitService } from './rate-limit.service';
import { SessionService } from './session.service';
import { verifyPassword } from '../crypto/password';
import { loginSchema } from '../validation/login.schema';
import {
  InvalidCredentialsError,
  AccountLockedError,
  AccountSuspendedError,
  AccountDeletedError,
  AccountDisabledError,
} from '../errors/auth-errors';
import type { UserDocument } from '@/types/auth';

export class LoginService {
  private userRepo = new UserRepository();
  private loginAttemptRepo = new LoginAttemptRepository();
  private auditLogRepo = new AuditLogRepository();
  private rateLimitService = new RateLimitService();
  private sessionService = new SessionService();

  private readonly LOCKOUT_THRESHOLD = 5;
  private readonly LOCKOUT_DURATION_MS = 15 * 60 * 1000; // 15 minutes

  /**
   * Orchestrates login with email and password.
   * Performs rate limit checks, validations, credential verification, lockout updates,
   * audit logging, and session generation.
   */
  async loginWithPassword(
    payload: unknown,
    ipAddress: string,
    userAgent: string | null
  ): Promise<{ sessionId: string; cookie: string; user: UserDocument }> {
    // 1. Validate incoming payload structure
    const parsed = loginSchema.safeParse(payload);
    if (!parsed.success) {
      throw new InvalidCredentialsError('Input validation failed');
    }

    const { email, password } = parsed.data;

    // 2. Perform brute force check
    await this.rateLimitService.checkRateLimit(ipAddress, email);

    // 3. Resolve user by email
    const user = await this.userRepo.findByEmail(email);

    if (!user) {
      // Record failed attempt for unknown user
      await this.recordFailure(null, email, ipAddress, userAgent, 'User email not found');
      throw new InvalidCredentialsError('User record not found');
    }

    const userId = user._id;

    // 4. Verify account lifecycle status
    if (user.status === 'suspended') {
      await this.recordFailure(userId, email, ipAddress, userAgent, 'Account suspended');
      throw new AccountSuspendedError();
    }
    if (user.status === 'deleted') {
      await this.recordFailure(userId, email, ipAddress, userAgent, 'Account deleted');
      throw new AccountDeletedError();
    }
    if (user.status === 'inactive' || user.status === 'disabled') {
      await this.recordFailure(userId, email, ipAddress, userAgent, 'Account inactive/disabled');
      throw new AccountDisabledError();
    }

    // 5. Verify current lock status
    if (user.security.lockedUntil && user.security.lockedUntil.getTime() > Date.now()) {
      const waitTime = user.security.lockedUntil.getTime() - Date.now();
      await this.recordFailure(userId, email, ipAddress, userAgent, 'Attempt on locked account');
      throw new AccountLockedError(user.security.lockedUntil);
    }

    // 6. Verify user has a configured password
    if (!user.password || !user.password.hash) {
      await this.recordFailure(userId, email, ipAddress, userAgent, 'No password configured for user');
      throw new InvalidCredentialsError('User has no password set');
    }

    // 7. Verify credentials
    const isMatch = await verifyPassword(user.password.hash, password);

    if (!isMatch) {
      // Increment failed count in DB
      await this.userRepo.incrementFailedAttempts(userId);

      // Reload updated security state to check lockout threshold
      const updatedUser = await this.userRepo.findById(userId);
      const failedCount = updatedUser?.security.failedLoginAttempts || 0;

      let lockExpiresAt: Date | null = null;
      if (failedCount >= this.LOCKOUT_THRESHOLD) {
        lockExpiresAt = new Date(Date.now() + this.LOCKOUT_DURATION_MS);
        await this.userRepo.lockAccount(userId, lockExpiresAt);
        await this.recordFailure(userId, email, ipAddress, userAgent, 'Lockout triggered', lockExpiresAt);
        throw new AccountLockedError(lockExpiresAt, 'Lockout triggered on password mismatch');
      }

      await this.recordFailure(userId, email, ipAddress, userAgent, 'Password verification failed');
      throw new InvalidCredentialsError('Password verification failed');
    }

    // 8. Successful verification: Reset attempt counter
    await this.userRepo.resetFailedAttempts(userId);
    await this.userRepo.recordLastLogin(userId);

    // 9. Generate active user session
    const { sessionId, cookie } = await this.sessionService.createSession(
      userId,
      ipAddress,
      userAgent,
      'password'
    );

    // 10. Record successful login attempt
    await this.loginAttemptRepo.recordAttempt({
      userId,
      identifierType: 'EMAIL',
      identifier: email,
      ipAddress,
      userAgent,
      device: null,
      success: true,
      failureReason: null,
      lockExpiresAt: null,
      correlationId: null,
      country: null,
      city: null,
    });

    // 11. Write security audit log entry
    await this.auditLogRepo.log({
      userId,
      sessionId: new ObjectId(sessionId),
      action: 'auth.login.success',
      status: 'SUCCESS',
      errorCode: null,
      actor: { type: 'user', id: userId },
      source: { platform: 'web', appVersion: '0.1.0' },
      correlationId: null,
      requestId: null,
      resource: { type: 'session', id: sessionId },
      metadata: { loginMethod: 'password' },
      ipAddress,
      userAgent,
    });

    return { sessionId, cookie, user };
  }

  private async recordFailure(
    userId: ObjectId | null,
    email: string,
    ipAddress: string,
    userAgent: string | null,
    reason: string,
    lockExpiresAt: Date | null = null
  ): Promise<void> {
    // Save to login attempts
    await this.loginAttemptRepo.recordAttempt({
      userId,
      identifierType: 'EMAIL',
      identifier: email,
      ipAddress,
      userAgent,
      device: null,
      success: false,
      failureReason: reason,
      lockExpiresAt,
      correlationId: null,
      country: null,
      city: null,
    });

    // Save to audit log
    await this.auditLogRepo.log({
      userId,
      sessionId: null,
      action: 'auth.login.failure',
      status: 'FAILURE',
      errorCode: 'AUTH_INVALID_CREDENTIALS',
      actor: userId ? { type: 'user', id: userId } : null,
      source: { platform: 'web', appVersion: '0.1.0' },
      correlationId: null,
      requestId: null,
      resource: null,
      metadata: { reason, lockExpiresAt },
      ipAddress,
      userAgent,
    });
  }
}
