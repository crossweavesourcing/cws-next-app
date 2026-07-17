import { ObjectId } from 'mongodb';
import { UserRepository } from '../repositories/user.repository';
import { LoginAttemptRepository } from '../repositories/login-attempt.repository';
import { AuditLogRepository } from '../repositories/audit-log.repository';
import { RateLimitService } from './rate-limit.service';
import { SessionService } from './session.service';
import { TwoFactorService } from './two-factor.service';
import { PasswordService } from './password.service';
import { AlertingService } from './alerting.service';
import { verifyPassword } from '../crypto/password';
import { DUMMY_HASH } from '../crypto/constants';
import { loginSchema } from '../validation/login.schema';
import { ensureDeviceId, setServerDeviceToken } from '../lib/device';
import {
  InvalidCredentialsError,
  AccountLockedError,
  AccountSuspendedError,
  AccountDeletedError,
  AccountDisabledError,
} from '../errors/auth-errors';
import type { UserDocument } from '@/types/auth';

function randomDelayMs(max = 50): number {
  return Math.floor(Math.random() * (max + 1));
}

export class LoginService {
  private userRepo = new UserRepository();
  private loginAttemptRepo = new LoginAttemptRepository();
  private auditLogRepo = new AuditLogRepository();
  private rateLimitService = new RateLimitService();
  private sessionService = new SessionService();
  private twoFactorService = new TwoFactorService();
  private passwordService = new PasswordService();
  private alertingService = new AlertingService();

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
  ): Promise<
    | { status: 'authenticated'; sessionId: string; sessionCookie: string; refreshToken: string; user: UserDocument; rememberMe: boolean }
    | { status: 'mfa_required'; userId: ObjectId; availableMethods: string[] }
    | { status: 'force_change'; userId: ObjectId }
    | { status: 'step_up'; userId: ObjectId }
  > {
    // 1. Validate incoming payload structure
    const parsed = loginSchema.safeParse(payload);
    if (!parsed.success) {
      throw new InvalidCredentialsError('Input validation failed');
    }

    const { email, password, rememberMe } = parsed.data;

    // 2. Perform brute force check
    await this.rateLimitService.checkRateLimit(ipAddress, email);

    // 3. Resolve user by email
    const user = await this.userRepo.findByEmail(email);

    if (!user) {
      // FIX-08: timing side-channel mitigation. A known-user path runs a full
      // Argon2 verify (slow); the unknown-user fast path used to throw early.
      // Run a dummy verify against a precomputed hash and add a small randomized
      // delay so unknown-email and wrong-password responses take similar time.
      await verifyPassword(DUMMY_HASH, password);
      await new Promise((r) => setTimeout(r, randomDelayMs()));
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
      // H-5 fix: atomically increment the failed-login counter AND read the
      // updated security state in a single conditional write. The predicate
      // `'security.failedLoginAttempts': { $lt: THRESHOLD }` means the increment
      // only applies while still below the threshold, and the returned doc is the
      // authoritative post-increment count — no separate `findById` reload, so
      // concurrent failures cannot interleave and miscount (delaying lockout).
      const updatedUser = await this.userRepo.incrementFailedAndGet(
        userId,
        this.LOCKOUT_THRESHOLD
      );

      // Guards against a null return (doc already at/above threshold — another
      // concurrent failure already locked it) and any missing counter.
      const failedCount = updatedUser?.security.failedLoginAttempts ?? this.LOCKOUT_THRESHOLD;

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

    // 8b. MFA step-up logic.
    if (user.security?.mfaEnabled) {
      const availableMethods: string[] = [];
      if (user.security?.webAuthnEnabled) availableMethods.push('webauthn');
      if (user.security?.totpEnabled) availableMethods.push('totp');
      availableMethods.push('email'); // Email fallback is always available

      // Only send the email code proactively if it is the ONLY method available.
      // If they have TOTP/WebAuthn, sending an email immediately creates noise.
      if (availableMethods.length === 1 && availableMethods[0] === 'email') {
        await this.twoFactorService.sendCode(userId);
      }
      return { status: 'mfa_required', userId, availableMethods };
    }

    // 8c. Enforce password expiry policy. If the password is older than the
    // configured lifetime, force a change before granting access.
    if (await this.passwordService.isExpired(userId)) {
      await this.userRepo.forcePasswordChange(userId);
      return { status: 'force_change', userId };
    }

    return this.issueSession(userId, email, ipAddress, userAgent, 'password', rememberMe);
  }

  /**
   * Creates the session + refresh token, records attempt + audit, and returns
   * the authenticated result.
   */
  private async issueSession(
    userId: ObjectId,
    email: string,
    ipAddress: string,
    userAgent: string | null,
    loginMethod: 'password' | 'google',
    rememberMe: boolean = false
  ): Promise<
    | { status: 'authenticated'; sessionId: string; sessionCookie: string; refreshToken: string; user: UserDocument; rememberMe: boolean }
    | { status: 'step_up'; userId: ObjectId }
  > {
    // 9. Generate active user session (+ first refresh token)
    const device = await ensureDeviceId();
    const result = await this.sessionService.createSession(
      userId,
      ipAddress,
      userAgent,
      loginMethod,
      device
    );

    // Step-up path (Item 9): the session was created but immediately revoked
    // pending email 2FA. No cookies are issued yet — the caller sets a signed
    // `cws_stepup_pending` cookie and redirects to /dashboard/verify-2fa.
    if (result.status === 'step_up') {
      return { status: 'step_up', userId };
    }

    const { sessionId, sessionCookie, refreshToken, deviceObjectId } = result;

    // Persist the server-issued device record id on the client so the session
    // is bound to a server token (not the client-chosen UUID). On a brand-new
    // device the record id was minted in ensureDeviceId; on a returning device
    // it was verified from the existing signed token.
    if (deviceObjectId) {
      await setServerDeviceToken(deviceObjectId);
    }

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
      metadata: { loginMethod },
      ipAddress,
      userAgent,
    });

    const user = await this.userRepo.findById(userId);
    return { status: 'authenticated', sessionId, sessionCookie, refreshToken, user: user!, rememberMe };
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

    // Forward to the security sink (reuse/aggregation into failure spikes).
    await this.alertingService.recordFailure({ identifier: email, userId, ipAddress, reason });
  }
}
