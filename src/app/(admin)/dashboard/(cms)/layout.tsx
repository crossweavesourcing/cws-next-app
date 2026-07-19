import type { ReactNode } from 'react';
import { DashboardProvider } from './_components/DashboardContext';
import { CmsDashboardLayoutClient } from './_components/CmsDashboardLayoutClient';
import { requireActiveSession } from '@/auth/dal';
import { redirect } from 'next/navigation';

export default async function CmsLayout({ children }: { children: ReactNode }) {
  const session = await requireActiveSession();
  if (!session) {
    redirect('/dashboard/login');
  }

  return (
    <DashboardProvider>
      <CmsDashboardLayoutClient>{children}</CmsDashboardLayoutClient>
    </DashboardProvider>
  );
}
