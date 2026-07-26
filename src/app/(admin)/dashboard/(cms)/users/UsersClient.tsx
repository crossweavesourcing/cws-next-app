'use client';

import { useState, useActionState, useEffect } from 'react';
import { UserPlus, Shield, Settings2, X, Trash2, Undo2 } from 'lucide-react';
import { UserAvatar } from '../_components/UserAvatar';
import type { UserRole, CmsPermission } from '@/types/auth';
import { ALL_CMS_PERMISSIONS } from '@/types/auth';
import { 
  createUserAction, 
  setManagerPermissionsAction,
  deleteUserAction,
  undoDeleteUserAction
} from '@/auth/actions/user-management';
import type { ActionState } from '@/auth/actions/action-state';

type UserRow = {
  _id: string; // Serialized ID
  displayName: string;
  avatarUrl: string | null;
  role: UserRole;
  permissions: CmsPermission[];
  status: string;
  email: string | null;
};

export function UsersClient({
  initialUsers,
  callerRole,
  callerId,
}: {
  initialUsers: UserRow[];
  callerRole: UserRole;
  callerId: string;
}) {
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingPermissionsFor, setEditingPermissionsFor] = useState<UserRow | null>(null);
  
  const [showDeleted, setShowDeleted] = useState(false);
  const [userToDelete, setUserToDelete] = useState<UserRow | null>(null);
  const [userToUndo, setUserToUndo] = useState<UserRow | null>(null);

  const [addState, addFormAction, addIsPending] = useActionState<ActionState, FormData>(
    createUserAction,
    { success: false }
  );

  const [permState, permFormAction, permIsPending] = useActionState<ActionState, FormData>(
    setManagerPermissionsAction,
    { success: false }
  );

  const [delState, delFormAction, delIsPending] = useActionState<ActionState, FormData>(
    deleteUserAction,
    { success: false }
  );

  const [undoState, undoFormAction, undoIsPending] = useActionState<ActionState, FormData>(
    undoDeleteUserAction,
    { success: false }
  );

  const [newRole, setNewRole] = useState<UserRole>('manager');

  useEffect(() => {
    if (addState.success) {
      setIsAddModalOpen(false);
    }
  }, [addState]);

  useEffect(() => {
    if (permState.success) {
      // eslint-disable-next-line react-hooks/exhaustive-deps
      setEditingPermissionsFor(null);
    }
  }, [permState]);

  useEffect(() => {
    if (delState.success) {
      // eslint-disable-next-line react-hooks/exhaustive-deps
      setUserToDelete(null);
    }
  }, [delState]);

  useEffect(() => {
    if (undoState.success) {
      // eslint-disable-next-line react-hooks/exhaustive-deps
      setUserToUndo(null);
    }
  }, [undoState]);

  const visibleUsers = initialUsers.filter(u => showDeleted ? u.status === 'deleted' : u.status !== 'deleted');

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <label className="flex items-center gap-2 text-sm font-medium text-neutral-700 cursor-pointer select-none">
          <input 
            type="checkbox" 
            checked={showDeleted} 
            onChange={(e) => setShowDeleted(e.target.checked)} 
            className="w-4 h-4 border-neutral-300 text-neutral-900 focus:ring-neutral-900 rounded-sm"
          />
          Show Deleted Users
        </label>
        <button
          onClick={() => setIsAddModalOpen(true)}
          className="inline-flex items-center gap-2 bg-[#1E1E1E] text-white px-4 py-2 text-sm font-bold uppercase tracking-wider hover:bg-black transition-colors"
        >
          <UserPlus className="w-4 h-4" />
          Add User
        </button>
      </div>

      <div className="bg-white border border-neutral-200 shadow-sm overflow-hidden">
        <table className="w-full text-left text-sm whitespace-nowrap">
          <thead className="bg-neutral-50/80 border-b border-neutral-200 text-xs font-bold uppercase tracking-wider text-neutral-500">
            <tr>
              <th className="px-6 py-4">User</th>
              <th className="px-6 py-4">Role</th>
              <th className="px-6 py-4">CMS Permissions</th>
              <th className="px-6 py-4">Status</th>
              <th className="px-6 py-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100">
            {visibleUsers.map((user) => (
              <tr key={user._id} className={`hover:bg-neutral-50/50 transition-colors ${user.status === 'deleted' ? 'opacity-70 grayscale' : ''}`}>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <UserAvatar name={user.displayName} avatarUrl={user.avatarUrl} size={32} />
                    <div>
                      <div className="font-semibold text-neutral-900">{user.displayName}</div>
                      <div className="text-xs text-neutral-500">
                        {user.status === 'deleted' && user.email?.startsWith('deleted::') 
                          ? user.email.replace(/^deleted::\d+::/, '') 
                          : user.email}
                      </div>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-sm text-xs font-bold uppercase tracking-wider ${
                    user.role === 'super_admin' ? 'bg-red-50 text-red-700 border border-red-200' :
                    user.role === 'admin' ? 'bg-blue-50 text-blue-700 border border-blue-200' :
                    'bg-neutral-100 text-neutral-700 border border-neutral-200'
                  }`}>
                    {user.role === 'super_admin' && <Shield className="w-3 h-3" />}
                    {user.role.replace('_', ' ')}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-normal">
                  {user.role === 'manager' ? (
                    user.permissions.length > 0 ? (
                      <div className="flex flex-wrap gap-1.5 max-w-[200px]">
                        {user.permissions.map(p => (
                          <span key={p} className="bg-neutral-100 px-2 py-0.5 text-[10px] uppercase font-bold tracking-wider text-neutral-600 border border-neutral-200">
                            {p.replace('_', ' ')}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <span className="text-neutral-400 italic text-xs">No access</span>
                    )
                  ) : (
                    <span className="text-neutral-500 text-xs">All implicit</span>
                  )}
                </td>
                <td className="px-6 py-4">
                  <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium ${
                    user.status === 'active' ? 'bg-emerald-50 text-emerald-700' : 
                    user.status === 'deleted' ? 'bg-red-50 text-red-700' :
                    'bg-neutral-100 text-neutral-600'
                  }`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${
                      user.status === 'active' ? 'bg-emerald-500' : 
                      user.status === 'deleted' ? 'bg-red-500' :
                      'bg-neutral-400'
                    }`} />
                    {user.status}
                  </span>
                </td>
                <td className="px-6 py-4 text-right">
                  <div className="flex items-center justify-end gap-1">
                    {user.status !== 'deleted' && user.role === 'manager' && (
                      <button
                        onClick={() => setEditingPermissionsFor(user)}
                        className="p-2 text-neutral-400 hover:text-neutral-900 transition-colors"
                        title="Edit Permissions"
                      >
                        <Settings2 className="w-4 h-4" />
                      </button>
                    )}
                    {user.status !== 'deleted' && user._id !== callerId && user.role !== 'super_admin' && (callerRole === 'super_admin' || (callerRole === 'admin' && user.role === 'manager')) && (
                      <button
                        onClick={() => setUserToDelete(user)}
                        className="p-2 text-neutral-400 hover:text-red-600 transition-colors"
                        title="Delete User"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                    {user.status === 'deleted' && user._id !== callerId && user.role !== 'super_admin' && (callerRole === 'super_admin' || (callerRole === 'admin' && user.role === 'manager')) && (
                      <button
                        onClick={() => setUserToUndo(user)}
                        className="p-2 text-neutral-400 hover:text-emerald-600 transition-colors"
                        title="Restore User"
                      >
                        <Undo2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {visibleUsers.length === 0 && (
              <tr>
                <td colSpan={5} className="px-6 py-12 text-center text-sm text-neutral-500">
                  No {showDeleted ? 'deleted' : 'active'} users found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-lg bg-white shadow-xl flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between p-6 border-b border-neutral-100">
              <h2 className="text-lg font-bold uppercase tracking-wide text-neutral-900">Add User</h2>
              <button onClick={() => setIsAddModalOpen(false)} className="text-neutral-400 hover:text-neutral-900">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form action={addFormAction} className="flex-1 overflow-y-auto p-6 space-y-6">
              {addState.error && (
                <div className="border border-red-500/25 bg-red-500/5 px-4 py-3 text-xs font-bold uppercase tracking-[0.14em] text-red-500">
                  {addState.error}
                </div>
              )}
              
              <div className="grid grid-cols-2 gap-4">
                <label className="block col-span-2">
                  <span className="block text-[10px] font-bold uppercase tracking-[0.16em] text-neutral-500 mb-2">Email Address</span>
                  <input type="email" name="email" required className="w-full border border-neutral-200 bg-neutral-50 px-3 py-2 text-sm outline-none focus:border-neutral-900" />
                </label>
                
                <label className="block">
                  <span className="block text-[10px] font-bold uppercase tracking-[0.16em] text-neutral-500 mb-2">First Name</span>
                  <input type="text" name="firstName" required className="w-full border border-neutral-200 bg-neutral-50 px-3 py-2 text-sm outline-none focus:border-neutral-900" />
                </label>

                <label className="block">
                  <span className="block text-[10px] font-bold uppercase tracking-[0.16em] text-neutral-500 mb-2">Last Name</span>
                  <input type="text" name="lastName" required className="w-full border border-neutral-200 bg-neutral-50 px-3 py-2 text-sm outline-none focus:border-neutral-900" />
                </label>
              </div>

              <label className="block">
                <span className="block text-[10px] font-bold uppercase tracking-[0.16em] text-neutral-500 mb-2">Role</span>
                <select 
                  name="role" 
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value as UserRole)}
                  className="w-full border border-neutral-200 bg-neutral-50 px-3 py-2 text-sm outline-none focus:border-neutral-900"
                >
                  <option value="manager">Manager</option>
                  {callerRole === 'super_admin' && (
                    <option value="admin">Admin</option>
                  )}
                </select>
                <p className="mt-1.5 text-xs text-neutral-500">
                  {newRole === 'admin' ? 'Admins have full access to most CMS areas.' : 'Managers need explicit permissions assigned.'}
                </p>
              </label>

              {newRole === 'manager' && (
                <div>
                  <span className="block text-[10px] font-bold uppercase tracking-[0.16em] text-neutral-500 mb-3">Permissions</span>
                  <div className="space-y-2">
                    {ALL_CMS_PERMISSIONS.map(perm => (
                      <label key={perm} className="flex items-center gap-3">
                        <input type="checkbox" name="permissions" value={perm} className="w-4 h-4 border-neutral-300 text-neutral-900 focus:ring-neutral-900" />
                        <span className="text-sm text-neutral-700 capitalize">{perm.replace('_', ' ')}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              <div className="pt-4 flex justify-end gap-3 border-t border-neutral-100">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 text-xs font-bold uppercase tracking-wider text-neutral-500 hover:text-neutral-900"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={addIsPending}
                  className="bg-[#1E1E1E] text-white px-4 py-2 text-xs font-bold uppercase tracking-wider hover:bg-black transition-colors disabled:opacity-50"
                >
                  {addIsPending ? 'Creating...' : 'Create User'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {editingPermissionsFor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-sm bg-white shadow-xl flex flex-col">
            <div className="flex items-center justify-between p-6 border-b border-neutral-100">
              <h2 className="text-lg font-bold uppercase tracking-wide text-neutral-900">Edit Permissions</h2>
              <button onClick={() => setEditingPermissionsFor(null)} className="text-neutral-400 hover:text-neutral-900">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form action={permFormAction} className="p-6 space-y-6">
              <input type="hidden" name="userId" value={editingPermissionsFor._id} />
              
              {permState.error && (
                <div className="border border-red-500/25 bg-red-500/5 px-4 py-3 text-xs font-bold uppercase tracking-[0.14em] text-red-500">
                  {permState.error}
                </div>
              )}

              <div>
                <p className="text-sm text-neutral-600 mb-4">
                  Select the CMS sections <span className="font-semibold text-neutral-900">{editingPermissionsFor.displayName}</span> can access.
                </p>
                <div className="space-y-3">
                  {ALL_CMS_PERMISSIONS.map(perm => (
                    <label key={perm} className="flex items-center gap-3">
                      <input 
                        type="checkbox" 
                        name="permissions" 
                        value={perm} 
                        defaultChecked={editingPermissionsFor.permissions.includes(perm)}
                        className="w-4 h-4 border-neutral-300 text-neutral-900 focus:ring-neutral-900" 
                      />
                      <span className="text-sm text-neutral-700 capitalize">{perm.replace('_', ' ')}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="pt-4 flex justify-end gap-3 border-t border-neutral-100">
                <button
                  type="button"
                  onClick={() => setEditingPermissionsFor(null)}
                  className="px-4 py-2 text-xs font-bold uppercase tracking-wider text-neutral-500 hover:text-neutral-900"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={permIsPending}
                  className="bg-[#1E1E1E] text-white px-4 py-2 text-xs font-bold uppercase tracking-wider hover:bg-black transition-colors disabled:opacity-50"
                >
                  {permIsPending ? 'Saving...' : 'Save Permissions'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {userToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-sm bg-white shadow-xl flex flex-col">
            <div className="flex items-center justify-between p-6 border-b border-neutral-100">
              <h2 className="text-lg font-bold uppercase tracking-wide text-red-600">Delete User</h2>
              <button onClick={() => setUserToDelete(null)} className="text-neutral-400 hover:text-neutral-900">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form action={delFormAction} className="p-6 space-y-6">
              <input type="hidden" name="userId" value={userToDelete._id} />
              
              {delState.error && (
                <div className="border border-red-500/25 bg-red-500/5 px-4 py-3 text-xs font-bold uppercase tracking-[0.14em] text-red-500">
                  {delState.error}
                </div>
              )}

              <p className="text-sm text-neutral-600">
                Are you sure you want to suspend the account for <span className="font-semibold text-neutral-900">{userToDelete.displayName}</span>?
                <br /><br />
                Their sessions will be immediately terminated. Their data will be permanently deleted after 30 days unless restored.
              </p>

              <div className="pt-4 flex justify-end gap-3 border-t border-neutral-100">
                <button
                  type="button"
                  onClick={() => setUserToDelete(null)}
                  className="px-4 py-2 text-xs font-bold uppercase tracking-wider text-neutral-500 hover:text-neutral-900"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={delIsPending}
                  className="bg-red-600 text-white px-4 py-2 text-xs font-bold uppercase tracking-wider hover:bg-red-700 transition-colors disabled:opacity-50"
                >
                  {delIsPending ? 'Deleting...' : 'Delete User'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {userToUndo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-sm bg-white shadow-xl flex flex-col">
            <div className="flex items-center justify-between p-6 border-b border-neutral-100">
              <h2 className="text-lg font-bold uppercase tracking-wide text-emerald-600">Restore User</h2>
              <button onClick={() => setUserToUndo(null)} className="text-neutral-400 hover:text-neutral-900">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form action={undoFormAction} className="p-6 space-y-6">
              <input type="hidden" name="userId" value={userToUndo._id} />
              
              {undoState.error && (
                <div className="border border-red-500/25 bg-red-500/5 px-4 py-3 text-xs font-bold uppercase tracking-[0.14em] text-red-500">
                  {undoState.error}
                </div>
              )}

              <p className="text-sm text-neutral-600">
                Are you sure you want to restore the account for <span className="font-semibold text-neutral-900">{userToUndo.displayName}</span>?
                <br /><br />
                This will allow them to log in again, provided their email hasn&apos;t been claimed by a new user in the meantime.
              </p>

              <div className="pt-4 flex justify-end gap-3 border-t border-neutral-100">
                <button
                  type="button"
                  onClick={() => setUserToUndo(null)}
                  className="px-4 py-2 text-xs font-bold uppercase tracking-wider text-neutral-500 hover:text-neutral-900"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={undoIsPending}
                  className="bg-emerald-600 text-white px-4 py-2 text-xs font-bold uppercase tracking-wider hover:bg-emerald-700 transition-colors disabled:opacity-50"
                >
                  {undoIsPending ? 'Restoring...' : 'Restore User'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
