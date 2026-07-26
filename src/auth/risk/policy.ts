import type { TwoFactorPolicyInput, TwoFactorPolicyDecision } from './types';

/**
 * Resolves the final 2FA policy based on explicit rules and the calculated risk level.
 * Precedence:
 * 1. Critical-risk block policy
 * 2. Explicit account restriction (requireStrongTwoFactor)
 * 3. High-risk policy
 * 4. Medium-risk policy
 * 5. User preference (always vs new_device_only)
 * 6. Trusted-device convenience policy
 */
export function resolveTwoFactorPolicy(input: TwoFactorPolicyInput): TwoFactorPolicyDecision {
  const { riskDecision, userRole, trustedDeviceValid, twoFaPreference, accountPolicy } = input;
  const reasonCodes: string[] = [];

  // 1. Critical risk -> always block
  if (riskDecision.level === 'critical') {
    reasonCodes.push('policy:critical_risk_block');
    return { action: 'block', reasonCodes };
  }

  // 2. Explicit strong 2FA requirement (account restriction)
  if (accountPolicy?.requireStrongTwoFactor) {
    reasonCodes.push('policy:account_requires_strong_2fa');
    return { action: 'require_strong_2fa', reasonCodes };
  }

  // 3. High risk -> always require strong 2FA (overrides preference and trust)
  if (riskDecision.level === 'high') {
    reasonCodes.push('policy:high_risk_requires_strong_2fa');
    return { action: 'require_strong_2fa', reasonCodes };
  }

  // 4. Medium risk -> always require 2FA (overrides preference and trust)
  if (riskDecision.level === 'medium') {
    reasonCodes.push('policy:medium_risk_requires_2fa');
    return { action: 'require_2fa', reasonCodes };
  }

  // 5. User preference: 'always' -> require 2FA on every login (trusted device cannot bypass)
  if (twoFaPreference === 'always') {
    // Admin with 'always' preference: escalate to strong 2FA
    if (userRole === 'admin') {
      reasonCodes.push('policy:admin_always_requires_strong_2fa');
      return { action: 'require_strong_2fa', reasonCodes };
    }
    reasonCodes.push('policy:user_preference_always_2fa');
    return { action: 'require_2fa', reasonCodes };
  }

  // 6. User preference: 'new_device_only' (default)
  // If the device is explicitly trusted by the user -> allow bypass
  if (trustedDeviceValid) {
    reasonCodes.push('policy:trusted_device_bypass');
    return { action: 'allow', reasonCodes };
  }

  // 7. New or untrusted device -> require 2FA
  reasonCodes.push('policy:new_or_untrusted_device_requires_2fa');
  // Admin on untrusted device: escalate to strong
  if (userRole === 'admin') {
    return { action: 'require_strong_2fa', reasonCodes };
  }
  return { action: 'require_2fa', reasonCodes };
}
