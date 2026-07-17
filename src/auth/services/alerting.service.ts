import { ObjectId } from 'mongodb';
import { UserRepository } from '../repositories/user.repository';
import { sendMail } from './mailer';
import {
  getActiveSecuritySink,
  type SecurityAlertSink,
  type SecurityEvent,
} from '@/database';

/**
 * Centralized, testable home for security alerting.
 *
 * Every alert here is best-effort: it never throws to its caller, and the
 * `SecurityAlertSink` fan-out (console JSON by default, webhook when
 * `SECURITY_WEBHOOK_URL` is set) is fire-and-forget so it can never block the
 * request that triggered it. Email delivery failures are swallowed too.
 *
 * Existing `alertReuseDetected` / `alertNewDevice` / `alertSuspiciousLocation`
 * calls in `session.service` / `device.service`, plus login-failure recording,
 * route through this service so all alert emission is centralized.
 */
export class AlertingService {
  private userRepo = new UserRepository();

  /**
   * Inject a sink (used by tests and by callers that want a custom destination).
   * When omitted, the active sink from `setupSecurityAlerting` / env is used.
   */
  constructor(private readonly sink?: SecurityAlertSink) {}

  private getSink(): SecurityAlertSink {
    return this.sink ?? getActiveSecuritySink();
  }

  /** Fan a security event out to the configured sink (best-effort). */
  private emit(event: SecurityEvent): void {
    try {
      void this.getSink().send(event);
    } catch (err) {
      // A broken sink must never crash the request path.
      console.error(
        JSON.stringify({
          level: 'error',
          event: 'security.alert.emit_failed',
          action: event.action,
          error: err instanceof Error ? err.message : String(err),
          ts: new Date().toISOString(),
        })
      );
    }
  }

  /**
   * Refresh-token reuse detected — strong signal of token theft. Alerts the
   * user (email) AND forwards a critical event to the sink so it is watched,
   * not just stored.
   */
  async alertReuseDetected(userId: ObjectId, ipAddress: string | null): Promise<void> {
    this.emit({
      action: 'auth.refresh.reuse_detected',
      severity: 'critical',
      timestamp: new Date().toISOString(),
      userId: userId.toString(),
      ipAddress,
      metadata: { reason: 'refresh token reuse or unknown token' },
      message: 'Possible refresh-token theft: a token was replayed.',
    });

    const email = await this.userRepo.findPrimaryEmail(userId);
    if (!email) return;
    await sendMail({
      to: email,
      subject: 'CWS Admin — Security Alert: Suspicious Activity',
      text:
        'We detected a reused sign-in token on your account, which can indicate ' +
        'that a session token was copied or replayed.\n\n' +
        `IP address: ${ipAddress ?? 'unknown'}\n\n` +
        'As a precaution we ended all of your active sessions. Please sign in again ' +
        'and change your password if you do not recognize this activity.',
    }).catch((err) => console.error('reuse alert email failed:', err));
  }

  /** New device signed in: notify the user and forward a warning event. */
  async alertNewDevice(
    userId: ObjectId,
    deviceId: string,
    ipAddress: string | null,
    userAgent: string | null
  ): Promise<void> {
    this.emit({
      action: 'auth.login.new_device',
      severity: 'warning',
      timestamp: new Date().toISOString(),
      userId: userId.toString(),
      ipAddress,
      metadata: { deviceId, userAgent },
      message: 'A new device signed in to the account.',
    });

    const email = await this.userRepo.findPrimaryEmail(userId);
    if (!email) return;
    await sendMail({
      to: email,
      subject: 'CWS Admin — New device signed in',
      text:
        'A new device just signed in to your account.\n\n' +
        `Device: ${deviceId}\n` +
        `IP: ${ipAddress ?? 'unknown'}\n` +
        `User agent: ${userAgent ?? 'unknown'}\n\n` +
        'If this was not you, secure your account and contact an administrator.',
    }).catch((err) => console.error('new-device alert failed:', err));
  }

