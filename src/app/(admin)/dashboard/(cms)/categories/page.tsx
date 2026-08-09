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
  const serializedCategories = JSON.parse(JSON.stringify(categories.map(c => ({
    ...c,
    _id: c._id.toString(),
    createdAt: c.createdAt.toISOString(),
    updatedAt: c.updatedAt.toISOString(),
  }))));

  return <CategoryManagerClient categories={serializedCategories} />;
}
