import { describe, expect, it } from 'vitest';
import { ObjectId } from 'mongodb';
import { friendlyDeviceName, friendlyLocation, maskIpAddress, presentActivity, presentSession } from './friendly-security';
import type { LoginAttemptDocument, SessionDocument } from '@/types/auth';

describe('friendly security presentation', () => {
  it('masks IPv4, IPv6, and missing addresses', () => {
    expect(maskIpAddress('203.0.113.42')).toBe('203.0.113.••');
    expect(maskIpAddress('2001:db8:abcd:12::1')).toBe('2001:db8:abcd:••••');
    expect(maskIpAddress(null)).toBe('IP unavailable');
  });

  it('creates friendly fallback device names and locations', () => {
    expect(friendlyDeviceName({ device: null, operatingSystem: 'macOS', platform: 'web' })).toBe('Mac computer');
    expect(friendlyDeviceName({ device: null, operatingSystem: 'Android', platform: 'mobile' })).toBe('Mobile device');
    expect(friendlyLocation({ city: 'Dhaka', region: 'Dhaka', country: 'Bangladesh' })).toBe('Dhaka, Bangladesh');
  });

  it('marks the current session without exposing an identifier', () => {
    const id = new ObjectId();
    const session = {
      _id: id, deviceId: null, device: null, operatingSystem: 'Windows 11', platform: 'web', browser: 'Chrome',
      ipAddress: '192.0.2.10', location: { city: 'Dhaka', region: null, country: 'Bangladesh' },
      createdAt: new Date('2026-07-20T10:00:00Z'), lastActivityAt: new Date('2026-07-22T10:00:00Z'),
    } as SessionDocument;
    const result = presentSession(session, id.toString(), null, new Date('2026-07-22T10:01:00Z'));
    expect(result.isCurrent).toBe(true);
    expect(result.deviceName).toBe('Windows computer');
    expect(result.lastActive).toBe('Active now');
    expect(result).not.toHaveProperty('id');
    expect(JSON.stringify(result)).not.toContain(id.toString());
  });

  it('uses plain language and omits internal failure details', () => {
    const attempt = {
      success: false, failureReason: 'internal lockout threshold', userAgent: 'raw agent', device: null,
      city: null, country: null, createdAt: new Date('2026-07-22T10:00:00Z'),
    } as LoginAttemptDocument;
    const result = presentActivity(attempt);
    expect(result.title).toBe('Sign-in needs attention');
    expect(JSON.stringify(result)).not.toContain('internal lockout threshold');
    expect(JSON.stringify(result)).not.toContain('raw agent');
  });
});