  /** Suspicious location (country change) on a known device. */
  async alertSuspiciousLocation(
    userId: ObjectId,
    previousCountry: string,
    currentCountry: string,
    ipAddress: string | null
  ): Promise<void> {
    this.emit({
      action: 'auth.login.suspicious',
      severity: 'warning',
      timestamp: new Date().toISOString(),
      userId: userId.toString(),
      ipAddress,
      metadata: { previousCountry, currentCountry },
      message: 'Sign-in from a new location (country change on a known device).',
    });

    const email = await this.userRepo.findPrimaryEmail(userId);
    if (!email) return;
    await sendMail({
      to: email,
      subject: 'CWS Admin — Sign-in from a new location',
      text:
        'We noticed a sign-in from a new location.\n\n' +
        `Previous location: ${previousCountry}\n` +
        `Current location: ${currentCountry}\n` +
        `IP: ${ipAddress ?? 'unknown'}\n\n` +
        'If this was not you, secure your account and contact an administrator.',
    }).catch((err) => console.error('suspicious-location alert failed:', err));
  }

  /**
   * Password reset succeeded. Forwarded as a `warning` event so a reset the
   * user did not initiate is surfaced to the sink (the user is already notified
   * by email in the password reset flow).
   */
  async alertPasswordResetSuccess(userId: ObjectId): Promise<void> {
    this.emit({
      action: 'auth.password.reset.success',
      severity: 'warning',
      timestamp: new Date().toISOString(),
      userId: userId.toString(),
      ipAddress: null,
      metadata: { reason: 'email reset link redeemed' },
      message: 'Account password was reset.',
    });
  }

  /**
   * OAuth login callback failed (CSRF state mismatch, token exchange failure,
   * id_token signature/claim failure, no pre-provisioned link, or inactive
   * account). Forwarded as a `warning` event so OAuth abuse is watched, not
   * just thrown.
   */
  async alertOauthFailed(params: {
    provider: string;
    userId: ObjectId | null;
    ipAddress: string | null;
    reason: string;
  }): Promise<void> {
    this.emit({
      action: 'auth.oauth.failed',
      severity: 'warning',
      timestamp: new Date().toISOString(),
      userId: params.userId?.toString() ?? null,
      ipAddress: params.ipAddress,
      metadata: { provider: params.provider, reason: params.reason },
      message: `OAuth login failed (${params.provider}): ${params.reason}`,
    });
  }

  /**
   * Record a login failure and aggregate per-identifier spikes. When failures
   * for the same identifier reach the threshold within the window, a single
   * aggregated `auth.login.failure_spike` event is forwarded to the sink so
   * brute-force patterns are surfaced instead of being lost among individual
   * `auth.login.failure` rows.
   *
   * In-memory aggregation is sufficient for a single-instance internal app; it
   * resets on restart and does not dedupe across processes.
   */
  async recordFailure(params: {
    identifier: string;
    userId: ObjectId | null;
    ipAddress: string | null;
    reason: string;
  }): Promise<void> {
    const { identifier, userId, ipAddress, reason } = params;

    // Individual failure event — low severity, always forwarded.
    this.emit({
      action: 'auth.login.failure',
      severity: 'warning',
      timestamp: new Date().toISOString(),
      userId: userId?.toString() ?? null,
      ipAddress,
      metadata: { identifier, reason },
    });

    // Aggregate recent failures for the same identifier to detect spikes.
    const now = Date.now();
    const window = AlertingService.FAILURE_SPIKE_WINDOW_MS;
    const threshold = AlertingService.FAILURE_SPIKE_THRESHOLD;

    const bucket = AlertingService.failureBuckets.get(identifier) ?? [];
    bucket.push(now);
    // Drop entries outside the sliding window.
    const pruned = bucket.filter((t) => now - t <= window);
    AlertingService.failureBuckets.set(identifier, pruned);

    if (pruned.length >= threshold) {
      // Aggregate and reset so we don't re-alert on the same burst every failure.
      AlertingService.failureBuckets.set(identifier, []);
      this.emit({
        action: 'auth.login.failure_spike',
        severity: 'critical',
        timestamp: new Date().toISOString(),
        userId: userId?.toString() ?? null,
        ipAddress,
        metadata: { identifier, count: pruned.length, windowMs: window, reason },
        message: `Login-failure spike: ${pruned.length} failures for ${identifier} within ${window}ms.`,
      });
    }
  }

  /** Test/ops hook: clear spike-aggregation state. */
  static clearFailureBuckets(): void {
    AlertingService.failureBuckets.clear();
  }

  /** Sliding window (ms) over which failures are aggregated. */
  private static readonly FAILURE_SPIKE_WINDOW_MS = 5 * 60 * 1000;
  /** Number of failures within the window that triggers a spike alert. */
  private static readonly FAILURE_SPIKE_THRESHOLD = 10;
  /** Per-identifier timestamps of recent failures. */
  private static readonly failureBuckets = new Map<string, number[]>();
}
