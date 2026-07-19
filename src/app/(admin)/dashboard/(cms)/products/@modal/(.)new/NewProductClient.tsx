'use client';

import { useRouter } from 'next/navigation';
import { ProductForm } from '../../_components/ProductForm';
import type { CategoryDocument } from '@/types/catalog';

export function NewProductClient({ categories }: { categories: CategoryDocument[] }) {
  const router = useRouter();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="relative max-h-[90vh] w-full max-w-3xl overflow-y-auto border border-neutral-800 bg-[#101010] p-6 text-white shadow-2xl md:p-8">
        <ProductForm 
          categories={categories} 
          onSuccess={() => router.back()} 
          onCancel={() => router.back()} 
        />
      </div>
    </div>
  );
}
