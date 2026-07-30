import { LoginAttemptRepository } from '../repositories/login-attempt.repository';
import { RateLimitError } from '../errors/auth-errors';
import { UNTRUSTED_IP_SENTINEL } from '../lib/ip';

export class RateLimitService {
  private loginAttemptRepo = new LoginAttemptRepository();

  // Brute-force parameters
  private readonly IP_WINDOW_MS = 15 * 60 * 1000; // 15 minutes
  private readonly IP_MAX_ATTEMPTS = 20;

  private readonly IDENTIFIER_WINDOW_MS = 15 * 60 * 1000; // 15 minutes
  private readonly IDENTIFIER_MAX_ATTEMPTS = 10;

  /**
   * Evaluates if a login attempt should be allowed or rate-limited.
   * Throws RateLimitError if blocked.
   */
  async checkRateLimit(ip: string, identifier: string): Promise<void> {
    // 1. Check if there's a current lockout date active in DB for this email
    const activeLockout = await this.loginAttemptRepo.getActiveLockout(identifier);
    if (activeLockout) {
      const waitTime = activeLockout.getTime() - Date.now();
      if (waitTime > 0) {
        throw new RateLimitError(waitTime, 'Attempt rejected due to active account lockout');
      }
    }

    // 2. IP rate limit check.
    // Defense-in-depth: when the client IP could not be resolved to a trustworthy
    // value it is the UNTRUSTED_IP_SENTINEL constant. Keying countRecentByIp on a
    // constant collapses every request into ONE global bucket, so ~20 cross-user
    // failures would lock out all logins platform-wide (availability DoS). Skip the
    // IP dimension entirely for the sentinel and rely on the per-identifier +
    // lockout checks below. (In production, env.ts fail-closes so the sentinel
    // should never occur; this guard also protects dev/misconfigured deployments.)
    if (ip !== UNTRUSTED_IP_SENTINEL) {
      const ipFailures = await this.loginAttemptRepo.countRecentByIp(ip, this.IP_WINDOW_MS);
      if (ipFailures >= this.IP_MAX_ATTEMPTS) {
        throw new RateLimitError(
          this.IP_WINDOW_MS,
          `IP address ${ip} rate limited. ${ipFailures} recent failures.`
        );
      }
    }

    // 3. Identifier rate limit check (Progressive Delay)
    const idFailures = await this.loginAttemptRepo.countRecentByIdentifier(
      identifier,
      this.IDENTIFIER_WINDOW_MS
    );
    
    // Allow the first 5 failures with no delay.
    // After 5 failures, enforce an exponentially increasing delay.
    if (idFailures >= 5) {
      // e.g. 6th failure = 2s, 7th = 4s, 8th = 8s, 10th = 32s
      const requiredDelayMs = Math.pow(2, idFailures - 5) * 1000;
      
      const msSinceLastFailure = await this.loginAttemptRepo.getTimeSinceLastFailure(identifier);
      
      if (msSinceLastFailure !== null && msSinceLastFailure < requiredDelayMs) {
        const waitTime = requiredDelayMs - msSinceLastFailure;
        throw new RateLimitError(
          waitTime,
          `Too many failed attempts. Please wait before trying again.`
        );
      }
    }
  }

  /**
   * Evaluates if a request should be allowed based purely on IP rate limits.
   * Throws RateLimitError if blocked.
   */
  async checkIpRateLimit(ip: string): Promise<void> {
    if (ip !== UNTRUSTED_IP_SENTINEL) {
      const ipFailures = await this.loginAttemptRepo.countRecentByIp(ip, this.IP_WINDOW_MS);
      if (ipFailures >= this.IP_MAX_ATTEMPTS) {
        throw new RateLimitError(
          this.IP_WINDOW_MS,
          `IP address ${ip} rate limited. ${ipFailures} recent failures.`
        );
      }
    }
  }

  /**
   * Records a generic failure for an IP (e.g. refresh token abuse).
   */
  async recordIpFailure(ip: string, userAgent: string | null): Promise<void> {
    if (ip !== UNTRUSTED_IP_SENTINEL) {
      await this.loginAttemptRepo.recordAttempt({
        userId: null,
        identifierType: 'EMAIL',
        identifier: '[ip_abuse]',
        ipAddress: ip,
        userAgent,
        device: null,
        success: false,
        failureReason: 'IP abuse detected',
        lockExpiresAt: null,
        correlationId: null,
        country: null,
        city: null,
      });
    }
  }
}
