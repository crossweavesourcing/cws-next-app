import { ObjectId } from 'mongodb';
import { DeviceRepository } from '../repositories/device.repository';
import { AuditLogRepository } from '../repositories/audit-log.repository';
import { AlertingService } from './alerting.service';
import type { DeviceLocation } from '@/types/auth/device.types';
import type { Platform } from '@/types/auth';

/**
 * Device lifecycle: registration on login, new-device detection, and
 * suspicious-login (country-change) alerting.
 *
 * Detection is heuristic and ALERT-ONLY in P1 — it never blocks a login on its
 * own. Later phases may escalate to step-up (force 2FA) using the same signals.
 */
export class DeviceService {
  private deviceRepo = new DeviceRepository();
  private auditRepo = new AuditLogRepository();
  private alerting = new AlertingService();

  /**
   * Registers/refreshes the device bound to a login and returns whether this is
   * a brand-new device for the user (so callers can trigger step-up later).
   * `deviceObjectId` is the devices._id to store on the session.
   *
   * The device's stable identity is the server-issued record id
   * (`serverDeviceId`, the `devices._id` from the HMAC-signed `cws_device_token`
   * cookie). The legacy client UUID (`clientDeviceId`) is stored only as a
   * correlation hint for the device-management UI. When no server record id is
   * available (pre-rollout clients), the client UUID is used as the key.
   *
   * The returned `countryChanged` flag is a detection SIGNAL only — it does not
   * by itself block a login. Step-up enforcement is decided upstream (in
   * `SessionService`) so it can be centrally flag-gated and audit-logged.
   */
  async registerLogin(params: {
    userId: ObjectId;
    serverDeviceId: ObjectId | null;
    clientDeviceId: string | null;
    platform: Platform | null;
    browser: string | null;
    operatingSystem: string | null;
    userAgent: string | null;
    ipAddress: string | null;
    location: DeviceLocation | null;
  }): Promise<{ isNew: boolean; deviceObjectId: ObjectId | null; countryChanged: boolean }> {
    const type = params.platform === 'mobile' ? 'mobile' : 'desktop';
    // The correlation key shown in the UI / audits. Prefer the human-meaningful
    // client UUID; fall back to the server record id string when unavailable.
    const correlationKey = params.clientDeviceId ?? params.serverDeviceId?.toString() ?? 'unknown';

    // Country change is a *signal* surfaced to the caller (SessionService), which
    // decides step-up centrally. Hoisted so the return below can include it.
    let countryChanged = false;

    const { isNew, doc } = await this.deviceRepo.upsertOnLogin({
      userId: params.userId,
      serverDeviceId: params.serverDeviceId,
      clientDeviceId: params.clientDeviceId,
      type,
      platform: params.platform,
      browser: params.browser,
      operatingSystem: params.operatingSystem,
      userAgent: params.userAgent,
      ipAddress: params.ipAddress,
      location: params.location,
    });

    if (isNew) {
      await this.auditRepo.log({
        userId: params.userId,
        sessionId: null,
        action: 'auth.login.new_device',
        status: 'SUCCESS',
        errorCode: null,
        actor: { type: 'user', id: params.userId },
        source: { platform: 'web', appVersion: '0.1.0' },
        correlationId: null,
        requestId: null,
        resource: { type: 'device', id: correlationKey },
        metadata: { platform: params.platform, browser: params.browser, os: params.operatingSystem },
        ipAddress: params.ipAddress,
        userAgent: params.userAgent,
      });
      await this.alerting.alertNewDevice(params.userId, correlationKey, params.ipAddress, params.userAgent);
    } else if (doc) {
      // Suspicious-login heuristic: known device, but country changed since last seen.
      const prev = doc.lastSeenLocation?.country;
      const now = params.location?.country;
      // A *resolvable* country change (both present, both differ) is the signal.
      // `null` current country means the lookup was unavailable — we must NOT treat
      // "unknown vs known" as a change or we would false-positive on every lookup
      // blip. Step-up (upstream) only fires when we actually know the new country.
      countryChanged = Boolean(prev && now && prev !== now);
      // Inside this branch `prev` and `now` are both non-null (guaranteed by the
      // boolean above), but TS can't narrow through the flag, so capture locals.
      const prevCountry = prev ?? '';
      const currCountry = now ?? '';
      if (countryChanged) {
        await this.auditRepo.log({
          userId: params.userId,
          sessionId: null,
          action: 'auth.login.suspicious',
          status: 'WARNING',
          errorCode: 'AUTH_SUSPICIOUS_LOCATION',
          actor: { type: 'user', id: params.userId },
          source: { platform: 'web', appVersion: '0.1.0' },
          correlationId: null,
          requestId: null,
          resource: { type: 'device', id: correlationKey },
          metadata: { previousCountry: prevCountry, currentCountry: currCountry },
          ipAddress: params.ipAddress,
          userAgent: params.userAgent,
        });
        await this.alerting.alertSuspiciousLocation(params.userId, prevCountry, currCountry, params.ipAddress);
      }
    }

    return { isNew, deviceObjectId: doc?._id ?? null, countryChanged };
  }
}
