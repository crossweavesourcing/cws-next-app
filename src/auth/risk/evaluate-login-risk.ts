import { AuditLogRepository } from '../repositories/audit-log.repository';
import { collectRiskSignals, type SignalCollectorInput } from './signals';
import { evaluateRiskScore } from './score';
import { resolveTwoFactorPolicy } from './policy';
import type { AuthenticationRiskDecision, TwoFactorPolicyDecision } from './types';

export interface EvaluateLoginRiskInput extends SignalCollectorInput {
  primaryAuthenticationMethod: 'password' | 'google' | 'passkey';
}

export interface EvaluateLoginRiskResult {
  riskDecision: AuthenticationRiskDecision;
  policyDecision: TwoFactorPolicyDecision;
}

/**
 * Orchestrates the full risk evaluation pipeline:
 * 1. Collects signals
 * 2. Calculates risk score and level
 * 3. Resolves the final 2FA policy
 * 4. Writes an audit event
 */
export async function evaluateLoginRisk(input: EvaluateLoginRiskInput): Promise<EvaluateLoginRiskResult> {
  // 1. Collect signals
  const signals = await collectRiskSignals(input);

  // 2. Evaluate score
  const riskDecision = evaluateRiskScore(signals);

  // 3. Resolve policy
  const accountPolicy = {
    requireStrongTwoFactor: input.user.security?.requireTwoFactor ?? false,
  };

  const twoFaPreference = input.user.security?.twoFaPreference ?? 'new_device_only';

  const policyDecision = resolveTwoFactorPolicy({
    userId: input.userId.toHexString(),
    userRole: input.user.role ?? 'user',
    primaryAuthenticationMethod: input.primaryAuthenticationMethod,
    riskDecision,
    twoFaPreference,
    trustedDeviceValid: signals.trustedDeviceStatus === 'valid',
    accountPolicy,
  });

  // 4. Audit
  const auditRepo = new AuditLogRepository();
  await auditRepo.log({
    userId: input.userId,
    sessionId: null,
    action: 'auth.risk.evaluated',
    status: riskDecision.level === 'critical' ? 'FAILURE' : (riskDecision.level === 'high' ? 'WARNING' : 'SUCCESS'),
    errorCode: null,
    actor: { type: 'user', id: input.userId },
    source: { platform: 'web', appVersion: '0.1.0' }, // Hardcoded for this abstraction layer, ideally passed in
    correlationId: null,
    requestId: null,
    resource: null,
    metadata: {
      primaryAuthenticationMethod: input.primaryAuthenticationMethod,
      riskLevel: riskDecision.level,
      riskScore: riskDecision.score,
      riskReasons: riskDecision.reasons,
      policyAction: policyDecision.action,
      policyReasons: policyDecision.reasonCodes,
      policyVersion: riskDecision.policyVersion,
    },
    ipAddress: input.ipAddress,
    userAgent: input.userAgent,
  }).catch(err => console.error('Failed to write risk audit log', err));

  return {
    riskDecision,
    policyDecision,
  };
}
