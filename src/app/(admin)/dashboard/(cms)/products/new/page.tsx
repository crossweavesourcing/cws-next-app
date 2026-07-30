import { getAuthSession } from '@/auth/dal';
import { redirect } from 'next/navigation';
import { CategoryRepository } from '@/auth/repositories/category.repository';
import { ProductForm } from '../_components/ProductForm';

export default async function NewProductPage() {
  const session = await getAuthSession();
  if (!session) redirect('/dashboard/login');

  const categoryRepo = new CategoryRepository();
  const categories = await categoryRepo.findAll();

  const serializedCategories = categories.map(cat => ({
    ...cat,
    _id: cat._id.toString(),
    createdAt: cat.createdAt.toISOString(),
    updatedAt: cat.updatedAt.toISOString(),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  })) as any[];

  return (
    <div className="mx-auto max-w-3xl py-8">
      <div className="border border-neutral-800 bg-[#101010] p-6 text-white shadow-xl md:p-8">
        <ProductForm categories={serializedCategories} />
      </div>
    </div>
  );
}
