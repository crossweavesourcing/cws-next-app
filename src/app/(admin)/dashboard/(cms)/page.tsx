import { requireActiveSession } from '@/auth/dal';
import { OverviewService } from '@/auth/services/overview.service';
import { OverviewClient } from './_components/OverviewClient';

export const metadata = {
  title: 'Dashboard Overview | CWS Admin',
};

export default async function OverviewPage() {
  await requireActiveSession();
  const overviewService = new OverviewService();
  const metrics = await overviewService.getDashboardOverviewMetrics();

  return <OverviewClient metrics={metrics} />;
}
