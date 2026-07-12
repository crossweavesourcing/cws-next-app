import type { ObjectId } from 'mongodb';
import type { AuditStatus, Platform } from './shared.types';

export type ActorType = 'user' | 'admin' | 'system';

export interface AuditActor {
  type: ActorType;
  id:   ObjectId | null;
}

export interface AuditSource {
  platform:   Platform | 'api' | null;
  appVersion: string | null;
}

export interface AuditResource {
  /** e.g. "session", "user", "device" */
  type: string | null;
  /** String representation of the resource _id */
  id:   string | null;
}

export interface AuditLogDocument {
  readonly _id:       ObjectId;
  userId:             ObjectId | null;
  sessionId:          ObjectId | null;

  /**
   * Dot-namespaced event identifier.
   * Convention: <domain>.<sub-domain>.<event>
   * Examples: "auth.login.success", "auth.device.blocked", "auth.token.reuse_detected"
   */
  action:    string;
  status:    AuditStatus;
  errorCode: string | null;

  actor:    AuditActor | null;
  source:   AuditSource | null;

  /** Ties multiple log entries to one user-facing operation. */
  correlationId: string | null;
  /** Ties to a specific HTTP request. */
  requestId:     string | null;

  resource: AuditResource | null;

  /** Arbitrary additional context — not queried, no index. */
  metadata: Record<string, unknown> | null;

  ipAddress: string | null;
  userAgent: string | null;

  readonly createdAt: Date;
}
