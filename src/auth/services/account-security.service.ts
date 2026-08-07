import 'server-only';

import { requireActiveSession } from '@/auth/dal';
import { getUserEmailsCollection } from '@/database';
import { DeviceRepository } from '../repositories/device.repository';
import { LoginAttemptRepository } from '../repositories/login-attempt.repository';
import { RecoveryCodeRepository } from '../repositories/recovery-code.repository';
import { SessionRepository } from '../repositories/session.repository';
import { UserRepository } from '../repositories/user.repository';
import { MfaService, type PasskeySummary } from './mfa.service';
import type { CmsPermission } from '@/types/auth';

export interface AccountSecurityViewModel {
  profile: {
    displayName: string;
    fullName: string | null;
    email: string | null;
    emailVerified: boolean;
    role: string;
    permissions: CmsPermission[];
    avatarUrl: string | null;
  };
  password: {
    configured: boolean;
    changedAt: string | null;
    category: 'very_weak' | 'weak' | 'fair' | 'strong' | 'very_strong' | null;
    percent: number | null;
    evaluatedAt: string | null;
    evaluatorVersion: string | null;
  };
  protection: {
    mfaEnabled: boolean;
    totpEnabled: boolean;
    passkeyCount: number | null;
    passkeys: PasskeySummary[] | null;
    recoveryCodesRemaining: number | null;
    twoFaPreference: 'always' | 'new_device_only' | 'off';
    defaultTwoFaMethod: 'email' | 'totp' | null;
  };
  access: {
    activeSessionCount: number | null;
    trustedDeviceCount: number | null;
    blockedDeviceCount: number | null;
    recentFailedLoginCount: number | null;
    sessions: Array<{ device: string; browser: string | null; location: string; lastActiveAt: string; current: boolean }>;
  };
  accountScore: {
    percent: number;
    checks: Array<{ label: string; complete: boolean }>;
  };
  unavailable: string[];
}

function reportUnavailable(area: string, reason: unknown): void {
  console.error('Account security area unavailable', {
    area,
    errorType: reason instanceof Error ? reason.name : 'UnknownError',
  });
}

export async function getAccountSecurityView(): Promise<AccountSecurityViewModel> {
  const currentSession = await requireActiveSession();
  const userRepo = new UserRepository();
  const user = await userRepo.findById(currentSession.userId);
  if (!user) throw new Error('Account information is unavailable.');

  const results = await Promise.allSettled([
    getUserEmailsCollection().then((collection) => collection.findOne({ userId: user._id, primary: true, enabled: true })),
    new MfaService().listWebAuthnCredentials(user._id),
    new RecoveryCodeRepository().countRemaining(user._id),
    new SessionRepository().listForUser(user._id, 8),
    new DeviceRepository().listForUser(user._id, 12),
    new LoginAttemptRepository().recentForUser(user._id, 20),
  ]);

  const areas = ['email', 'passkeys', 'recovery codes', 'sessions', 'devices', 'login activity'];
  const unavailable = results.flatMap((result, index) => {
    if (result.status === 'fulfilled') return [];
    reportUnavailable(areas[index], result.reason);
    return [areas[index]];
  });
  const [emailResult, passkeysResult, recoveryResult, sessionsResult, devicesResult, attemptsResult] = results;
  const email = emailResult.status === 'fulfilled' ? emailResult.value : null;
  const passkeys = passkeysResult.status === 'fulfilled' ? passkeysResult.value : null;
  const recoveryCount = recoveryResult.status === 'fulfilled' ? recoveryResult.value : null;
  const sessions = sessionsResult.status === 'fulfilled' ? sessionsResult.value : null;
  const devices = devicesResult.status === 'fulfilled' ? devicesResult.value : null;
  const attempts = attemptsResult.status === 'fulfilled' ? attemptsResult.value : null;
  const activeSessions = sessions?.filter((session) => !session.revoked && session.expiresAt > new Date()) ?? null;
  const recentFailures = attempts?.filter((attempt) => !attempt.success).length ?? null;

  const checks = [
    { label: 'Primary email verified', complete: email?.verified === true },
    { label: 'Password evaluated as fair or better', complete: (user.security.passwordStrengthPercent ?? 0) >= 50 },
    { label: 'Two-factor authentication enabled', complete: user.security.mfaEnabled },
    { label: 'Recovery codes available', complete: (recoveryCount ?? 0) > 0 },
    { label: 'No recent failed sign-ins', complete: recentFailures === 0 },
  ];

  return {
    profile: {
      displayName: user.profile.displayName,
      fullName: user.profile.fullName ?? user.profile.displayName,
      email: email?.email ?? null,
      emailVerified: email?.verified ?? false,
      role: user.role,
      permissions: user.permissions ?? [],
      avatarUrl: user.profile.avatar?.url ?? null,
    },
    password: {
      configured: user.password !== null,
      changedAt: user.passwordChangedAt?.toISOString() ?? null,
      category: user.security.passwordStrengthCategory ?? null,
      percent: user.security.passwordStrengthPercent ?? null,
      evaluatedAt: user.security.passwordStrengthEvaluatedAt?.toISOString() ?? null,
      evaluatorVersion: user.security.passwordStrengthEvaluatorVersion ?? null,
    },
    protection: {
      mfaEnabled: user.security.mfaEnabled,
      totpEnabled: user.security.totpEnabled ?? false,
      passkeyCount: passkeys?.length ?? null,
      passkeys: passkeys ?? null,
      recoveryCodesRemaining: recoveryCount,
      twoFaPreference: user.security.twoFaPreference ?? 'always',
      defaultTwoFaMethod: user.security.defaultTwoFaMethod === 'totp' ? 'totp' : user.security.defaultTwoFaMethod === 'email' ? 'email' : null,
    },
    access: {
      activeSessionCount: activeSessions?.length ?? null,
      trustedDeviceCount: devices?.filter((device) => device.trusted && !device.blocked).length ?? null,
      blockedDeviceCount: devices?.filter((device) => device.blocked).length ?? null,
      recentFailedLoginCount: recentFailures,
      sessions: (activeSessions ?? []).slice(0, 4).map((session) => ({
        device: session.device ?? session.operatingSystem ?? 'Unknown device',
        browser: session.browser,
        location: [session.location?.city, session.location?.country].filter(Boolean).join(', ') || 'Location unavailable',
        lastActiveAt: session.lastActivityAt.toISOString(),
        current: session._id.equals(currentSession._id),
      })),
    },
    accountScore: {
      percent: checks.filter((check) => check.complete).length * 20,
      checks,
    },
    unavailable,
  };
}
