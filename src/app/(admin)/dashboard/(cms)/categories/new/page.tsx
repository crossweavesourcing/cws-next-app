import { requireActiveSession, requireRole } from '@/auth/dal';
import { Panel } from '../../_components/DashboardComponents';
import { NewCategoryClient } from '../_components/NewCategoryClient';

export default async function NewCategoryPage() {
  await requireActiveSession();
  await requireRole('admin');

  return (
    <Panel eyebrow="Category Manager" title="Add New Category">
      <div className="mt-8">
        <NewCategoryClient />
      </div>
    </Panel>
  );
}
