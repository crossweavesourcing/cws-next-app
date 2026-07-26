import 'server-only';

import { ObjectId } from 'mongodb';
import { UserRepository } from '../repositories/user.repository';
import { requireActiveSession, getAuthUser, InsufficientRoleError } from '../dal';
import type { UserRole, CmsPermission, UserDocument } from '@/types/auth';

export class UserManagementService {
  private userRepo = new UserRepository();

  /**
   * Asserts that the caller is at least an admin and returns their user doc.
   */
  private async requireManagerAccess(): Promise<UserDocument> {
    const session = await requireActiveSession();
    const caller = await getAuthUser(session.userId);
    if (!caller || (caller.role !== 'super_admin' && caller.role !== 'admin')) {
      throw new InsufficientRoleError('admin', caller?.role);
    }
    return caller;
  }

  /**
   * List users visible to the caller.
   * - super_admin: sees all users
   * - admin: sees only managers
   */
  async listManagedUsers(includeDeleted: boolean = false) {
    const caller = await this.requireManagerAccess();
    if (caller.role === 'super_admin') {
      return this.userRepo.listUsers({ includeDeleted });
    }
    // admin only sees managers
    return this.userRepo.listUsers({ role: 'manager', includeDeleted });
  }

  /**
   * Creates a new user.
   * - super_admin can create admin or manager.
   * - admin can only create manager.
   */
  async createUser(data: {
    email: string;
    firstName: string;
    lastName: string;
    role: UserRole;
    permissions?: CmsPermission[];
  }) {
    const caller = await this.requireManagerAccess();

    if (data.role === 'super_admin') {
      throw new Error('Cannot create a super_admin user via UI.');
    }

    if (caller.role === 'admin' && data.role === 'admin') {
      throw new Error('Admins cannot create other admins.');
    }

    const existing = await this.userRepo.findByEmail(data.email);
    if (existing) {
      throw new Error('A user with that email already exists.');
    }

    return this.userRepo.createUser({
      ...data,
      status: 'active',
      metadata: {
        invitedBy: caller._id,
        invitedAt: new Date(),
      }
    });
  }

  /**
   * Updates a user's role.
   * - Only super_admin can do this.
   * - Cannot promote someone to super_admin or demote a super_admin.
   */
  async changeUserRole(targetUserId: string, newRole: UserRole) {
    const caller = await this.requireManagerAccess();
    
    if (caller.role !== 'super_admin') {
      throw new Error('Only super_admin can change user roles.');
    }

    if (newRole === 'super_admin') {
      throw new Error('Cannot promote a user to super_admin via UI.');
    }

    const targetId = new ObjectId(targetUserId);
    const targetUser = await this.userRepo.findById(targetId);
    if (!targetUser) throw new Error('User not found.');

    if (targetUser.role === 'super_admin') {
      throw new Error('Cannot change the role of a super_admin.');
    }

    await this.userRepo.updateRole(targetId, newRole);
  }

  /**
   * Updates a manager's CMS permissions.
   * - super_admin can update any manager.
   * - admin can update any manager.
   * - Cannot be used to assign permissions to a super_admin or admin.
   */
  async setManagerPermissions(targetUserId: string, permissions: CmsPermission[]) {
    await this.requireManagerAccess();
    
    const targetId = new ObjectId(targetUserId);
    const targetUser = await this.userRepo.findById(targetId);
    if (!targetUser) throw new Error('User not found.');

    if (targetUser.role !== 'manager') {
      throw new Error('Permissions can only be explicitly assigned to the manager role.');
    }

    await this.userRepo.updatePermissions(targetId, permissions);
  }

  /**
   * Soft deletes a user (suspends account, frees email).
   */
  async deleteUser(targetUserId: string) {
    const caller = await this.requireManagerAccess();
    
    if (caller._id.toString() === targetUserId) {
      throw new Error('You cannot delete your own account.');
    }

    const targetId = new ObjectId(targetUserId);
    const targetUser = await this.userRepo.findById(targetId);
    if (!targetUser) throw new Error('User not found.');

    if (targetUser.role === 'super_admin') {
      throw new Error('Cannot delete a super_admin.');
    }

    if (caller.role === 'admin' && targetUser.role !== 'manager') {
      throw new Error('Admins can only delete managers.');
    }

    await this.userRepo.softDeleteUser(targetId);
    
    // Revoke sessions
    const { SessionRepository } = await import('../repositories/session.repository');
    const sessionRepo = new SessionRepository();
    await sessionRepo.revokeAllUserSessions(targetId, 'admin');
  }

  /**
   * Undoes a soft delete (restores email, reactivates account).
   */
  async undoDeleteUser(targetUserId: string) {
    const caller = await this.requireManagerAccess();

    const targetId = new ObjectId(targetUserId);
    const targetUser = await this.userRepo.findAnyById(targetId);
    if (!targetUser) throw new Error('User not found.');

    if (targetUser.role === 'super_admin') {
      throw new Error('Cannot restore a super_admin.');
    }

    if (caller.role === 'admin' && targetUser.role !== 'manager') {
      throw new Error('Admins can only restore managers.');
    }

    await this.userRepo.restoreUser(targetId);
  }
}
