import { ObjectId } from 'mongodb';
import { SessionRepository } from '../repositories/session.repository';
import { signSessionId, verifySessionSignature } from '../crypto/token';
import { getEnv } from '../config/env';
import type { SessionDocument, LoginMethod, Platform } from '@/types/auth';
import { getSessionsCollection } from '@/database';

export class SessionService {
  private sessionRepo = new SessionRepository();
  private readonly SESSION_DURATION_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

  /**
   * Creates a new session in the database and returns the signed cookie string.
   */
  async createSession(
    userId: ObjectId,
    ipAddress: string,
    userAgent: string | null,
    loginMethod: LoginMethod
  ): Promise<{ sessionId: string; cookie: string }> {
    const env = getEnv();
    const { platform, browser, operatingSystem } = this.parseUserAgent(userAgent);
    const expiresAt = new Date(Date.now() + this.SESSION_DURATION_MS);

    const sessionDoc = await this.sessionRepo.createSession({
      userId,
      deviceId: null, // Defer to device fingerprint flow if configured later
      latestRefreshTokenId: null,
      loginMethod,
      device: browser, // Storing browser name as device identifier fallback
      platform,
      browser,
      operatingSystem,
      userAgent,
      ipAddress,
      location: null, // IP geo-lookup can be wired here in future phases
      refreshCount: 0,
      lastRefreshAt: null,
      lastActivityAt: new Date(),
      expiresAt,
      revoked: false,
      revokedBy: null,
      revokedReason: null,
      revokedAt: null,
    });

    const sessionIdStr = sessionDoc._id.toString();
    const cookieValue = signSessionId(sessionIdStr, env.SESSION_SECRET);

    return {
      sessionId: sessionIdStr,
      cookie: cookieValue,
    };
  }

  /**
   * Validates a signed session cookie.
   * If valid, updates the session's last activity timestamp in the background.
   */
  async validateSession(cookieValue: string): Promise<SessionDocument | null> {
    const env = getEnv();
    const sessionIdStr = verifySessionSignature(cookieValue, env.SESSION_SECRET);
    if (!sessionIdStr) {
      return null;
    }

    let sessionId: ObjectId;
    try {
      sessionId = new ObjectId(sessionIdStr);
    } catch {
      return null;
    }

    const session = await this.sessionRepo.findById(sessionId);
    if (!session || session.revoked || session.expiresAt.getTime() <= Date.now()) {
      return null;
    }

    // Fire-and-forget background update to avoid blocking critical path
    this.updateLastActivity(sessionId).catch((err) =>
      console.error('Background lastActivityAt update failed:', err)
    );

    return session;
  }

  /**
   * Invalidates a session by its document ID.
   */
  async terminateSession(sessionId: ObjectId): Promise<void> {
    await this.sessionRepo.revokeSession(sessionId, 'user', 'Explicit session termination (logout)');
  }

  /**
   * Background task to keep last activity timestamps fresh.
   */
  private async updateLastActivity(sessionId: ObjectId): Promise<void> {
    const sessionsColl = await getSessionsCollection();
    await sessionsColl.updateOne(
      { _id: sessionId },
      { $set: { lastActivityAt: new Date() } }
    );
  }

  /**
   * Lightweight user agent parser.
   */
  private parseUserAgent(uaString: string | null) {
    if (!uaString) {
      return { platform: 'web' as Platform, browser: 'unknown', operatingSystem: 'unknown' };
    }
    const ua = uaString.toLowerCase();

    let platform: Platform = 'web';
    if (/mobile|android|iphone|ipad|phone/.test(ua)) {
      platform = 'mobile';
    } else if (/windows|macintosh|linux/.test(ua)) {
      platform = 'desktop';
    }

    let browser = 'unknown';
    if (ua.includes('chrome')) browser = 'Chrome';
    else if (ua.includes('safari')) browser = 'Safari';
    else if (ua.includes('firefox')) browser = 'Firefox';
    else if (ua.includes('edge')) browser = 'Edge';

    let operatingSystem = 'unknown';
    if (ua.includes('windows')) operatingSystem = 'Windows';
    else if (ua.includes('macintosh') || ua.includes('mac os')) operatingSystem = 'macOS';
    else if (ua.includes('iphone') || ua.includes('ipad')) operatingSystem = 'iOS';
    else if (ua.includes('android')) operatingSystem = 'Android';
    else if (ua.includes('linux')) operatingSystem = 'Linux';

    return { platform, browser, operatingSystem };
  }
}
