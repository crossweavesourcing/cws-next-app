import { ProductRepository } from '@/auth/repositories/product.repository';
import { CategoryRepository } from '@/auth/repositories/category.repository';
import { ProductManagerClient } from './ProductManagerClient';
import { getAuthSession } from '@/auth/dal';
import { redirect } from 'next/navigation';

export default async function ProductsRoute() {
  const session = await getAuthSession();
  if (!session) redirect('/dashboard/login');

  const productRepo = new ProductRepository();
  const products = await productRepo.findAll();

  const categoryRepo = new CategoryRepository();
  const categories = await categoryRepo.findAll();

  const serializedProducts = products.map(p => ({
    ...p,
    _id: p._id.toString(),
    categoryId: p.categoryId?.toString() || null,
    createdAt: p.createdAt.toISOString(),
    updatedAt: p.updatedAt.toISOString(),
  })) as any[];

  const serializedCategories = categories.map(cat => ({
    ...cat,
    _id: cat._id.toString(),
    createdAt: cat.createdAt.toISOString(),
    updatedAt: cat.updatedAt.toISOString(),
  })) as any[];

  return <ProductManagerClient products={serializedProducts} categories={serializedCategories} />;
}
