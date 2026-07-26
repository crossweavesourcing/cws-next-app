import type { ReactNode } from 'react';
import { DashboardProvider } from './_components/DashboardContext';
import { CmsDashboardLayoutClient } from './_components/CmsDashboardLayoutClient';
import { requireActiveSession, getEffectivePermissions, getAuthUser } from '@/auth/dal';
import { redirect } from 'next/navigation';

export default async function CmsLayout({ children }: { children: ReactNode }) {
  const session = await requireActiveSession();
  if (!session) {
    redirect('/dashboard/login');
  }

  const user = await getAuthUser(session.userId);
  const effectivePerms = await getEffectivePermissions(session.userId);

  return (
    <DashboardProvider>
      <CmsDashboardLayoutClient
        role={effectivePerms.role}
        permissions={effectivePerms.permissions}
        canManageUsers={effectivePerms.canManageUsers}
        userName={user?.profile.displayName ?? 'User'}
        avatarUrl={user?.profile.avatar?.url ?? null}
      >
        {children}
      </CmsDashboardLayoutClient>
    </DashboardProvider>
  );
}
