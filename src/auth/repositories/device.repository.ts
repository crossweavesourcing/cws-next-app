import { ObjectId } from 'mongodb';
import { randomUUID } from 'node:crypto';
import { getDevicesCollection } from '@/database';
import type {
  DeviceDocument,
  DeviceType,
  Platform,
  TrustGrantedBy,
  BlockedBy,
} from '@/types/auth';
import type { DeviceLocation } from '@/types/auth/device.types';
import { SessionRepository } from './session.repository';
import { RefreshTokenRepository } from './refresh-token.repository';

/** Client-generated UUID v4 length (matches devices.schema.ts min/maxLength: 36). */
const DEVICE_ID_LENGTH = 36;

function isDeviceId(value: string | null | undefined): value is string {
  return typeof value === 'string' && value.length === DEVICE_ID_LENGTH;
}

function isDuplicateKeyError(error: unknown): error is { code: 11000 } {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    error.code === 11000
  );
}

/**
 * Data access for the `devices` collection (real device management).
 *
 * A "device" is a stable, long-lived identity anchored by a client-generated
 * UUID v4 stored in the `cws_device` cookie. `deviceId` is untrusted client
 * input — callers must validate it with `isValidDeviceId` before use and must
 * never authorize solely on it.
 */
export class DeviceRepository {
  /** Validates a raw device id (untrusted client input) before query use. */
  static isValidDeviceId(value: string | null | undefined): value is string {
    return isDeviceId(value);
  }

  /** Finds a device record for a user by its client device id. */
  async findByDeviceId(
    userId: ObjectId,
    deviceId: string
  ): Promise<DeviceDocument | null> {
    const coll = await getDevicesCollection();
    return coll.findOne({ userId, deviceId });
  }

  /** Finds a device record by id + user (ownership checks in Server Actions). */
  async findByIdForUser(
    deviceId: string,
    userId: ObjectId
  ): Promise<DeviceDocument | null> {
    const coll = await getDevicesCollection();
    return coll.findOne({ deviceId, userId });
  }

  /**
   * Finds a device record by its server-issued record id (`devices._id`) for a
   * user. This is the security-boundary lookup: the id comes from the
   * HMAC-verified `cws_device_token` cookie, so it cannot be client-chosen.
   * Blocking/trust decisions must prefer this over the client `deviceId` UUID.
   */
  async findByServerDeviceId(
    recordId: ObjectId,
    userId: ObjectId
  ): Promise<DeviceDocument | null> {
    const coll = await getDevicesCollection();
    return coll.findOne({ _id: recordId, userId });
  }

  /** Records activity for a known device (login count + last-seen fields). */
  async touchActivity(
    deviceId: string,
    userId: ObjectId,
    ipAddress: string | null,
    location: DeviceLocation | null
  ): Promise<void> {
    const coll = await getDevicesCollection();
    await coll.updateOne(
      { deviceId, userId },
      {
        $inc: { loginCount: 1 },
        $set: {
          lastSeenAt: new Date(),
          lastSeenIp: ipAddress,
          lastSeenLocation: location,
          updatedAt: new Date(),
        },
      }
    );
  }

