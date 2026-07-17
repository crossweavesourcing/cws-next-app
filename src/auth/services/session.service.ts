import { ObjectId } from 'mongodb';
import { SessionRepository } from '../repositories/session.repository';
import { RefreshTokenRepository } from '../repositories/refresh-token.repository';
import { UserRepository } from '../repositories/user.repository';
import { DeviceRepository } from '../repositories/device.repository';
import { signSessionId, verifySessionSignature, generateRefreshToken } from '../crypto/token';
import { getEnv } from '../config/env';
import { AuditLogRepository } from '../repositories/audit-log.repository';
import { DeviceService } from './device.service';
import { AlertingService } from './alerting.service';
import { lookupGeo } from '../lib/geoip';
import type { SessionDocument, LoginMethod, Platform, RefreshTokenDocument } from '@/types/auth';
import type { DeviceLocation } from '@/types/auth/device.types';
import { after } from 'next/server';
import { verifyServerDeviceToken } from '../lib/device';
import type { DeviceIdentity } from '@/auth/lib/device';
import { getSessionsCollection } from '@/database';

/** Coalesce last-activity writes to at most once per this interval. */
const ACTIVITY_WRITE_INTERVAL_MS = 60 * 1000;

export class SessionService {
  private sessionRepo = new SessionRepository();
  private refreshTokenRepo = new RefreshTokenRepository();
  private userRepo = new UserRepository();
  private deviceRepo = new DeviceRepository();
  private deviceService = new DeviceService();
  private alertingService = new AlertingService();
  private auditRepo = new AuditLogRepository();

