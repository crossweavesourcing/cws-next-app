import { getAuthSession } from '@/auth/dal';
import { redirect } from 'next/navigation';
import { CategoryRepository } from '@/auth/repositories/category.repository';
import { NewProductClient } from './NewProductClient';

export default async function NewProductIntercept() {
  const session = await getAuthSession();
  if (!session) redirect('/dashboard/login');

  const categoryRepo = new CategoryRepository();
  const categories = await categoryRepo.findAll();

  const serializedCategories = categories.map(cat => ({
    ...cat,
    _id: cat._id.toString(),
    createdAt: cat.createdAt.toISOString(),
    updatedAt: cat.updatedAt.toISOString(),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  })) as any[];

  return <NewProductClient categories={serializedCategories} />;
}
