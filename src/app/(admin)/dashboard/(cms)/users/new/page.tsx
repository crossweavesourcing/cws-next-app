import { getAuthUser, getEffectivePermissions, requireRole } from '@/auth/dal';
import { Panel } from '../../_components/DashboardComponents';
import { NewUserClient } from '../_components/NewUserClient';

export const metadata = {
  title: 'Add User | CWS Admin',
};

export default async function NewUserPage() {
  const session = await requireRole('admin');
  const caller = await getAuthUser(session.userId);
  const effectivePerms = await getEffectivePermissions(session.userId);

  if (!caller || !effectivePerms.canManageUsers) {
    throw new Error('Unauthorized access to Users Management');
  }

  return (
    <div className="mx-auto w-full max-w-4xl">
      <Panel eyebrow="Users Management" title="Add User">
        <div className="mt-8">
          <NewUserClient callerRole={caller.role} variant="page" />
        </div>
      </Panel>
    </div>
  );
}