  /**
   * Creates a new session AND its first refresh token.
   * Returns the signed session cookie value and a freshly minted opaque refresh token.
   * Only the refresh token's SHA-256 hash is persisted.
   *
   * `device` is the resolved device identity for the request. The security
   * boundary (`serverDeviceId`, the HMAC-verified `devices._id` from the
   * `cws_device_token` cookie) drives blocking; the legacy client UUID
   * (`clientDeviceId`) is kept only as a correlation hint and is NEVER
   * authorized on. Rejects logins from explicitly blocked devices.
   */
  async createSession(
    userId: ObjectId,
    ipAddress: string,
    userAgent: string | null,
    loginMethod: LoginMethod,
    device: DeviceIdentity | null
  ): Promise<
    | { status: 'authenticated'; sessionId: string; sessionCookie: string; refreshToken: string; deviceObjectId: ObjectId | null }
    | { status: 'step_up'; userId: ObjectId; sessionCookie: undefined; refreshToken: undefined; deviceObjectId: ObjectId | null }
  > {
    const env = getEnv();

    // Block check: a user may not authenticate from a device they blocked.
    // Prefer the server-issued record id (cannot be client-chosen). Fall back
    // to the legacy client `deviceId` UUID only for backward-compat rollout
    // where a server token has not yet been issued (correlation-only).
    const serverDeviceId = device?.serverDeviceId ?? null;
    const clientDeviceId = device?.clientDeviceId ?? null;
    if (serverDeviceId) {
      const serverDevice = await this.deviceRepo.findByServerDeviceId(serverDeviceId, userId);
      
      if (serverDevice && clientDeviceId && serverDevice.deviceId !== clientDeviceId) {
        throw new Error('Device identity mismatch. Please clear cookies and try again.');
      }

      if (serverDevice?.blocked) {
        throw new Error('This device has been blocked. Contact an administrator.');
      }
    } else if (clientDeviceId && DeviceRepository.isValidDeviceId(clientDeviceId)) {
      const legacyDevice = await this.deviceRepo.findByIdForUser(clientDeviceId, userId);
      if (legacyDevice?.blocked) {
        throw new Error('This device has been blocked. Contact an administrator.');
      }
    }

    // Enforce a concurrent-session cap: revoke oldest active sessions beyond it.
    await this.enforceConcurrentSessionLimit(userId, 5);
    const { platform, browser, operatingSystem } = this.parseUserAgent(userAgent);
    const now = Date.now();
    const expiresAt = new Date(now + env.ACCESS_SESSION_TTL_MS);

    // Register/refresh the bound device FIRST so the session can reference the
    // device's Mongo _id (SessionDocument.deviceId is ObjectId | null). New-device
    // / suspicious-login detection + alerting fire here.
    //
    // The server-issued record id (`serverDeviceId`) is the device's `devices._id`
    // — it cannot be client-chosen. The legacy client UUID (`clientDeviceId`) is
    // persisted only as a correlation hint (e.g. device management UI label).
    let deviceObjectId: ObjectId | null = null;
    let stepUpRequired = false; // set when device/geo signals warrant step-up 2FA
    // Resolved geo snapshot for this login (or null if the lookup is unavailable).
    // Hoisted so the session doc can persist the same geo the device saw.
    let resolvedLocation: DeviceLocation = { country: null, region: null, city: null };
    if (serverDeviceId || (clientDeviceId && DeviceRepository.isValidDeviceId(clientDeviceId))) {
      resolvedLocation = await this.coarseLocation(ipAddress);
      const result = await this.deviceService
        .registerLogin({
          userId,
          serverDeviceId,
          clientDeviceId,
          platform,
          browser,
          operatingSystem,
          userAgent,
          ipAddress,
          location: resolvedLocation,
        })
        .catch((err) => {
          console.error('device registration failed:', err);
          return { isNew: false, deviceObjectId: null, countryChanged: false };
        });
      deviceObjectId = result.deviceObjectId;

      // Evaluate step-up (flag-gated). This may set `stepUpRequired` and, when
      // triggered, emit its own audit/alert — it MUST NOT block the request if
      // the flag is off or if evaluation fails (fail open to no step-up).
      stepUpRequired = await this.evaluateStepUp({
        userId,
        ipAddress,
        deviceObjectId,
        isNewDevice: result.isNew,
        countryChanged: result.countryChanged,
        newCountry: resolvedLocation.country,
      }).catch((err) => {
        console.error('step-up evaluation failed (fail open):', err);
        return false;
      });
    }

    // FIX-14: snapshot the user's current account security version so a later
    // bump (password change / security event) can invalidate this session even
    // if its revocation was missed.
    const snapshotUser = await this.userRepo.findById(userId);
    const accountSecurityVersion = snapshotUser?.security?.accountSecurityVersion ?? null;

    const sessionDoc = await this.sessionRepo.createSession({
      userId,
      deviceId: deviceObjectId,
      latestRefreshTokenId: null,
      loginMethod,
      device: browser, // Storing browser name as device identifier fallback
      platform,
      browser,
      operatingSystem,
      userAgent,
      ipAddress,
      location: resolvedLocation, // resolved geo snapshot (or null)
      refreshCount: 0,
      lastRefreshAt: null,
      lastActivityAt: new Date(now),
      // FIX-C2: anchor the refresh absolute-limit clock to the moment of real login.
      lastFullAuthAt: new Date(now),
      expiresAt,
      revoked: false,
      revokedBy: null,
      revokedReason: null,
      revokedAt: null,
      accountSecurityVersion,
    });

    // Mint and persist the first refresh token in the rotation chain.
    const { token, tokenHash } = generateRefreshToken();
    const refreshDoc = await this.refreshTokenRepo.create({
      sessionId: sessionDoc._id,
      userId,
      tokenHash,
      rotationNumber: 0,
      rotatedFrom: null,
      replacedBy: null,
      reuseDetected: false,
      revoked: false,
      revokedAt: null,
      revokedReason: null,
      lastUsedAt: null,
      lastUsedIp: null,
      lastUsedUserAgent: null,
      expiresAt: new Date(now + env.REFRESH_TOKEN_TTL_MS),
    });

    // Point the session at the latest refresh token (O(1) current-token check).
    await this.sessionRepo.setLatestRefreshToken(sessionDoc._id, refreshDoc._id);

    // ── Step-up gate (Item 9) ────────────────────────────────────────────────
    // The session + refresh token already exist (so we can re-bind the same
    // device on the eventual 2FA success), but they are NOT usable until the user
    // completes email 2FA. We immediately revoke the "created" tokens and return a
    // `step_up` result carrying the userId. The caller sets a signed
    // `cws_stepup_pending` cookie (verified in verify2faAction) and redirects to
    // /dashboard/verify-2fa. This path is reached ONLY when STEP_UP_ENABLED is
    // true (see evaluateStepUp) — otherwise stepUpRequired is always false and the
    // normal authenticated result below is returned.
    if (stepUpRequired) {
      await this.sessionRepo.revokeSession(
        sessionDoc._id,
        'system',
        'Step-up 2FA required (new device or country change)'
      );
      await this.refreshTokenRepo.revokeBySession(
        sessionDoc._id,
        'step_up_pending'
      );
      return { status: 'step_up', userId, sessionCookie: undefined, refreshToken: undefined, deviceObjectId };
    }

    const sessionIdStr = sessionDoc._id.toString();
    const sessionCookie = signSessionId(sessionIdStr, env.SESSION_SECRET);

    return { status: 'authenticated', sessionId: sessionIdStr, sessionCookie, refreshToken: token, deviceObjectId };
  }

