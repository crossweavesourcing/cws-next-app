'use client';

import { useRouter } from 'next/navigation';
import { EditCategoryForm } from './EditCategoryForm';
import type { CategoryDocument } from '@/types/catalog';

export function EditCategoryClient({ category }: { category: CategoryDocument }) {
  const router = useRouter();

  return (
    <div className="max-w-xl bg-[#101010] p-8 text-white border border-neutral-800">
      <EditCategoryForm 
        category={category}
        onSuccess={() => router.push('/dashboard/categories')}
        onCancel={() => router.push('/dashboard/categories')}
      />
    </div>
  );
}
