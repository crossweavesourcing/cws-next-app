'use client';

import { AlertTriangle } from 'lucide-react';

interface ConfirmDeleteModalProps {
  isOpen: boolean;
  title: string;
  itemName: string;
  isPending: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDeleteModal({
  isOpen,
  title,
  itemName,
  isPending,
  onConfirm,
  onCancel,
}: ConfirmDeleteModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md border border-neutral-800 bg-[#121212] p-6 text-white shadow-2xl">
        <div className="flex items-center gap-3 border-b border-neutral-800 pb-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#E02424]/10 text-[#E02424]">
            <AlertTriangle className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-lg font-black uppercase tracking-tight text-white">{title}</h3>
            <p className="text-xs font-semibold uppercase tracking-wider text-neutral-400">Confirm Action</p>
          </div>
        </div>

        <div className="py-5 text-sm text-neutral-300 leading-relaxed">
          Are you sure you want to delete <span className="font-bold text-white">&quot;{itemName}&quot;</span>? This action cannot be undone.
        </div>

        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            type="button"
            disabled={isPending}
            onClick={onCancel}
            className="border border-neutral-700 bg-transparent px-4 py-2 text-xs font-bold uppercase tracking-wider text-neutral-300 transition-colors hover:bg-neutral-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={isPending}
            onClick={onConfirm}
            className="bg-[#E02424] px-4 py-2 text-xs font-bold uppercase tracking-wider text-white transition-colors hover:bg-[#c91f1f] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white disabled:opacity-50"
          >
            {isPending ? 'Deleting...' : 'Delete'}
          </button>
        </div>
      </div>
    </div>
  );
}
