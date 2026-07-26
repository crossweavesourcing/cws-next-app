export type AuthenticationRiskLevel = 'low' | 'medium' | 'high' | 'critical';

export interface AuthenticationRiskReason {
  code: string;
  weight: number;
}

export interface AuthenticationRiskDecision {
  level: AuthenticationRiskLevel;
  score: number;
  reasons: AuthenticationRiskReason[];
  evaluatedAt: Date;
  policyVersion: string;
}

export interface RiskPolicyConfiguration {
  weights: {
    trustedDeviceMissing: number;
    trustedDeviceExpired: number;
    trustedDeviceInvalid: number;
    newDevice: number;
    newBrowserFamily: number;
    unusualCountry: number;
    unusualNetwork: number;
    anonymizingNetwork: number;
    maliciousIp: number;
    recentFailedAttempts: number;
    excessiveFailedAttempts: number;
    impossibleTravel: number;
    recentPasswordChange: number;
    recentAccountRecovery: number;
    recentTwoFactorDisable: number;
    privilegedAccount: number;
  };
  thresholds: {
    medium: number;
    high: number;
    critical: number;
  };
}

export type TrustedDeviceStatus =
  | 'valid'
  | 'known_untrusted'
  | 'missing'
  | 'expired'
  | 'revoked'
  | 'invalid';

export interface TwoFactorPolicyInput {
  userId: string;
  userRole: string;
  primaryAuthenticationMethod: string;
  riskDecision: AuthenticationRiskDecision;
  trustedDeviceValid: boolean;
  twoFaPreference: 'always' | 'new_device_only' | 'off';
  accountPolicy?: {
    requireStrongTwoFactor?: boolean;
  };
}

export interface TwoFactorPolicyDecision {
  action: 'allow' | 'require_2fa' | 'require_strong_2fa' | 'block';
  reasonCodes: string[];
}
