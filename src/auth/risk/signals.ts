import { ObjectId } from 'mongodb';
import { DeviceRepository } from '../repositories/device.repository';
import { LoginAttemptRepository } from '../repositories/login-attempt.repository';
import type { RiskSignals } from './score';
import type { TrustedDeviceStatus } from './types';
import { lookupGeo } from '../lib/geoip';
import type { UserDocument } from '@/types/auth';

const RECENT_FAILURES_WINDOW_MS = 15 * 60 * 1000; // 15 mins
const SECURITY_EVENT_WINDOW_MS = 24 * 60 * 60 * 1000; // 24 hours

export interface SignalCollectorInput {
  userId: ObjectId;
  user: UserDocument;
  ipAddress: string;
  userAgent: string | null;
  serverDeviceId: ObjectId | null;
  clientDeviceId: string | null;
  hasServerToken?: boolean;
}

/**
 * Collects and normalizes all signals required for risk evaluation.
 */
export async function collectRiskSignals(input: SignalCollectorInput): Promise<RiskSignals> {
  const { userId, user, ipAddress, serverDeviceId, clientDeviceId, hasServerToken } = input;
  
  const deviceRepo = new DeviceRepository();
  const attemptRepo = new LoginAttemptRepository();

  // 1. Device Trust
  let trustedDeviceStatus: TrustedDeviceStatus = 'missing';
  let isNewDevice = true;
  
  if (serverDeviceId) {
    const serverDevice = await deviceRepo.findByServerDeviceId(serverDeviceId, userId);
    if (!serverDevice) {
      trustedDeviceStatus = hasServerToken ? 'invalid' : 'missing';
    } else if (serverDevice.blocked) {
      trustedDeviceStatus = 'revoked';
    } else {
      isNewDevice = false;
      trustedDeviceStatus = serverDevice.trusted ? 'valid' : 'known_untrusted';
    }
  } else if (clientDeviceId && DeviceRepository.isValidDeviceId(clientDeviceId)) {
    const legacyDevice = await deviceRepo.findByIdForUser(clientDeviceId, userId);
    if (legacyDevice) {
      if (legacyDevice.blocked) {
        trustedDeviceStatus = 'revoked';
      } else {
        isNewDevice = false;
        trustedDeviceStatus = legacyDevice.trusted ? 'valid' : 'known_untrusted';
      }
    }
  }

  // 2. Network / Geo
  const geo = await lookupGeo(ipAddress);
  let isUnusualCountry = false;
  if (geo.country && trustedDeviceStatus === 'valid') {
    // To detect unusual country, we would typically check the user's historical logins.
    // For now, we simulate this by checking if the current country differs from the last known device country.
    // In a real system, we might query recent successful logins or a user_locations collection.
    // As a simplification matching the previous `evaluateStepUp` logic:
    if (serverDeviceId) {
       const serverDevice = await deviceRepo.findByServerDeviceId(serverDeviceId, userId);
       if (serverDevice && serverDevice.lastSeenLocation?.country && serverDevice.lastSeenLocation.country !== geo.country) {
         isUnusualCountry = true;
       }
    }
  } else if (geo.country && trustedDeviceStatus === 'missing') {
     // If it's a completely new device, the country itself might not be "unusual" relative to this device,
     // but we might consider it unusual if it differs from the user's primary country.
     // To keep it simple and deterministic based on the provided data, we'll leave it false unless we have baseline data.
  }

  // 3. Recent Failed Attempts
  const recentFailures = await attemptRepo.countRecentByFilter(
    { userId, success: false },
    RECENT_FAILURES_WINDOW_MS
  );

  const ipFailures = await attemptRepo.countRecentByFilter(
    { ipAddress, success: false },
    RECENT_FAILURES_WINDOW_MS
  );
  
  const totalFailures = Math.max(recentFailures, ipFailures);
  const excessiveFailedAttempts = totalFailures > 10; // Threshold for excessive

  // 4. Novelty
  const isNewBrowserFamily = isNewDevice; // Can be enhanced with actual UA parsing and comparison

  // 5. Security Events & Velocity
  const now = Date.now();
  let recentPasswordChange = false;
  if (user.passwordChangedAt) {
    const pwdTime = user.passwordChangedAt instanceof Date ? user.passwordChangedAt.getTime() : new Date(user.passwordChangedAt).getTime();
    if (!isNaN(pwdTime) && now - pwdTime < SECURITY_EVENT_WINDOW_MS) {
      recentPasswordChange = true;
    }
  }

  // Calculate Geo-Velocity (Impossible Travel)
  let impossibleTravel = false;
  const recentLogins = await attemptRepo.recentForUser(userId, 5);
  const lastSuccess = recentLogins.find(l => l.success && l.country);
  if (lastSuccess && lastSuccess.country && geo.country && lastSuccess.country !== geo.country && lastSuccess.createdAt) {
    const lastTime = lastSuccess.createdAt instanceof Date ? lastSuccess.createdAt.getTime() : new Date(lastSuccess.createdAt).getTime();
    if (!isNaN(lastTime)) {
      const elapsedHours = (now - lastTime) / (1000 * 60 * 60);
      if (elapsedHours < 2) {
        impossibleTravel = true;
      }
    }
  }

  return {
    trustedDeviceStatus,
    isNewDevice,
    isNewBrowserFamily,
    isUnusualCountry,
    isUnusualNetwork: false, // Placeholder for ASN checks
    isAnonymizingNetwork: false, // Placeholder for Tor/VPN checks
    isMaliciousIp: false, // Placeholder for IP threat intel feeds
    recentFailedAttemptsCount: totalFailures,
    excessiveFailedAttempts,
    impossibleTravel,
    recentPasswordChange,
    recentAccountRecovery: false,
    recentTwoFactorDisable: false,
    isPrivilegedAccount: user.role === 'super_admin' || user.role === 'admin',
  };
}