  /**
   * Validates a signed session cookie, enforcing BOTH absolute expiry and idle timeout.
   * If valid, coalesces a last-activity update in the background.
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
    if (!session || session.revoked) {
      return null;
    }

    // Re-validate account lifecycle status on every use so an admin suspend /
    // deactivate / delete takes effect immediately, not only at next login.
    const user = await this.userRepo.findById(session.userId);
    if (!user || user.status !== 'active') {
      await this.sessionRepo.revokeSession(sessionId, 'system', 'Account status changed');
      return null;
    }

    // FIX-14: defense-in-depth — if the user's security version has advanced
    // since this session was issued (password change / security bump), treat the
    // session as revoked even if its explicit revocation was missed.
    const currentVersion = user.security?.accountSecurityVersion ?? null;
    if (
      session.accountSecurityVersion !== null &&
      currentVersion !== null &&
      session.accountSecurityVersion !== currentVersion
    ) {
      await this.sessionRepo.revokeSession(sessionId, 'system', 'Account security version changed');
      return null;
    }

    const now = Date.now();
    const absoluteExpired = session.expiresAt.getTime() <= now;
    const idleExpired =
      session.lastActivityAt.getTime() + env.IDLE_TIMEOUT_MS <= now;

    if (absoluteExpired || idleExpired) {
      // Revoke on expiry so the refresh family is also invalidated.
      await this.sessionRepo.revokeSession(sessionId, 'system', 'Session expired (absolute or idle)');
      return null;
    }

    after(() => {
      this.updateLastActivity(session).catch((err) =>
        console.error('Background lastActivityAt update failed:', err)
      );
    });

    return session;
  }

  /**
   * Invalidates a session by its document ID.
   */
  async terminateSession(sessionId: ObjectId): Promise<void> {
    await this.sessionRepo.revokeSession(sessionId, 'user', 'Explicit session termination (logout)');
  }

  /**
   * Returns a session by id (no expiry/revocation checks) for ownership checks.
   */
  async getSessionById(sessionId: ObjectId): Promise<SessionDocument | null> {
    return this.sessionRepo.findById(sessionId);
  }

