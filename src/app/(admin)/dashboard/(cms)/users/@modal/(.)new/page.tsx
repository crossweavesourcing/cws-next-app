import { getAuthUser, getEffectivePermissions, requireRole } from '@/auth/dal';
import { NewUserClient } from '../../_components/NewUserClient';

export default async function NewUserIntercept() {
  const session = await requireRole('admin');
  const caller = await getAuthUser(session.userId);
  const effectivePerms = await getEffectivePermissions(session.userId);

  if (!caller || !effectivePerms.canManageUsers) {
    throw new Error('Unauthorized access to Users Management');
  }

  return <NewUserClient callerRole={caller.role} variant="modal" />;
}
