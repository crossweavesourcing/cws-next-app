import { requireRole, getEffectivePermissions, getAuthUser } from '@/auth/dal';
import { UserManagementService } from '@/auth/services/user-management.service';
import { UsersClient } from './UsersClient';
import type { UserRole } from '@/types/auth';

export const metadata = {
  title: 'Users Management | CWS Admin',
};

export default async function UsersManagementPage() {
  // Only super_admin and admin can access this page
  const session = await requireRole('admin');
  const caller = await getAuthUser(session.userId);
  const effectivePerms = await getEffectivePermissions(session.userId);
  
  if (!caller || !effectivePerms.canManageUsers) {
    throw new Error('Unauthorized access to Users Management');
  }

  const userManagement = new UserManagementService();
  const usersRaw = await userManagement.listManagedUsers(true);
  const users = usersRaw.map(u => ({
    ...u,
    _id: u._id.toString()
  }));

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6">
      <div className="flex items-center justify-between border-b border-neutral-200 pb-5">
        <div>
          <h1 className="text-2xl font-black uppercase tracking-tight text-neutral-950">
            Users Management
          </h1>
          <p className="mt-1 text-sm text-neutral-500">
            Manage system access, roles, and CMS permissions.
          </p>
        </div>
      </div>

      <UsersClient 
        initialUsers={users} 
        callerRole={caller.role} 
        callerId={caller._id.toString()}
      />
    </div>
  );
}
