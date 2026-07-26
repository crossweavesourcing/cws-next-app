'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Pencil, Trash2 } from 'lucide-react';
import type { CategoryDocument } from '@/types/catalog';
import { Panel } from '../_components/DashboardComponents';
import { deleteCategory } from '@/auth/actions/category.actions';
import { ConfirmDeleteModal } from '../_components/ConfirmDeleteModal';

export function CategoryManagerClient({ categories }: { categories: CategoryDocument[] }) {
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deletingName, setDeletingName] = useState<string>('');
  const [isPending, setIsPending] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const handleDeleteClick = (id: string, name: string) => {
    setDeletingId(id);
    setDeletingName(name);
  };

  const handleConfirmDelete = async () => {
    if (!deletingId) return;
    setIsPending(true);
    setFeedback(null);

    const res = await deleteCategory(deletingId);
    setIsPending(false);
    setDeletingId(null);

    if (res.success) {
      setFeedback({ type: 'success', message: `Category "${deletingName}" was deleted successfully.` });
    } else {
      setFeedback({ type: 'error', message: res.error || 'Failed to delete category.' });
    }
  };

  return (
    <Panel eyebrow="Category Manager" title="Product Category Cards">
      {feedback && (
        <div
          className={`mb-4 border p-3 text-sm font-semibold ${
            feedback.type === 'success'
              ? 'border-green-500/30 bg-green-500/10 text-green-400'
              : 'border-red-500/30 bg-red-500/10 text-red-400'
          }`}
        >
          {feedback.message}
        </div>
      )}

      <div className="mb-4">
        <Link
          href="/dashboard/categories/new"
          scroll={false}
          prefetch={true}
          className="inline-block bg-[#E02424] text-white px-4 py-2 text-xs font-bold uppercase tracking-wider hover:bg-[#c91f1f] transition-colors"
        >
          + Add New Category
        </Link>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {categories.map((category) => {
          const categoryId = category._id?.toString() || '';

          return (
            <article
              key={categoryId}
              className="flex flex-col border bg-white transition-colors border-neutral-200 hover:border-neutral-300"
            >
              <div className="relative h-48 w-full overflow-hidden bg-neutral-200">
                <Image
                  src={category.image}
                  alt={`${category.name} category`}
                  fill
                  sizes="(max-width: 768px) 100vw, 360px"
                  className="object-cover"
                />
                <div className="absolute inset-0 bg-black/10" />
                <div className="absolute z-10 right-3 top-3 flex gap-1.5">
                  <Link
                    href={`/dashboard/categories/${categoryId}/edit`}
                    className="flex h-8 w-8 items-center justify-center bg-white shadow-sm transition-colors hover:bg-[#E02424] hover:text-white text-neutral-600"
                    aria-label={`Edit ${category.name}`}
                    scroll={false}
                    prefetch={true}
                  >
                    <Pencil className="h-4 w-4" />
                  </Link>
                  <button
                    type="button"
                    onClick={() => handleDeleteClick(categoryId, category.name)}
                    className="flex h-8 w-8 items-center justify-center bg-white shadow-sm transition-colors hover:bg-[#E02424] hover:text-white text-neutral-600"
                    aria-label={`Delete ${category.name}`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
              <div className="flex flex-col flex-grow space-y-3 p-5">
                <div className="flex flex-col gap-2 border-b border-neutral-200 pb-3 sm:flex-row sm:items-center sm:justify-between">
                  <h3 className="break-words text-base font-black uppercase tracking-[0.1em] text-neutral-950">
                    {category.name}
                  </h3>
                  <span className={`text-[10px] font-bold uppercase tracking-[0.14em] ${category.visible ? 'text-[#E02424]' : 'text-neutral-400'}`}>
                    {category.visible ? 'Visible' : 'Paused'}
                  </span>
                </div>
                <p className="text-sm leading-relaxed text-neutral-600 flex-grow">{category.description}</p>
              </div>
            </article>
          );
        })}
      </div>

      <ConfirmDeleteModal
        isOpen={Boolean(deletingId)}
        title="Delete Category"
        itemName={deletingName}
        isPending={isPending}
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeletingId(null)}
      />
    </Panel>
  );
}