  /**
   * Rotates a refresh token: validates the presented (hashed) token, issues a new
   * one, and chains the old → new. Returns null when the token is unknown/revoked
   * (caller treats this as a possible theft). When a token already flagged for
   * reuse is presented again, the whole session family is revoked.
   */
  async rotateRefreshToken(
    presentedTokenHash: string,
    ipAddress: string | null,
    userAgent: string | null,
    clientDeviceCookieValue: string | null = null
  ): Promise<
    | { session: SessionDocument; sessionCookie: string; refreshToken: string }
    | { expired: true }
    | null
  > {
    const env = getEnv();
    const existing = await this.refreshTokenRepo.findByHash(presentedTokenHash);
    if (!existing) {
      return null;
    }

    // A revoked token being replayed => likely theft. Revoke the entire session family.
    if (existing.revoked) {
      const firstReuse = !existing.reuseDetected;
      if (firstReuse) {
        await this.refreshTokenRepo.markReuseDetected(presentedTokenHash);
      }
      await this.sessionRepo.revokeSession(existing.sessionId, 'system', 'Refresh token reuse detected');
      await this.refreshTokenRepo.revokeBySession(existing.sessionId, 'reuse_detected');

      // Alert the user the first time a reuse is detected (possible token theft).
      if (firstReuse) {
        this.alertingService.alertReuseDetected(existing.userId, ipAddress).catch((err) =>
          console.error('reuse alert failed:', err)
        );
      }
      return null;
    }

    // FIX-C2: enforce the configured absolute + idle limits at refresh time, so a
    // 7-day refresh cookie can no longer mint a brand-new valid session after the
    // idle (IDLE_TIMEOUT_MS) or absolute (REFRESH_TOKEN_TTL_MS since last REAL
    // login) window has elapsed. Mirrors the validateSession expiry math.
    const sessionForExpiry = await this.sessionRepo.findById(existing.sessionId);
    if (sessionForExpiry && !sessionForExpiry.revoked) {
      const nowMs = Date.now();
      const idleExpired =
        sessionForExpiry.lastActivityAt.getTime() + env.IDLE_TIMEOUT_MS <= nowMs;
      const absoluteExpired =
        (sessionForExpiry.lastFullAuthAt?.getTime() ?? sessionForExpiry.createdAt.getTime()) +
          env.REFRESH_TOKEN_TTL_MS <=
        nowMs;

      if (idleExpired || absoluteExpired) {
        await this.sessionRepo.revokeSession(
          existing.sessionId,
          'system',
          'Refresh refused: session idle/absolute limit exceeded'
        );
        await this.refreshTokenRepo.revokeBySession(existing.sessionId, 'session_revoked');
        await new AuditLogRepository()
          .log({
            userId: existing.userId,
            sessionId: existing.sessionId,
            action: 'auth.refresh.expired',
            status: 'WARNING',
            errorCode: 'AUTH_REFRESH_EXPIRED',
            actor: { type: 'user', id: existing.userId },
            source: { platform: 'web', appVersion: '0.1.0' },
            correlationId: null,
            requestId: null,
            resource: { type: 'session', id: existing.sessionId.toString() },
            metadata: {
              reason: idleExpired ? 'idle_timeout' : 'absolute_timeout',
              idleExpired,
              absoluteExpired,
            },
            ipAddress,
            userAgent,
          })
          .catch((err) => console.error('refresh-expired audit log failed:', err));
        return { expired: true };
      }
    }

    const session = await this.sessionRepo.findById(existing.sessionId);
    if (!session || session.revoked) {
      // A token whose session is gone or already revoked is being replayed ->
      // possible theft. Flag reuse, but do not touch the (missing/ended) session.
      if (session?.revoked) {
        await this.refreshTokenRepo.markReuseDetected(presentedTokenHash);
      }
      return null;
    }

    // NEW: Device Binding Check
    if (clientDeviceCookieValue) {
      const resolvedServerDeviceId = verifyServerDeviceToken(clientDeviceCookieValue);
      if (session.deviceId && resolvedServerDeviceId && !session.deviceId.equals(resolvedServerDeviceId)) {
        await this.refreshTokenRepo.markReuseDetected(presentedTokenHash);
        await this.sessionRepo.revokeSession(existing.sessionId, 'system', 'Refresh token device mismatch (theft)');
        await this.refreshTokenRepo.revokeBySession(existing.sessionId, 'theft_detected');
        
        // Alert the user the first time a reuse is detected (possible token theft).
        this.alertingService.alertReuseDetected(existing.userId, ipAddress).catch((err) =>
          console.error('theft alert failed:', err)
        );
        return null;
      }
    }
    // NOTE: we intentionally do NOT reject here based on the rolling access
    // `expiresAt`. A client that refreshes within the FIX-C2 absolute/idle window
    // (anchored at `lastFullAuthAt` / lastActivityAt) is allowed to roll the
    // access session forward — otherwise the refresh design would be defeated.
    // The FIX-C2 gate above already refused anything past the 7d / idle limit.

    // Issue a new refresh token and chain it.
    // H-4 fix: the new token's id is generated up-front so we can run the
    // conditional `atomicReplace` BEFORE we commit the new token. Only the
    // caller that wins the atomic write (old token still `replacedBy: null`)
    // proceeds to mint + persist the new token; a loser gets `null` and is
    // routed down the reuse-revoke path, so two concurrent identical
    // presentations can never produce two live tokens.
    const { token, tokenHash } = generateRefreshToken();
    const now = Date.now();
    const newId = new ObjectId();

    const replaced = await this.refreshTokenRepo.atomicReplace(
      presentedTokenHash,
      newId,
      new Date(now)
    );

    if (!replaced) {
      // The presented token was already replaced/replacedBy set — i.e. a second
      // concurrent rotation (or outright replay). Treat as reuse: revoke the
      // whole session family and alert, exactly like the replay path above.
      const firstReuse = !existing.reuseDetected;
      if (firstReuse) {
        await this.refreshTokenRepo.markReuseDetected(presentedTokenHash);
      }
      await this.sessionRepo.revokeSession(existing.sessionId, 'system', 'Refresh token reuse detected (concurrent rotation)');
      await this.refreshTokenRepo.revokeBySession(existing.sessionId, 'reuse_detected');

      if (firstReuse) {
        this.alertingService.alertReuseDetected(existing.userId, ipAddress).catch((err) =>
          console.error('reuse alert failed:', err)
        );
      }
      return null;
    }

    const newDoc: RefreshTokenDocument = await this.refreshTokenRepo.create({
      sessionId: session._id,
      userId: session.userId,
      tokenHash,
      rotationNumber: existing.rotationNumber + 1,
      rotatedFrom: existing._id,
      replacedBy: null,
      reuseDetected: false,
      revoked: false,
      revokedAt: null,
      revokedReason: null,
      lastUsedAt: null,
      lastUsedIp: ipAddress,
      lastUsedUserAgent: userAgent,
      expiresAt: new Date(now + env.REFRESH_TOKEN_TTL_MS),
    }, newId);

    await this.sessionRepo.setLatestRefreshToken(session._id, newDoc._id);
    await this.sessionRepo.touchRefresh(session._id, now);

    // Roll the access-session window forward so an actively-refreshing client
    // survives past the original 15-min ACCESS_SESSION_TTL_MS mark. `expiresAt`
    // is recomputed as now + TTL (always <= lastFullAuthAt + REFRESH_TOKEN_TTL_MS
    // since the FIX-C2 absolute cap above already rejected anything older), and
    // `lastActivityAt` is refreshed so idle-timeout reflects real activity.
    const accessExpiresAt = new Date(now + env.ACCESS_SESSION_TTL_MS);
    const lastActivityAt = new Date(now);
    await this.sessionRepo.renewAccessSession(
      session._id,
      accessExpiresAt,
      lastActivityAt
    );

    const sessionCookie = signSessionId(session._id.toString(), env.SESSION_SECRET);

    // Reflect the rolled-forward window on the returned snapshot so callers see
    // the renewed access session (the DB write above has already persisted it).
    session.expiresAt = accessExpiresAt;
    session.lastActivityAt = lastActivityAt;

    return { session, sessionCookie, refreshToken: token };
  }

