import { requireActiveSession, requireRole } from '@/auth/dal';
import { notFound } from 'next/navigation';
import { CategoryRepository } from '@/auth/repositories/category.repository';
import { Modal } from '../../../_components/Modal';
import { EditCategoryClient } from '../../../_components/EditCategoryClient';

export default async function EditCategoryModalPage({ params }: { params: Promise<{ id: string }> }) {
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
    <Modal>
      <EditCategoryClient category={serializedCategory} />
    </Modal>
  );
}
