import { requireActiveSession, requireRole } from '@/auth/dal';
import { notFound, redirect } from 'next/navigation';
import { headers } from 'next/headers';
import { CategoryRepository } from '@/auth/repositories/category.repository';
import { Modal } from '../../../_components/Modal';
import { EditCategoryClient } from '../../../_components/EditCategoryClient';

export default async function EditCategoryModalPage({ params }: { params: Promise<{ id: string }> }) {
  await requireActiveSession();
  await requireRole('admin');
  
  const p = await params;
  let id = p?.id;
  if (!id) {
    const referer = (await headers()).get('referer') || '';
    const match = referer.match(/\/categories\/([^\/]+)\/edit/);
    if (match) id = match[1];
  }
  
  if (!id) {
    redirect('/dashboard/categories');
  }
  
  const categoryRepo = new CategoryRepository();
  const category = await categoryRepo.findById(id);

  if (!category) {
    notFound();
  }

  // Ensure complete serialization of any hidden ObjectIds or Dates
  const baseSerialized = {
    ...category,
    _id: category._id.toString(),
    createdAt: category.createdAt.toISOString(),
    updatedAt: category.updatedAt.toISOString(),
  };

  const serializedCategory = JSON.parse(JSON.stringify(baseSerialized));

  return (
    <Modal>
      <EditCategoryClient category={serializedCategory} />
    </Modal>
  );
}