  /**
   * Upserts a device on login. Returns whether this is the first time the user
   * has signed in from this device (drives new-device detection). Existing
   * records only refresh last-seen + classification hints; trust/block state is
   * preserved across logins. On insert the device starts `trusted: false`.
   *
   * Identity resolution:
   * - `serverDeviceId` (the `devices._id` from the HMAC-signed `cws_device_token`
   *   cookie) is the authoritative, unforgeable key. A record id is also bound
   *   to one user. If the browser presents a valid token belonging to a
   *   different user (for example, after switching accounts), a fresh record
   *   id is minted instead of attempting to reuse the globally unique `_id`.
   * - `clientDeviceId` (legacy client UUID v4) is stored only as a correlation
   *   hint for the device-management UI. When no server id exists (pre-rollout
   *   clients) it is used as the lookup key and a fresh `_id` is minted.
   * - If neither is present, a brand-new client UUID is generated for backward
   *   compatibility and a fresh `_id` minted.
   */
  async upsertOnLogin(params: {
    userId: ObjectId;
    serverDeviceId: ObjectId | null;
    clientDeviceId: string | null;
    type: DeviceType;
    platform: Platform | null;
    browser: string | null;
    operatingSystem: string | null;
    userAgent: string | null;
    ipAddress: string | null;
    location: DeviceLocation | null;
  }): Promise<{ isNew: boolean; doc: DeviceDocument | null }> {
    const coll = await getDevicesCollection();
    const now = new Date();

    // Resolve the lookup + the record id to use. `_id` is globally unique, so
    // do not include userId in this first lookup: doing so hides a record owned
    // by another account and makes the subsequent insert fail with E11000.
    const serverDeviceId = params.serverDeviceId;
    const clientDeviceId = params.clientDeviceId ?? randomUUID();
    // The correlation `deviceId` stored on the row (always a 36-char UUID v4 so
    // the jsonSchema `minLength/maxLength: 36` constraint keeps holding).
    let correlationId = clientDeviceId;

    const existingByServerId = serverDeviceId
      ? await coll.findOne({ _id: serverDeviceId })
      : null;
    const existing = existingByServerId?.userId.equals(params.userId)
      ? existingByServerId
      : serverDeviceId
        ? null
        : await coll.findOne({ userId: params.userId, deviceId: correlationId });
    if (existing) {
      await coll.updateOne(
        { _id: existing._id },
        {
          $set: {
            type: params.type,
            platform: params.platform,
            browser: params.browser,
            operatingSystem: params.operatingSystem,
            lastSeenAt: now,
            lastSeenIp: params.ipAddress,
            lastSeenLocation: params.location,
            updatedAt: now,
          },
        }
      );
      return {
        isNew: false,
        doc: { ...existing, lastSeenAt: now, lastSeenIp: params.ipAddress, lastSeenLocation: params.location },
      };
    }

    // A server token is scoped to the user that owns its row. Browsers can
    // legitimately switch accounts while retaining cookies, so rotate both
    // database identity fields when the presented row belongs to another user.
    // Also avoid reusing a legacy correlation UUID that is already covered by
    // the collection's global unique index (common after a device-token reset).
    let recordId = serverDeviceId ?? new ObjectId();
    if (existingByServerId) {
      recordId = new ObjectId();
      correlationId = randomUUID();
    } else if (await coll.findOne({ deviceId: correlationId })) {
      correlationId = randomUUID();
    }

    const doc: DeviceDocument = {
      _id: recordId,
      userId: params.userId,
      deviceId: correlationId,
      name: null,
      type: params.type,
      platform: params.platform,
      browser: params.browser,
      operatingSystem: params.operatingSystem,
      userAgent: params.userAgent,
      fingerprint: null,
      trusted: false,
      trustedAt: null,
      trustedUntil: null,
      trustGrantedBy: null,
      blocked: false,
      blockedAt: null,
      blockedBy: null,
      blockedReason: null,
      loginCount: 0,
      lastSeenAt: now,
      lastSeenIp: params.ipAddress,
      lastSeenLocation: params.location,
      firstSeenAt: now,
      firstSeenIp: params.ipAddress,
      createdAt: now,
      updatedAt: now,
    };

    try {
      await coll.insertOne(doc);
      return { isNew: true, doc };
    } catch (error) {
      if (!isDuplicateKeyError(error)) throw error;

      // Two login requests can resolve the same newly-issued token before
      // either inserts it. If the other request won, treat this request as an
      // activity update on that row rather than surfacing a duplicate-key
      // error. An id owned by another user must never be adopted.
      const raced = await coll.findOne({ _id: recordId });
      if (raced?.userId.equals(params.userId)) {
        await coll.updateOne(
          { _id: raced._id },
          {
            $set: {
              type: params.type,
              platform: params.platform,
              browser: params.browser,
              operatingSystem: params.operatingSystem,
              lastSeenAt: now,
              lastSeenIp: params.ipAddress,
              lastSeenLocation: params.location,
              updatedAt: now,
            },
          }
        );
        return {
          isNew: false,
          doc: {
            ...raced,
            lastSeenAt: now,
            lastSeenIp: params.ipAddress,
            lastSeenLocation: params.location,
          },
        };
      }

      // The conflicting key was either claimed by another account or was the
      // legacy globally-unique deviceId. Retry once with server-minted values;
      // random ObjectId/UUID collisions are negligibly unlikely, and a second
      // database error should surface normally instead of looping forever.
      const retryDoc: DeviceDocument = {
        ...doc,
        _id: new ObjectId(),
        deviceId: randomUUID(),
      };
      await coll.insertOne(retryDoc);
      return { isNew: true, doc: retryDoc };
    }
  }

