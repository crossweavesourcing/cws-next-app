import { getAuthSession } from '@/auth/dal';
import { redirect } from 'next/navigation';
import { ProductRepository } from '@/auth/repositories/product.repository';
import { CategoryRepository } from '@/auth/repositories/category.repository';
import { EditProductForm } from '../../_components/EditProductForm';

export default async function EditProductPage({ params }: { params: Promise<{ id: string }> }) {
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

  return (
    <div className="mx-auto max-w-3xl py-8">
      <div className="border border-neutral-800 bg-[#101010] p-6 text-white shadow-xl md:p-8">
        <EditProductForm product={product} categories={categories} />
      </div>
    </div>
  );
}