  /**
   * Revokes all refresh tokens for a session (logout / compromise response).
   */
  async revokeRefreshFamily(
    sessionId: ObjectId,
    reason: 'logout' | 'reuse_detected' | 'admin' | 'session_revoked' = 'logout'
  ): Promise<void> {
    await this.refreshTokenRepo.revokeBySession(sessionId, reason);
  }

  /**
   * Background task to keep last activity timestamps fresh (coalesced).
   */
  private async updateLastActivity(session: SessionDocument): Promise<void> {
    const sessionsColl = await getSessionsCollection();
    const now = Date.now();
    // Only write if more than the coalescing interval has elapsed since last write.
    if (now - session.lastActivityAt.getTime() < ACTIVITY_WRITE_INTERVAL_MS) {
      return;
    }
    await sessionsColl.updateOne(
      { _id: session._id },
      { $set: { lastActivityAt: new Date(now) } }
    );
  }

  /**
   * Keeps at most `maxActive` concurrent live sessions per user by revoking the
   * oldest active sessions (and their refresh families) before creating a new one.
   */
  private async enforceConcurrentSessionLimit(userId: ObjectId, maxActive: number): Promise<void> {
    const active = await this.sessionRepo.findActiveByUserId(userId);
    if (active.length <= maxActive) return;
    const overflow = active
      .sort((a, b) => a.lastActivityAt.getTime() - b.lastActivityAt.getTime())
      .slice(0, active.length - maxActive);

    // FIX-10: revoke the overflow sessions + their refresh families in batched
    // writes rather than N sequential queries, removing the drift where two
    // near-simultaneous logins could both pass the check and exceed the cap.
    const overflowIds = overflow.map((s) => s._id);
    if (overflowIds.length) {
      await this.sessionRepo.revokeManyByIds(overflowIds, 'system', 'Concurrent session limit exceeded');
      await this.refreshTokenRepo.revokeBySessions(overflowIds, 'session_revoked');
    }
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

  /**
   * Resolves a location snapshot for an IP using the pluggable geo-IP lookup
   * (Item 9). Now async (the lookup may hit a remote endpoint with a timeout).
   *
   * Behaviour:
   *   - Loopback / private / unroutable IPs → all-`null` (geo is moot).
   *   - When a lookup is configured and succeeds → real `country`/`region`/`city`.
   *   - When no lookup is configured, or the lookup fails/times out → falls back to
   *     `null` (fail OPEN). We deliberately keep `unknown-remote` ONLY as the
   *     offline fallback so a configured-but-empty result is never misread as a
   *     concrete country by the country-change heuristic.
   *
   * Never throws — any error in the lookup is swallowed by `lookupGeo` and yields
   * `null`, so the request path is never blocked by geo latency.
   */
  private async coarseLocation(ipAddress: string | null): Promise<DeviceLocation> {
    if (!ipAddress) return { country: null, region: null, city: null };

    const v4 = ipAddress.trim();
    const isLoopbackOrPrivate =
      v4 === '127.0.0.1' ||
      v4 === '::1' ||
      v4.startsWith('10.') ||
      v4.startsWith('192.168.') ||
      /^169\.254\./.test(v4) ||
      (v4.startsWith('172.') && /^172\.(1[6-9]|2\d|3[01])\./.test(v4));

    if (isLoopbackOrPrivate) {
      return { country: null, region: null, city: null };
    }

    // Pluggable geo-IP lookup (remote endpoint or offline DB). Fails open to null.
    const geo = await lookupGeo(ipAddress);
    if (geo.country || geo.region || geo.city) {
      return geo;
    }

    // No concrete geo available: fail open to null rather than asserting a bogus
    // "unknown-remote" country that could trip the country-change heuristic.
    return { country: null, region: null, city: null };
  }

  /**
   * Decides whether a freshly created session must be stepped-up (email 2FA)
   * before it becomes usable. Driven by `STEP_UP_ENABLED` (OFF by default).
   *
   * Triggers (either one):
   *   - `isNewDevice` — first sign-in from this device for the user, OR
   *   - `countryChanged` — known device but the resolved country differs from the
   *     last-seen country.
   *
   * When triggered we audit + alert and return true. When the flag is off (or the
   * lookup was unavailable so we cannot confidently assert a change) we return
   * false — NO step-up, normal login path. This keeps the feature strictly
   * opt-in behind a flag and fail-open.
   */
  private async evaluateStepUp(params: {
    userId: ObjectId;
    ipAddress: string | null;
    deviceObjectId: ObjectId | null;
    isNewDevice: boolean;
    countryChanged: boolean;
    newCountry: string | null;
  }): Promise<boolean> {
    // Feature flag: step-up is opt-in. Disabled → never block, alert-only stays.
    if (!getEnv().STEP_UP_ENABLED) return false;

    // Only step up on a *positive* signal: a new device, or a resolvable country
    // change. If the geo lookup was unavailable (newCountry === null) we cannot
    // assert a *change*, so we do not step up (avoid false positives during the
    // monitoring rollout).
    const triggered =
      params.isNewDevice || (params.countryChanged && Boolean(params.newCountry));
    if (!triggered) return false;

    const reason = params.isNewDevice ? 'new_device' : 'country_change';
    await this.auditRepo
      .log({
        userId: params.userId,
        sessionId: null,
        action: 'auth.login.stepup_required',
        status: 'WARNING',
        errorCode: 'AUTH_STEP_UP_REQUIRED',
        actor: { type: 'user', id: params.userId },
        source: { platform: 'web', appVersion: '0.1.0' },
        correlationId: null,
        requestId: null,
        resource: { type: 'device', id: params.deviceObjectId?.toString() ?? 'unknown' },
        metadata: { reason, newCountry: params.newCountry },
        ipAddress: params.ipAddress,
        userAgent: null,
      })
      .catch((err) => console.error('step-up audit failed:', err));

    await this.alertingService
      .recordFailure({
        identifier: params.userId.toString(),
        userId: params.userId,
        ipAddress: params.ipAddress,
        reason: `AUTH_STEP_UP_REQUIRED:${reason}`,
      })
      .catch((err) => console.error('step-up alert failed:', err));

    return true;
  }
}