  /** Lists a user's devices (newest first) for the device-management UI. */
  async listForUser(userId: ObjectId, limit = 20): Promise<DeviceDocument[]> {
    const coll = await getDevicesCollection();
    return coll.find({ userId }).sort({ lastSeenAt: -1 }).limit(limit).toArray();
  }

  /** Sets the trust state of a device (user or admin opt-in). */
  async setTrusted(
    deviceId: string,
    userId: ObjectId,
    trusted: boolean,
    by: TrustGrantedBy
  ): Promise<void> {
    const coll = await getDevicesCollection();
    await coll.updateOne(
      { deviceId, userId },
      {
        $set: {
          trusted,
          trustedAt: trusted ? new Date() : null,
          trustedUntil: null,
          trustGrantedBy: trusted ? by : null,
          updatedAt: new Date(),
        },
      }
    );
  }

  /**
   * Sets the blocked state of a device. A blocked device is rejected at login.
   *
   * FIX-13: when blocking (`blocked === true`), also revokes the device's
   * currently active sessions + their refresh families so the block takes effect
   * immediately (not only at the device's next login). This requires the
   * device's Mongo `_id`; callers pass it via `deviceObjectId`. When unblocking,
   * only the flag is cleared.
   *
   * SECURITY NOTE: blocking keys off the server-issued device record id
   * (`devices._id`, delivered via the HMAC-signed `cws_device_token` cookie),
   * not the client-chosen `cws_device` UUID. A client that clears the
   * `cws_device` cookie still cannot reuse the *blocked server record* — the
   * block lives on that record, not on a client string. Clearing cookies does
   * yield a brand-new server record (so the block is not a hard cryptographic
   * boundary), but re-login from the *same* issued token is still rejected.
   * Blocking is defense-in-depth layered on top of credential auth.
   */
  async setBlocked(
    deviceId: string,
    userId: ObjectId,
    blocked: boolean,
    by: BlockedBy,
    reason: string | null,
    deviceObjectId?: ObjectId
  ): Promise<void> {
    const coll = await getDevicesCollection();
    await coll.updateOne(
      { deviceId, userId },
      {
        $set: {
          blocked,
          blockedAt: blocked ? new Date() : null,
          blockedBy: blocked ? by : null,
          blockedReason: blocked ? reason : null,
          updatedAt: new Date(),
        },
      }
    );

    if (blocked && deviceObjectId) {
      const sessionRepo = new SessionRepository();
      const refreshRepo = new RefreshTokenRepository();
      // Revoke this device's active sessions now, and also revoke the refresh
      // families of those sessions (FIX-10's batch method) so the block ends the
      // device's current authenticated state immediately.
      const revokedSessionIds = await sessionRepo.revokeSessionsByDeviceId(
        deviceObjectId,
        userId,
        'user'
      );
      if (revokedSessionIds.length) {
        await refreshRepo.revokeBySessions(revokedSessionIds, 'device_blocked');
      }
    }
  }

  /** Renames a device (user-facing label only). */
  async setName(deviceId: string, userId: ObjectId, name: string | null): Promise<void> {
    const coll = await getDevicesCollection();
    await coll.updateOne(
      { deviceId, userId },
      { $set: { name: name ? name.slice(0, 120) : null, updatedAt: new Date() } }
    );
  }
}
