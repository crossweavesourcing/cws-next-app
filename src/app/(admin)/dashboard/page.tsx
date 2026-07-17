import { requireActiveSession } from '@/auth/dal';
import DashboardClientPage from './DashboardClientPage';

/**
 * Server Component wrapper for the admin dashboard.
 * Enforces strong session verification (and no forced-password-change state)
 * before rendering any client component.
 */
export default async function DashboardPage() {
  await requireActiveSession();

  return <DashboardClientPage />;
}
