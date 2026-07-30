import { describe, it, expect } from 'vitest';
import { resolveTwoFactorPolicy } from '../policy';
import { TwoFactorPolicyInput } from '../types';

describe('resolveTwoFactorPolicy', () => {
  const baseInput: TwoFactorPolicyInput = {
    userId: 'user-1',
    primaryAuthenticationMethod: 'password',
    riskDecision: {
      level: 'low',
      score: 0,
      reasons: [],
      evaluatedAt: new Date(),
      policyVersion: '1.0.0',
    },
    userRole: 'user',
    trustedDeviceValid: true,
    twoFaPreference: 'new_device_only',
    accountPolicy: {
      requireStrongTwoFactor: false,
    },
  };

  it('allows low risk logins', () => {
    const result = resolveTwoFactorPolicy(baseInput);
    expect(result.action).toBe('allow');
  });

  it('requires strong 2FA for admin on untrusted device even on low risk', () => {
    const result = resolveTwoFactorPolicy({
      ...baseInput,
      userRole: 'admin',
      trustedDeviceValid: false,
    });
    expect(result.action).toBe('require_strong_2fa');
  });

  it('requires strong 2FA for admin on high risk', () => {
    const result = resolveTwoFactorPolicy({
      ...baseInput,
      userRole: 'admin',
      riskDecision: { ...baseInput.riskDecision, level: 'high' }
    });
    expect(result.action).toBe('require_strong_2fa');
  });

  it('requires 2FA for medium risk logins', () => {
    const result = resolveTwoFactorPolicy({
      ...baseInput,
      riskDecision: { ...baseInput.riskDecision, level: 'medium' }
    });
    expect(result.action).toBe('require_2fa');
  });

  it('blocks critical risk logins', () => {
    const result = resolveTwoFactorPolicy({
      ...baseInput,
      riskDecision: { ...baseInput.riskDecision, level: 'critical' }
    });
    expect(result.action).toBe('block');
  });

  it('requires 2FA if explicitly configured', () => {
    const result = resolveTwoFactorPolicy({
      ...baseInput,
      twoFaPreference: 'always',
    });
    expect(result.action).toBe('require_2fa');
  });

  it('allows google login on new device, medium risk, and always preference', () => {
    const result = resolveTwoFactorPolicy({
      ...baseInput,
      primaryAuthenticationMethod: 'google',
      trustedDeviceValid: false,
      twoFaPreference: 'always',
      riskDecision: { ...baseInput.riskDecision, level: 'medium' },
    });

    expect(result.action).toBe('allow');
  });

  it('requires email-compatible 2FA for high-risk google and passkey login', () => {
    for (const method of ['google', 'passkey'] as const) {
      const result = resolveTwoFactorPolicy({
        ...baseInput,
        primaryAuthenticationMethod: method,
        riskDecision: { ...baseInput.riskDecision, level: 'high' },
      });

      expect(result.action).toBe('require_2fa');
      expect(result.reasonCodes).toContain(`policy:${method}_high_risk_email_otp`);
    }
  });
});
