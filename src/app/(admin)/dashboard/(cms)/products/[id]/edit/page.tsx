import { getAuthSession } from '@/auth/dal';
import { redirect } from 'next/navigation';
import { ProductRepository } from '@/auth/repositories/product.repository';
import { CategoryRepository } from '@/auth/repositories/category.repository';
import { EditProductForm } from '../../_components/EditProductForm';
import { CatalogManager } from '../../../_components/CatalogManager';

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

  return (
    <div className="mx-auto max-w-3xl py-8">
      <div className="border border-neutral-800 bg-[#101010] p-6 text-white shadow-xl md:p-8">
        <CatalogManager locked={{ kind: 'product', id: serializedProduct._id, name: serializedProduct.name }} />
        <div className="mt-8 border-t border-white/10 pt-8">
        <EditProductForm product={serializedProduct} categories={serializedCategories} />
        </div>
      </div>
    </div>
  );
}
