'use server';

import { revalidatePath } from 'next/cache';
import { UserManagementService } from '../services/user-management.service';
import { withCsrfGuard } from '../lib/csrf';
import type { ActionState } from './action-state';
import type { UserRole, CmsPermission } from '@/types/auth';

const service = new UserManagementService();

export const createUserAction = withCsrfGuard(async (
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> => {
  try {
    const email = (formData.get('email') as string)?.trim();
    const fullName = (formData.get('fullName') as string)?.trim() || undefined;
    const displayName = (formData.get('displayName') as string)?.trim() || undefined;
    const role = formData.get('role') as UserRole;
    
    // Extract permissions (checkboxes with name="permissions")
    const permissions = formData.getAll('permissions') as CmsPermission[];

    if (!email || (!fullName && !displayName) || !role) {
      return { success: false, error: 'Please provide email, role, and at least a Full Name or a Nickname.' };
    }

    await service.createUser({
      email,
      fullName,
      displayName,
      role,
      permissions: role === 'manager' ? permissions : undefined,
    });

    revalidatePath('/dashboard/users');
    return { success: true };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'An unknown error occurred.' };
  }
});

export const changeUserRoleAction = withCsrfGuard(async (
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> => {
  try {
    const userId = formData.get('userId') as string;
    const newRole = formData.get('role') as UserRole;

    if (!userId || !newRole) {
      return { success: false, error: 'User ID and new role must be provided.' };
    }

    await service.changeUserRole(userId, newRole);
    revalidatePath('/dashboard/users');
    return { success: true };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'An unknown error occurred.' };
  }
});

export const setManagerPermissionsAction = withCsrfGuard(async (
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> => {
  try {
    const userId = formData.get('userId') as string;
    const permissions = formData.getAll('permissions') as CmsPermission[];

    if (!userId) {
      return { success: false, error: 'User ID must be provided.' };
    }

    await service.setManagerPermissions(userId, permissions);
    revalidatePath('/dashboard/users');
    return { success: true };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'An unknown error occurred.' };
  }
});

export const deleteUserAction = withCsrfGuard(async (
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> => {
  try {
    const userId = formData.get('userId') as string;
    if (!userId) {
      return { success: false, error: 'User ID must be provided.' };
    }

    await service.deleteUser(userId);
    revalidatePath('/dashboard/users');
    return { success: true };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'An unknown error occurred.' };
  }
});

export const undoDeleteUserAction = withCsrfGuard(async (
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> => {
  try {
    const userId = formData.get('userId') as string;
    if (!userId) {
      return { success: false, error: 'User ID must be provided.' };
    }

    await service.undoDeleteUser(userId);
    revalidatePath('/dashboard/users');
    return { success: true };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'An unknown error occurred.' };
  }
});
