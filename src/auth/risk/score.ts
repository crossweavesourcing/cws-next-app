import type {
  AuthenticationRiskDecision,
  AuthenticationRiskLevel,
  AuthenticationRiskReason,
  RiskPolicyConfiguration,
} from './types';

// The policy version should be updated when weights or thresholds change materially
export const CURRENT_POLICY_VERSION = '1.0.0';

export const defaultRiskPolicy: RiskPolicyConfiguration = {
  weights: {
    trustedDeviceMissing: 10,
    trustedDeviceExpired: 15,
    trustedDeviceInvalid: 30,

    newDevice: 20,
    newBrowserFamily: 10,

    unusualCountry: 30,
    unusualNetwork: 15,
    anonymizingNetwork: 40,
    maliciousIp: 60,

    recentFailedAttempts: 25,
    excessiveFailedAttempts: 50,

    impossibleTravel: 40,

    recentPasswordChange: 20,
    recentAccountRecovery: 40,
    recentTwoFactorDisable: 50,

    privilegedAccount: 0, // Admin escalation is handled in policy.ts; avoid flat penalties here.
  },
  thresholds: {
    medium: 25,
    high: 60,
    critical: 100,
  },
};

export interface RiskSignals {
  trustedDeviceStatus: 'valid' | 'missing' | 'expired' | 'revoked' | 'invalid' | 'known_untrusted';
  isNewDevice: boolean;
  isNewBrowserFamily: boolean;
  isUnusualCountry: boolean;
  isUnusualNetwork: boolean;
  isAnonymizingNetwork: boolean;
  isMaliciousIp: boolean;
  recentFailedAttemptsCount: number;
  excessiveFailedAttempts: boolean;
  impossibleTravel: boolean;
  recentPasswordChange: boolean;
  recentAccountRecovery: boolean;
  recentTwoFactorDisable: boolean;
  isPrivilegedAccount: boolean;
}

/**
 * Evaluates the gathered signals against the policy configuration to produce
 * a deterministic risk score and decision.
 */
export function evaluateRiskScore(
  signals: RiskSignals,
  policy: RiskPolicyConfiguration = defaultRiskPolicy
): AuthenticationRiskDecision {
  let score = 0;
  const reasons: AuthenticationRiskReason[] = [];

  function addScore(condition: boolean, weight: number, code: string) {
    if (condition && weight > 0) {
      score += weight;
      reasons.push({ code, weight });
    }
  }

  // Device trust
  addScore(signals.trustedDeviceStatus === 'missing', policy.weights.trustedDeviceMissing, 'trusted_device_missing');
  addScore(signals.trustedDeviceStatus === 'expired', policy.weights.trustedDeviceExpired, 'trusted_device_expired');
  addScore(signals.trustedDeviceStatus === 'invalid' || signals.trustedDeviceStatus === 'revoked', policy.weights.trustedDeviceInvalid, 'trusted_device_invalid');

  // Device/Browser novelty
  addScore(signals.isNewDevice, policy.weights.newDevice, 'new_device');
  addScore(signals.isNewBrowserFamily, policy.weights.newBrowserFamily, 'new_browser_family');

  // Network/Geo
  // A valid trusted device bypasses normal geo/network risk factors
  if (signals.trustedDeviceStatus !== 'valid') {
    addScore(signals.isUnusualCountry, policy.weights.unusualCountry, 'unusual_country');
    addScore(signals.isUnusualNetwork, policy.weights.unusualNetwork, 'unusual_network');
    addScore(signals.impossibleTravel, policy.weights.impossibleTravel, 'impossible_travel');
  }

  // High-risk indicators (malicious/anonymizing) apply regardless of device trust
  addScore(signals.isAnonymizingNetwork, policy.weights.anonymizingNetwork, 'anonymizing_network');
  addScore(signals.isMaliciousIp, policy.weights.maliciousIp, 'malicious_ip');

  // Behavior
  addScore(signals.recentFailedAttemptsCount > 0 && !signals.excessiveFailedAttempts, policy.weights.recentFailedAttempts, 'recent_failed_attempts');
  addScore(signals.excessiveFailedAttempts, policy.weights.excessiveFailedAttempts, 'excessive_failed_attempts');

  // Security Events
  addScore(signals.recentPasswordChange, policy.weights.recentPasswordChange, 'recent_password_change');
  addScore(signals.recentAccountRecovery, policy.weights.recentAccountRecovery, 'recent_account_recovery');
  addScore(signals.recentTwoFactorDisable, policy.weights.recentTwoFactorDisable, 'recent_two_factor_disable');

  // Role
  addScore(signals.isPrivilegedAccount, policy.weights.privilegedAccount, 'privileged_account');

  // Determine level
  let level: AuthenticationRiskLevel = 'low';
  if (score >= policy.thresholds.critical) {
    level = 'critical';
  } else if (score >= policy.thresholds.high) {
    level = 'high';
  } else if (score >= policy.thresholds.medium) {
    level = 'medium';
  }

  return {
    level,
    score,
    reasons,
    evaluatedAt: new Date(),
    policyVersion: CURRENT_POLICY_VERSION,
  };
}
