'use client';

import { useRouter } from 'next/navigation';
import { CategoryForm } from './CategoryForm';

export function NewCategoryClient() {
  const router = useRouter();

  return (
    <div className="max-w-xl bg-[#101010] p-8 text-white border border-neutral-800">
      <CategoryForm 
        onSuccess={() => router.push('/dashboard/categories')}
        onCancel={() => router.push('/dashboard/categories')}
      />
    </div>
  );
}
