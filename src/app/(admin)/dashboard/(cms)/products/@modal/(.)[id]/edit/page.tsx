import { getAuthSession } from '@/auth/dal';
import { redirect } from 'next/navigation';
import { ProductRepository } from '@/auth/repositories/product.repository';
import { CategoryRepository } from '@/auth/repositories/category.repository';
import { EditProductClient } from './EditProductClient';

export default async function EditProductIntercept({ params }: { params: Promise<{ id: string }> }) {
  const session = await getAuthSession();
  if (!session) redirect('/dashboard/login');

  const { id } = await params;
  
  const productRepo = new ProductRepository();
  const product = await productRepo.findById(id);
  
  if (!product) {
    redirect('/dashboard/products');
  }

  const categoryRepo = new CategoryRepository();
  const categories = await categoryRepo.findAll();

  const serializedProduct = {
    ...product,
    _id: product._id.toString(),
    categoryId: product.categoryId?.toString() || null,
    createdAt: product.createdAt.toISOString(),
    updatedAt: product.updatedAt.toISOString(),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any;

  const serializedCategories = categories.map(cat => ({
    ...cat,
    _id: cat._id.toString(),
    createdAt: cat.createdAt.toISOString(),
    updatedAt: cat.updatedAt.toISOString(),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  })) as any[];

  return <EditProductClient product={serializedProduct} categories={serializedCategories} />;
}
