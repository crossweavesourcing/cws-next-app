import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ObjectId } from 'mongodb';
import {
  setupSecurityAlerting,
  createWebhookSecuritySink,
  createConsoleSecuritySink,
  createDefaultSecuritySink,
  type SecurityAlertSink,
  type SecurityEvent,
} from '@/database';
import { AlertingService } from './alerting.service';

// ── Smoke test: confirm a security event actually reaches a configured sink ──
// Exercises the full pluggable path (console default + webhook when
// SECURITY_WEBHOOK_URL is set) that `client.ts` wires via `setupSecurityAlerting`.

describe('AlertingService sink delivery (smoke)', () => {
  const ORIGINAL_ENV = process.env.SECURITY_WEBHOOK_URL;

  beforeEach(() => {
    vi.restoreAllMocks();
    AlertingService.clearFailureBuckets();
  });

  afterEach(() => {
    if (ORIGINAL_ENV === undefined) delete process.env.SECURITY_WEBHOOK_URL;
    else process.env.SECURITY_WEBHOOK_URL = ORIGINAL_ENV;
  });

  it('default sink is the console sink when SECURITY_WEBHOOK_URL is unset', () => {
    delete process.env.SECURITY_WEBHOOK_URL;
    const sink = createDefaultSecuritySink();
    // The console sink emits via console.warn; spying confirms the call path.
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    sink.send({
      action: 'auth.refresh.reuse_detected',
      severity: 'critical',
      timestamp: new Date().toISOString(),
      userId: new ObjectId().toString(),
      ipAddress: '203.0.113.9',
      metadata: {},
    });
    expect(warnSpy).toHaveBeenCalledTimes(1);
    expect(warnSpy.mock.calls[0]?.[0]).toContain('security.alert');
  });

  it('webhook sink POSTs a compact event to SECURITY_WEBHOOK_URL', async () => {
    process.env.SECURITY_WEBHOOK_URL = 'https://hooks.example.com/security';
    const sink = createWebhookSecuritySink(process.env.SECURITY_WEBHOOK_URL);

    const fetchMock = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal('fetch', fetchMock as unknown as typeof fetch);

    await sink.send({
      action: 'auth.login.suspicious',
      severity: 'warning',
      timestamp: new Date().toISOString(),
      userId: new ObjectId().toString(),
      ipAddress: '198.51.100.7',
      metadata: { previousCountry: 'US', currentCountry: 'DE' },
    });

    // Fire-and-forget: give the microtask a tick to flush the fetch.
    await new Promise((r) => setTimeout(r, 0));

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0]!;
    expect(url).toBe('https://hooks.example.com/security');
    expect(init.method).toBe('POST');
    const body = JSON.parse(init.body as string) as SecurityEvent & { event: string };
    expect(body.event).toBe('security.alert');
    expect(body.action).toBe('auth.login.suspicious');
    expect(body.ipAddress).toBe('198.51.100.7');
  });

  it('webhook sink never rejects its caller when the POST fails', async () => {
    process.env.SECURITY_WEBHOOK_URL = 'https://hooks.example.com/security';
    const sink = createWebhookSecuritySink(process.env.SECURITY_WEBHOOK_URL);

    const fetchMock = vi.fn().mockRejectedValue(new Error('network down'));
    vi.stubGlobal('fetch', fetchMock as unknown as typeof fetch);
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    // Must not throw — failure is swallowed/logged only.
    expect(() => sink.send({
      action: 'auth.oauth.failed',
      severity: 'warning',
      timestamp: new Date().toISOString(),
      userId: null,
      ipAddress: '10.0.0.1',
      metadata: { provider: 'google', reason: 'state mismatch' },
    })).not.toThrow();

    await new Promise((r) => setTimeout(r, 0));
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(errSpy).toHaveBeenCalled();
  });

  it('setupSecurityAlerting makes the active sink deliver an event end-to-end', async () => {
    const received: SecurityEvent[] = [];
    const captureSink: SecurityAlertSink = { send(e) { received.push(e); } };
    setupSecurityAlerting({ sink: captureSink });

    // recordFailure only emits to the sink (no email/DB), so it proves the
    // wired active sink is actually reached by the service.
    const svc = new AlertingService();
    await svc.recordFailure({
      identifier: 'victim@example.com',
      userId: new ObjectId(),
      ipAddress: '203.0.113.9',
      reason: 'AUTH_INVALID_CREDENTIALS',
    });

    expect(received.length).toBe(1);
    expect(received[0]?.action).toBe('auth.login.failure');
    expect(received[0]?.ipAddress).toBe('203.0.113.9');
  });

  it('password-reset-success event is forwarded to the active sink', async () => {
    const received: SecurityEvent[] = [];
    const captureSink: SecurityAlertSink = { send(e) { received.push(e); } };
    setupSecurityAlerting({ sink: captureSink });

    const svc = new AlertingService();
    await svc.alertPasswordResetSuccess(new ObjectId());

    const evt = received.find((e) => e.action === 'auth.password.reset.success');
    expect(evt).toBeDefined();
    expect(evt?.severity).toBe('warning');
  });

  it('oauth-failed event is forwarded to the active sink', async () => {
    const received: SecurityEvent[] = [];
    const captureSink: SecurityAlertSink = { send(e) { received.push(e); } };
    setupSecurityAlerting({ sink: captureSink });

    const svc = new AlertingService();
    await svc.alertOauthFailed({
      provider: 'google',
      userId: null,
      ipAddress: '198.51.100.7',
      reason: 'state mismatch (possible CSRF)',
    });

    const evt = received.find((e) => e.action === 'auth.oauth.failed');
    expect(evt).toBeDefined();
    expect((evt?.metadata as { reason: string }).reason).toContain('state mismatch');
  });

  it('console sink exists and is callable (default behavior preserved)', () => {
    const sink = createConsoleSecuritySink();
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    expect(() => sink.send({
      action: 'auth.login.new_device',
      severity: 'warning',
      timestamp: new Date().toISOString(),
      userId: new ObjectId().toString(),
      ipAddress: '198.51.100.7',
      metadata: {},
    })).not.toThrow();
    expect(warnSpy).toHaveBeenCalled();
  });
});
