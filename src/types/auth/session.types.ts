import type { ObjectId } from 'mongodb';
import type { LoginMethod, Platform, RevokedBy } from './shared.types';

export interface SessionLocation {
  country: string | null;
  city:    string | null;
  region:  string | null;
}

export interface SessionDocument {
  readonly _id:    ObjectId;
  readonly userId: ObjectId;

  /**
   * References devices._id.
   * null for sessions created before device tracking was introduced.
   * All new sessions must reference a device.
   */
  deviceId: ObjectId | null;

  /**
   * Forward pointer to the last issued refresh token for this session.
   * Enables O(1) "is this the current token?" check.
   */
  latestRefreshTokenId: ObjectId | null;

  loginMethod: LoginMethod;

  // ── Device snapshot (captured at creation — never updated) ────────────────
  device:          string | null;
  platform:        Platform | null;
  browser:         string | null;
  operatingSystem: string | null;
  userAgent:       string | null;
  ipAddress:       string;
  location:        SessionLocation | null;

  // ── Activity ──────────────────────────────────────────────────────────────
  refreshCount:   number;
  lastRefreshAt:  Date | null;
  lastActivityAt: Date;

  /**
   * FIX-C2: timestamp of the last REAL login for this session lineage. Refresh
   * uses this to enforce an absolute "since last full auth" limit
   * (`REFRESH_TOKEN_TTL_MS`) independent of the rolling access-session TTL.
   * Set once at creation; NOT updated when the access token is merely refreshed.
   */
  lastFullAuthAt: Date | null;

  expiresAt:      Date;

  // ── Revocation ────────────────────────────────────────────────────────────
  revoked:       boolean;
  revokedBy:     RevokedBy | null;
  revokedReason: string | null;
  revokedAt:     Date | null;

  /**
   * FIX-14: snapshot of `user.security.accountSecurityVersion` at session
   * creation. `validateSession` invalidates the session if this no longer
   * matches the user's current version (e.g. after a password change / security
   * bump that may have missed revoking this session).
   */
  accountSecurityVersion: number | null;

  readonly createdAt: Date;
  updatedAt?: Date;
}
