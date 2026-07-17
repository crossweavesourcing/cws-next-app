'use server';

import { revalidatePath } from 'next/cache';
import { requireActiveSession } from '../dal';
import { DeviceRepository } from '../repositories/device.repository';
import { AuditLogRepository } from '../repositories/audit-log.repository';
import { withCsrfGuard } from '../lib/csrf';

export type DeviceActionState = { error?: string; success?: boolean };

/**
 * Ownership-checked helper: confirms the device belongs to the current user
 * and the id is well-formed before allowing any mutation.
 */
async function resolveOwnedDevice(deviceId: string) {
  if (!DeviceRepository.isValidDeviceId(deviceId)) {
    return null;
  }
  const session = await requireActiveSession();
  const device = await new DeviceRepository().findByIdForUser(deviceId, session.userId);
  if (!device) return null;
  return { session, device };
}

/**
 * Server Action: trust/untrust a device. Mutates device trust state + audit.
 *
 * C1: wrapped with `withCsrfGuard` (device trust CSRF vector).
 */
async function trustDeviceActionImpl(
  _prev: DeviceActionState | undefined,
  formData: FormData
): Promise<DeviceActionState> {
  const deviceId = typeof formData.get('deviceId') === 'string' ? (formData.get('deviceId') as string) : '';
  const trusted = formData.get('trusted') === 'true';
  if (!deviceId) return { error: 'Invalid device.' };

  try {
    const owned = await resolveOwnedDevice(deviceId);
    if (!owned) return { error: 'You do not have access to this device.' };

    await new DeviceRepository().setTrusted(deviceId, owned.session.userId, trusted, 'user');
    await new AuditLogRepository().log({
      userId: owned.session.userId,
      sessionId: owned.session._id,
      action: trusted ? 'auth.device.trusted' : 'auth.device.untrusted',
      status: 'SUCCESS',
      errorCode: null,
      actor: { type: 'user', id: owned.session.userId },
      source: { platform: 'web', appVersion: '0.1.0' },
      correlationId: null,
      requestId: null,
      resource: { type: 'device', id: deviceId },
      metadata: { trusted },
      ipAddress: owned.session.ipAddress,
      userAgent: owned.session.userAgent,
    });

    revalidatePath('/dashboard/security');
    return { success: true };
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Unable to update device.' };
  }
}

/**
 * Server Action: block/unblock a device (and its sessions/refresh family).
 *
 * C1: wrapped with `withCsrfGuard` (device block CSRF vector).
 */
async function blockDeviceActionImpl(
  _prev: DeviceActionState | undefined,
  formData: FormData
): Promise<DeviceActionState> {
  const deviceId = typeof formData.get('deviceId') === 'string' ? (formData.get('deviceId') as string) : '';
  const blocked = formData.get('blocked') === 'true';
  if (!deviceId) return { error: 'Invalid device.' };

  try {
    const owned = await resolveOwnedDevice(deviceId);
    if (!owned) return { error: 'You do not have access to this device.' };

    await new DeviceRepository().setBlocked(
      deviceId,
      owned.session.userId,
      blocked,
      'user',
      blocked ? 'Blocked by user from device management' : null,
      // FIX-13: pass the device's Mongo _id so the block can immediately revoke
      // its active sessions + refresh family (not only at next login).
      owned.device._id
    );
    await new AuditLogRepository().log({
      userId: owned.session.userId,
      sessionId: owned.session._id,
      action: blocked ? 'auth.device.blocked' : 'auth.device.unblocked',
      status: 'SUCCESS',
      errorCode: null,
      actor: { type: 'user', id: owned.session.userId },
      source: { platform: 'web', appVersion: '0.1.0' },
      correlationId: null,
      requestId: null,
      resource: { type: 'device', id: deviceId },
      metadata: { blocked },
      ipAddress: owned.session.ipAddress,
      userAgent: owned.session.userAgent,
    });

    revalidatePath('/dashboard/security');
    return { success: true };
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Unable to update device.' };
  }
}

/**
 * Server Action: rename a device.
 *
 * C1: wrapped with `withCsrfGuard` (device rename CSRF vector).
 */
async function renameDeviceActionImpl(
  _prev: DeviceActionState | undefined,
  formData: FormData
): Promise<DeviceActionState> {
  const deviceId = typeof formData.get('deviceId') === 'string' ? (formData.get('deviceId') as string) : '';
  const name = typeof formData.get('name') === 'string' ? (formData.get('name') as string).slice(0, 120) : '';
  if (!deviceId) return { error: 'Invalid device.' };

  try {
    const owned = await resolveOwnedDevice(deviceId);
    if (!owned) return { error: 'You do not have access to this device.' };

    await new DeviceRepository().setName(deviceId, owned.session.userId, name || null);
    await new AuditLogRepository().log({
      userId: owned.session.userId,
      sessionId: owned.session._id,
      action: 'auth.device.renamed',
      status: 'SUCCESS',
      errorCode: null,
      actor: { type: 'user', id: owned.session.userId },
      source: { platform: 'web', appVersion: '0.1.0' },
      correlationId: null,
      requestId: null,
      resource: { type: 'device', id: deviceId },
      metadata: { name: name || null },
      ipAddress: owned.session.ipAddress,
      userAgent: owned.session.userAgent,
    });

    revalidatePath('/dashboard/security');
    return { success: true };
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Unable to rename device.' };
  }
}

export const trustDeviceAction = withCsrfGuard(trustDeviceActionImpl);
export const blockDeviceAction = withCsrfGuard(blockDeviceActionImpl);
export const renameDeviceAction = withCsrfGuard(renameDeviceActionImpl);
