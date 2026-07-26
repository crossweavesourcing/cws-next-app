import 'server-only';

import { requireActiveSession } from '@/auth/dal';
import { DeviceRepository } from '@/auth/repositories/device.repository';
import { LoginAttemptRepository } from '@/auth/repositories/login-attempt.repository';
import { SessionRepository } from '@/auth/repositories/session.repository';
import { presentActivity, presentSession, type FriendlyActivity, type FriendlySession } from '@/auth/presentation/friendly-security';

export interface FriendlySecurityView {
  activeSessions: Array<FriendlySession & { targetId: string }>;
  inactiveSessions: Array<FriendlySession & { targetId: string }>;
  sessions: Array<FriendlySession & { targetId: string }>;
  activity: FriendlyActivity[];
  currentDeviceName: string;
  warningCount: number;
  unavailable: boolean;
  currentSessionId: string;
}

export async function getFriendlySecurityView(): Promise<FriendlySecurityView> {
  const current = await requireActiveSession();
  const currentSessionId = current._id.toString();
  const [sessionsResult, devicesResult, attemptsResult] = await Promise.allSettled([
    new SessionRepository().listForUser(current.userId, 40),
    new DeviceRepository().listForUser(current.userId, 20),
    new LoginAttemptRepository().recentForUser(current.userId, 12),
  ]);
  const unavailable = [sessionsResult, devicesResult, attemptsResult].some((result) => result.status === 'rejected');
  if (unavailable) console.error('Friendly security view partially unavailable');
  const devices = devicesResult.status === 'fulfilled' ? devicesResult.value : [];
  const deviceById = new Map(devices.map((device) => [device._id.toString(), device]));
  const now = new Date();

  const allPresented = sessionsResult.status === 'fulfilled'
    ? sessionsResult.value.map((session) => ({
        ...presentSession(
          session,
          currentSessionId,
          session.deviceId ? deviceById.get(session.deviceId.toString()) ?? null : null,
          now
        ),
        targetId: session._id.toString(),
      }))
    : [];

  const activeSessions = allPresented
    .filter((s) => !s.revoked)
    .sort((left, right) => Number(right.isCurrent) - Number(left.isCurrent));

  const inactiveSessions = allPresented
    .filter((s) => s.revoked);

  return {
    activeSessions,
    inactiveSessions,
    sessions: activeSessions,
    activity: attemptsResult.status === 'fulfilled' ? attemptsResult.value.map(presentActivity) : [],
    currentDeviceName: activeSessions.find((session) => session.isCurrent)?.deviceName ?? 'This device',
    warningCount: attemptsResult.status === 'fulfilled' ? attemptsResult.value.filter((item) => !item.success).length : 0,
    unavailable,
    currentSessionId,
  };
}
