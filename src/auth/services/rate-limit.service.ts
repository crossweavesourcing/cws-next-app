import { LoginAttemptRepository } from '../repositories/login-attempt.repository';
import { RateLimitError } from '../errors/auth-errors';

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

    // 2. IP rate limit check
    const ipFailures = await this.loginAttemptRepo.countRecentByIp(ip, this.IP_WINDOW_MS);
    if (ipFailures >= this.IP_MAX_ATTEMPTS) {
      throw new RateLimitError(
        this.IP_WINDOW_MS,
        `IP address ${ip} rate limited. ${ipFailures} recent failures.`
      );
    }

    // 3. Identifier rate limit check
    const idFailures = await this.loginAttemptRepo.countRecentByIdentifier(
      identifier,
      this.IDENTIFIER_WINDOW_MS
    );
    if (idFailures >= this.IDENTIFIER_MAX_ATTEMPTS) {
      throw new RateLimitError(
        this.IDENTIFIER_WINDOW_MS,
        `Account identifier rate limited. ${idFailures} recent failures.`
      );
    }
  }
}
