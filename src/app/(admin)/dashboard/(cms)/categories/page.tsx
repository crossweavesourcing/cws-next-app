import { CategoryRepository } from '@/auth/repositories/category.repository';
import { CategoryManagerClient } from './CategoryManagerClient';
import { getAuthSession } from '@/auth/dal';
import { redirect } from 'next/navigation';

export default async function CategoriesRoute() {
  const session = await getAuthSession();
  if (!session) redirect('/dashboard/login');

  const categoryRepo = new CategoryRepository();
  const categories = await categoryRepo.findAll();

  // We convert the documents to POJOs because they contain ObjectIds and Dates
  // that can't be passed directly to Client Components without serialization.
  const serializedCategories = categories.map(cat => ({
    ...cat,
    _id: cat._id.toString(),
    createdAt: cat.createdAt.toISOString(),
    updatedAt: cat.updatedAt.toISOString(),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  })) as any[];

  return <CategoryManagerClient categories={serializedCategories} />;
}
