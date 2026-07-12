import { requireAuth } from '@/auth/dal';
import DashboardClientPage from './DashboardClientPage';

/**
 * Server Component wrapper for the admin dashboard.
 * Enforces strong session verification before rendering any client component.
 */
export default async function DashboardPage() {
  await requireAuth();

  return <DashboardClientPage />;
}
