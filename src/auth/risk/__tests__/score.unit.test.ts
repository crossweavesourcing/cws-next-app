import { describe, it, expect } from 'vitest';
import { evaluateRiskScore, RiskSignals } from '../score';

describe('evaluateRiskScore', () => {
  const baseSignals: RiskSignals = {
    trustedDeviceStatus: 'valid',
    isNewDevice: false,
    isNewBrowserFamily: false,
    isUnusualCountry: false,
    isUnusualNetwork: false,
    isAnonymizingNetwork: false,
    isMaliciousIp: false,
    recentFailedAttemptsCount: 0,
    excessiveFailedAttempts: false,
    impossibleTravel: false,
    recentPasswordChange: false,
    recentAccountRecovery: false,
    recentTwoFactorDisable: false,
    isPrivilegedAccount: false,
  };

  it('returns low risk when all signals are safe', () => {
    const result = evaluateRiskScore(baseSignals);

    expect(result.score).toBe(0);
    expect(result.level).toBe('low');
    expect(result.reasons).toHaveLength(0);
  });

  it('adds penalty for unknown device', () => {
    const result = evaluateRiskScore({
      ...baseSignals,
      trustedDeviceStatus: 'missing',
    });

    expect(result.score).toBe(10);
    expect(result.level).toBe('low');
    expect(result.reasons).toEqual([
      { code: 'trusted_device_missing', weight: 10 }
    ]);
  });

  it('determines high risk correctly', () => {
    const result = evaluateRiskScore({
      ...baseSignals,
      isAnonymizingNetwork: true, // 40
      isUnusualCountry: true, // 30
    });

    expect(result.score).toBe(70);
    expect(result.level).toBe('high');
  });

  it('determines critical risk correctly', () => {
    const result = evaluateRiskScore({
      ...baseSignals,
      isAnonymizingNetwork: true, // 40
      isMaliciousIp: true, // 60
    });

    expect(result.score).toBe(100);
    expect(result.level).toBe('critical');
  });
});
