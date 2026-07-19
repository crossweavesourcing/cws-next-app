import { notFound } from 'next/navigation';
import { CategoryRepository } from '@/auth/repositories/category.repository';
import { EditCategoryClient } from '../../_components/EditCategoryClient';
import { requireActiveSession, requireRole } from '@/auth/dal';
import { Panel } from '../../../_components/DashboardComponents';

export default async function EditCategoryPage({ params }: { params: Promise<{ id: string }> }) {
  await requireActiveSession();
  await requireRole('admin');

  const { id } = await params;
  
  const categoryRepo = new CategoryRepository();
  const category = await categoryRepo.findById(id);

  if (!category) {
    notFound();
  }

  const serializedCategory = {
    ...category,
    _id: category._id.toString(),
    createdAt: category.createdAt.toISOString(),
    updatedAt: category.updatedAt.toISOString(),
  } as any;

  return (
    <Panel eyebrow="Category Manager" title="Edit Category">
      <div className="mt-8">
        <EditCategoryClient category={serializedCategory} />
      </div>
    </Panel>
  );
}
