import { getAuthSession } from '@/auth/dal';
import { redirect } from 'next/navigation';
import { CategoryRepository } from '@/auth/repositories/category.repository';
import { NewProductClient } from './NewProductClient';

export default async function NewProductIntercept() {
  const session = await getAuthSession();
  if (!session) redirect('/dashboard/login');

  const categoryRepo = new CategoryRepository();
  const categories = await categoryRepo.findAll();

  return <NewProductClient categories={categories} />;
}
