import type { DeviceDocument, LoginAttemptDocument, SessionDocument } from '@/types/auth';

export interface FriendlySession {
  deviceName: string;
  browserAndSystem: string;
  osTypeLabel: string;
  deviceTypeSubtitle: string;
  location: string;
  maskedIp: string;
  signedInAt: string;
  lastActive: string;
  isCurrent: boolean;
  isMobile: boolean;
  iconCategory: 'android' | 'ios' | 'chrome' | 'mac' | 'windows' | 'mobile' | 'desktop';
  revoked: boolean;
}

export interface FriendlyActivity {
  title: string;
  description: string;
  occurredAt: string;
  warning: boolean;
}

function isTechnicalLabel(value: string | null | undefined): boolean {
  if (!value) return true;
  return /^[0-9a-f]{24}$/i.test(value) || /^[0-9a-f]{8}-[0-9a-f-]{27}$/i.test(value);
}

export function maskIpAddress(ipAddress: string | null | undefined): string {
  if (!ipAddress) return 'IP unavailable';
  if (ipAddress.includes('.')) {
    const parts = ipAddress.split('.');
    return parts.length === 4 ? `${parts.slice(0, 3).join('.')}.••` : 'IP unavailable';
  }
  if (ipAddress.includes(':')) {
    const visible = ipAddress.split(':').filter(Boolean).slice(0, 3);
    return visible.length > 0 ? `${visible.join(':')}:••••` : 'IP unavailable';
  }
  return 'IP unavailable';
}

export function friendlyLocation(location: { city?: string | null; region?: string | null; country?: string | null } | null | undefined): string {
  const parts = [location?.city, location?.region, location?.country].filter((value): value is string => Boolean(value));
  return parts.length > 0 ? [...new Set(parts)].join(', ') : 'Location unavailable';
}

export function friendlyDeviceName(
  session: Pick<SessionDocument, 'device' | 'operatingSystem' | 'platform'>,
  device?: Pick<DeviceDocument, 'name' | 'type'> | null
): string {
  if (!isTechnicalLabel(device?.name)) return device!.name!;
  if (!isTechnicalLabel(session.device) && session.device !== 'Unknown device') return session.device!;
  const os = session.operatingSystem?.toLowerCase() ?? '';
  if (device?.type === 'mobile' || session.platform === 'mobile' || /android|ios|iphone|ipad/.test(os)) return 'Mobile device';
  if (/mac|ios/.test(os)) return 'Mac computer';
  if (/windows/.test(os)) return 'Windows computer';
  if (/linux/.test(os)) return 'Linux computer';
  return 'Computer or browser';
}

export function getOsTypeInfo(
  session: Pick<SessionDocument, 'operatingSystem' | 'platform' | 'browser'>,
  device?: Pick<DeviceDocument, 'type'> | null
): { label: string; iconCategory: 'android' | 'ios' | 'chrome' | 'mac' | 'windows' | 'mobile' | 'desktop' } {
  const os = (session.operatingSystem || '').toLowerCase();
  const browser = (session.browser || '').toLowerCase();

  if (os.includes('android')) return { label: 'Android device', iconCategory: 'android' };
  if (os.includes('ios') || os.includes('iphone') || os.includes('ipad')) return { label: 'iOS device', iconCategory: 'ios' };
  if (os.includes('chrome os') || browser.includes('chrome os')) return { label: 'Chrome OS device', iconCategory: 'chrome' };
  if (os.includes('mac') || os.includes('darwin')) return { label: 'macOS device', iconCategory: 'mac' };
  if (os.includes('win')) return { label: 'Windows device', iconCategory: 'windows' };
  if (os.includes('linux')) return { label: 'Linux device', iconCategory: 'desktop' };
  if (session.platform === 'mobile' || device?.type === 'mobile') return { label: 'Mobile device', iconCategory: 'mobile' };
  return { label: 'Desktop device', iconCategory: 'desktop' };
}

export function formatAbsoluteDate(date: Date): string {
  return new Intl.DateTimeFormat('en', { dateStyle: 'medium', timeStyle: 'short' }).format(date);
}

export function formatLastActive(date: Date, now = new Date()): string {
  const minutes = Math.max(0, Math.floor((now.getTime() - date.getTime()) / 60_000));
  if (minutes < 2) return 'Active now';
  if (minutes < 60) return `${minutes} minutes ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} ${hours === 1 ? 'hour' : 'hours'} ago`;
  return formatAbsoluteDate(date);
}

export function formatSignedOutTime(date: Date, now = new Date()): string {
  const minutes = Math.max(0, Math.floor((now.getTime() - date.getTime()) / 60_000));
  if (minutes < 2) return 'signed out just now';
  if (minutes < 60) return `signed out ${minutes} minutes ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `signed out ${hours} ${hours === 1 ? 'hour' : 'hours'} ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `signed out ${days} ${days === 1 ? 'day' : 'days'} ago`;
  return `signed out ${formatAbsoluteDate(date)}`;
}

export function presentSession(
  session: SessionDocument,
  currentSessionId: string,
  device: DeviceDocument | null,
  now = new Date()
): FriendlySession {
  const location = session.location ?? device?.lastSeenLocation;
  const browser = session.browser || device?.browser || 'Unknown browser';
  const system = session.operatingSystem || device?.operatingSystem || 'Unknown system';
  const isRevokedOrExpired = session.revoked || session.expiresAt <= now;
  const { label: osTypeLabel, iconCategory } = getOsTypeInfo(session, device);

  const activeTimeText = isRevokedOrExpired
    ? formatSignedOutTime(session.revokedAt || session.lastActivityAt, now)
    : formatLastActive(session.lastActivityAt, now);

  const deviceTypeSubtitle = `${osTypeLabel} – ${activeTimeText}`;

  return {
    deviceName: friendlyDeviceName(session, device),
    browserAndSystem: `${browser} on ${system}`,
    osTypeLabel,
    deviceTypeSubtitle,
    location: friendlyLocation(location),
    maskedIp: maskIpAddress(session.ipAddress),
    signedInAt: formatAbsoluteDate(session.createdAt),
    lastActive: formatLastActive(session.lastActivityAt, now),
    isCurrent: session._id.toString() === currentSessionId,
    isMobile: device?.type === 'mobile' || session.platform === 'mobile',
    iconCategory,
    revoked: isRevokedOrExpired,
  };
}

export function presentActivity(attempt: LoginAttemptDocument): FriendlyActivity {
  const place = friendlyLocation({ city: attempt.city, country: attempt.country });
  const device = !isTechnicalLabel(attempt.device) ? attempt.device : 'an unknown device';
  return {
    title: attempt.success ? 'Signed in successfully' : 'Sign-in needs attention',
    description: attempt.success
      ? `Signed in from ${device} near ${place}.`
      : `An unsuccessful sign-in was recorded from ${device} near ${place}.`,
    occurredAt: formatAbsoluteDate(attempt.createdAt),
    warning: !attempt.success,
  };
}

