import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ObjectId } from 'mongodb';
import { AlertingService } from './alerting.service';
import type { SecurityAlertSink, SecurityEvent } from '@/database';

// In-memory capture sink + stubbed UserRepository.findPrimaryEmail.
const captured: SecurityEvent[] = [];

vi.mock('../repositories/user.repository', () => ({
  UserRepository: class {
    async findPrimaryEmail() {
      return 'user@example.com';
    }
  },
}));

describe('AlertingService', () => {
  beforeEach(() => {
    captured.length = 0;
    AlertingService.clearFailureBuckets();
    vi.restoreAllMocks();
  });

  function makeSink(): SecurityAlertSink {
    return { send(e: SecurityEvent) { captured.push(e); } };
  }

  it('forwards a reuse-detected event to the sink (not just stored)', async () => {
    const svc = new AlertingService(makeSink());
    await svc.alertReuseDetected(new ObjectId(), '203.0.113.9');

    const reuse = captured.find((e) => e.action === 'auth.refresh.reuse_detected');
    expect(reuse).toBeDefined();
    expect(reuse?.severity).toBe('critical');
    expect(reuse?.ipAddress).toBe('203.0.113.9');
    expect(reuse?.userId).toBeTruthy();
  });

  it('forwards suspicious-location and new-device events to the sink', async () => {
    const svc = new AlertingService(makeSink());
    const userId = new ObjectId();

    await svc.alertSuspiciousLocation(userId, 'US', 'DE', '198.51.100.7');
    await svc.alertNewDevice(userId, 'device-abc', '198.51.100.7', 'Mozilla/5.0');

    expect(captured.find((e) => e.action === 'auth.login.suspicious')).toBeDefined();
    expect(captured.find((e) => e.action === 'auth.login.new_device')).toBeDefined();
  });

  it('aggregates login failures into a single spike event at the threshold', async () => {
    const svc = new AlertingService(makeSink());
    const identifier = 'victim@example.com';

    // 9 failures: individual events, but NO spike yet.
    for (let i = 0; i < 9; i++) {
      await svc.recordFailure({ identifier, userId: new ObjectId(), ipAddress: '203.0.113.8', reason: 'AUTH_INVALID_CREDENTIALS' });
    }
    expect(captured.filter((e) => e.action === 'auth.login.failure').length).toBe(9);
    expect(captured.find((e) => e.action === 'auth.login.failure_spike')).toBeUndefined();

    // 10th failure: spike fires exactly once.
    await svc.recordFailure({ identifier, userId: new ObjectId(), ipAddress: '203.0.113.8', reason: 'AUTH_INVALID_CREDENTIALS' });
    const spike = captured.filter((e) => e.action === 'auth.login.failure_spike');
    expect(spike.length).toBe(1);
    expect(spike[0]?.severity).toBe('critical');
    expect((spike[0]?.metadata as { count: number }).count).toBe(10);
  });

  it('does not re-alert on the same spike window until state is reset', async () => {
    const svc = new AlertingService(makeSink());
    const identifier = 'repeat@example.com';

    for (let i = 0; i < 20; i++) {
      await svc.recordFailure({ identifier, userId: null, ipAddress: '1.2.3.4', reason: 'x' });
    }
    // Threshold is 10; after firing it resets, so 20 failures => 2 spikes, not 20.
    expect(captured.filter((e) => e.action === 'auth.login.failure_spike').length).toBe(2);
  });

  it('is best-effort: a throwing sink never rejects the alert call', async () => {
    const throwingSink: SecurityAlertSink = {
      send: () => {
        throw new Error('sink down');
      },
    };
    const svc = new AlertingService(throwingSink);

    // Must resolve (emit() swallows the error) and still send the email.
    await expect(svc.alertReuseDetected(new ObjectId(), null)).resolves.toBeUndefined();
  });
});
