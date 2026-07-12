import type { ObjectId } from 'mongodb';
import type { DeviceType, Platform, TrustGrantedBy, BlockedBy } from './shared.types';

// ─────────────────────────────────────────────────────────────────────────────
// Device Fingerprint
// Passive signals only. Hashed entropy sources prevent PII storage.
// ─────────────────────────────────────────────────────────────────────────────

export interface DeviceFingerprint {
  // ── Display ──────────────────────────────────────────────────────────────
  readonly screenResolution: string | null;   // "1920x1080"
  readonly colorDepth:       number | null;   // bits
  readonly pixelRatio:       number | null;   // window.devicePixelRatio

  // ── Hardware signals ─────────────────────────────────────────────────────
  readonly hardwareConcurrency: number | null;  // logical CPU cores
  readonly deviceMemory:        number | null;  // RAM in GB (rounded by browser)
  readonly maxTouchPoints:      number | null;
  readonly touchSupport:        boolean | null;

  // ── Locale & time ────────────────────────────────────────────────────────
  readonly timezone:  string | null;  // IANA
  readonly language:  string | null;  // BCP 47, e.g. "en-US"
  readonly languages: string | null;  // comma-joined, e.g. "en-US,en,fr"

  // ── Browser capabilities ─────────────────────────────────────────────────
  readonly cookiesEnabled: boolean | null;
  readonly doNotTrack:     string | null;   // "1" | "0" | "unspecified"
  readonly platform:       string | null;   // navigator.platform

  // ── Hashed entropy sources ───────────────────────────────────────────────
  // SHA-256 hex digests only — NEVER store raw canvas data, font lists, etc.
  readonly canvasHash: string | null;  // canvas 2D rendering fingerprint
  readonly webglHash:  string | null;  // WebGL renderer + vendor string
  readonly audioHash:  string | null;  // AudioContext fingerprint
  readonly fontsHash:  string | null;  // detected font list fingerprint

  /**
   * Composite stability score — computed at registration.
   * Range: 0.0–1.0. Higher = fingerprint more stable across sessions.
   * Used for anomaly detection weighting.
   */
  readonly stabilityScore: number | null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Location snapshot (captured at lastSeenAt)
// ─────────────────────────────────────────────────────────────────────────────

export interface DeviceLocation {
  country: string | null;
  region:  string | null;
  city:    string | null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Document
// ─────────────────────────────────────────────────────────────────────────────

export interface DeviceDocument {
  readonly _id:    ObjectId;
  readonly userId: ObjectId;  // References users._id — immutable after creation

  /**
   * Client-generated UUID v4.
   * Stored in client secure storage (httpOnly cookie / Keychain / Keystore).
   * Stable across sessions for the same physical device.
   */
  readonly deviceId: string;

  /** User or admin assigned label, e.g. "Work MacBook". */
  name: string | null;

  // ── Classification ────────────────────────────────────────────────────────
  type:            DeviceType;
  platform:        Platform | null;
  browser:         string | null;
  operatingSystem: string | null;
  /** Raw User-Agent at first registration — never updated. */
  userAgent:       string | null;

  /** Passive fingerprint snapshot — hashed entropy only. */
  fingerprint: DeviceFingerprint | null;

  // ── Trust ─────────────────────────────────────────────────────────────────
  trusted:        boolean;
  trustedAt:      Date | null;
  /** null = trust does not expire. */
  trustedUntil:   Date | null;
  trustGrantedBy: TrustGrantedBy | null;

  // ── Blocking ──────────────────────────────────────────────────────────────
  blocked:       boolean;
  blockedAt:     Date | null;
  blockedBy:     BlockedBy | null;
  blockedReason: string | null;

  // ── Activity ──────────────────────────────────────────────────────────────
  /** Total successful logins from this device. */
  loginCount:       number;
  lastSeenAt:       Date;
  lastSeenIp:       string | null;
  lastSeenLocation: DeviceLocation | null;

  // ── Registration (immutable after insert) ─────────────────────────────────
  readonly firstSeenAt: Date;
  readonly firstSeenIp: string | null;

  readonly createdAt: Date;
  updatedAt:          Date;
}
