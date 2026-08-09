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

  // Ensure complete serialization of any hidden ObjectIds or Dates
  const baseSerialized = {
    ...product,
    _id: product._id.toString(),
    categoryId: product.categoryId?.toString() || null,
    relatedProducts: product.relatedProducts?.map((id) => id.toString()) || [],
    createdAt: product.createdAt.toISOString(),
    updatedAt: product.updatedAt.toISOString(),
  };

  const serializedProduct = JSON.parse(JSON.stringify(baseSerialized));

  const serializedCategories = JSON.parse(JSON.stringify(categories.map(cat => ({
    ...cat,
    _id: cat._id.toString(),
    createdAt: cat.createdAt.toISOString(),
    updatedAt: cat.updatedAt.toISOString(),
  }))));

  return <EditProductClient product={serializedProduct} categories={serializedCategories} />;
}
