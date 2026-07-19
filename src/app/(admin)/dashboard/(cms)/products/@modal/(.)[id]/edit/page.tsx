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

  return <EditProductClient product={product} categories={categories} />;
}
