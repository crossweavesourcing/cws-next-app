import { CategoryRepository } from '@/auth/repositories/category.repository';
import HomePageClient from './HomePageClient';

export default async function HomePage() {
  const categoryRepo = new CategoryRepository();
  const categories = await categoryRepo.findAll();

  const serializedCategories = categories.map(cat => ({
    ...cat,
    _id: cat._id.toString(),
    createdAt: cat.createdAt.toISOString(),
    updatedAt: cat.updatedAt.toISOString(),
  })) as any[];

  return <HomePageClient categories={serializedCategories} />;
}
