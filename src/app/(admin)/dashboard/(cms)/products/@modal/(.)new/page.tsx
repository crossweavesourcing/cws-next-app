import { getAuthSession } from '@/auth/dal';
import { redirect } from 'next/navigation';
import { CategoryRepository } from '@/auth/repositories/category.repository';
import { NewProductClient } from './NewProductClient';

export default async function NewProductIntercept() {
  const session = await getAuthSession();
  if (!session) redirect('/dashboard/login');

  const categoryRepo = new CategoryRepository();
  const categories = await categoryRepo.findAll();

  const serializedCategories = JSON.parse(JSON.stringify(categories.map(cat => ({
    ...cat,
    _id: cat._id.toString(),
    createdAt: cat.createdAt.toISOString(),
    updatedAt: cat.updatedAt.toISOString(),
  }))));

  return <NewProductClient categories={serializedCategories} />;
}
