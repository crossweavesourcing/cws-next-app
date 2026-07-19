'use client';

import { useRouter } from 'next/navigation';
import { EditProductForm } from '../../../_components/EditProductForm';
import type { ProductDocument, CategoryDocument } from '@/types/catalog';

export function EditProductClient({ product, categories }: { product: ProductDocument, categories: CategoryDocument[] }) {
  const router = useRouter();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="relative max-h-[90vh] w-full max-w-3xl overflow-y-auto border border-neutral-800 bg-[#101010] p-6 text-white shadow-2xl md:p-8">
        <EditProductForm 
          product={product} 
          categories={categories} 
          onSuccess={() => router.back()} 
          onCancel={() => router.back()} 
        />
      </div>
    </div>
  );
}
