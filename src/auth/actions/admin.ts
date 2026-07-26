'use server';

import { revalidatePath } from 'next/cache';
import { InsufficientRoleError } from '../dal';
import { withCsrfGuard } from '../lib/csrf';
import { AdminService } from '../services/admin.service';

export type AdminRevokeState = { error?: string; success?: boolean };

/** Admin-only: force-logout every session (and refresh family) for one user. */
async function adminRevokeUserSessionsActionImpl(
  _prev: AdminRevokeState | undefined,
  formData: FormData
): Promise<AdminRevokeState> {
  const userIdRaw = typeof formData.get('userId') === 'string'
    ? (formData.get('userId') as string)
    : '';

  try {
    const adminService = new AdminService();
    await adminService.revokeUserSessions(userIdRaw);

    revalidatePath('/dashboard/admin/users');
    return { success: true };
  } catch (err) {
    if (err instanceof InsufficientRoleError) {
      return { error: 'You do not have permission to perform this action.' };
    }
    return { error: err instanceof Error ? err.message : 'Unable to revoke user sessions.' };
  }
}

/** Admin-only: force-logout EVERY user's sessions (breach-response button). */
async function adminRevokeAllSessionsActionImpl(): Promise<AdminRevokeState> {
  try {
    const adminService = new AdminService();
    await adminService.revokeAllSessions();

    revalidatePath('/dashboard/admin/users');
    return { success: true };
  } catch (err) {
    if (err instanceof InsufficientRoleError) {
      return { error: 'You do not have permission to perform this action.' };
    }
    return { error: err instanceof Error ? err.message : 'Unable to revoke all sessions.' };
  }
}

export const adminRevokeUserSessionsAction = withCsrfGuard(adminRevokeUserSessionsActionImpl);
export const adminRevokeAllSessionsAction = withCsrfGuard(adminRevokeAllSessionsActionImpl);
