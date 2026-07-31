'use client';

import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { X } from 'lucide-react';

export function CatalogModal({ title, children }: { title: string; children: React.ReactNode }) {
  const router = useRouter(); const closeRef = useRef<HTMLButtonElement>(null);
  useEffect(() => { const previous = document.activeElement as HTMLElement | null; const overflow = document.body.style.overflow; document.body.style.overflow = 'hidden'; closeRef.current?.focus(); const key = (event: KeyboardEvent) => event.key === 'Escape' && router.back(); document.addEventListener('keydown', key); return () => { document.removeEventListener('keydown', key); document.body.style.overflow = overflow; previous?.focus(); }; }, [router]);
  return <div className="fixed inset-0 z-[100] bg-black/80 p-2 sm:p-5" onMouseDown={(event) => event.target === event.currentTarget && router.back()}><div role="dialog" aria-modal="true" aria-labelledby="catalog-modal-title" className="mx-auto flex h-full w-full max-w-6xl flex-col overflow-hidden bg-white shadow-2xl"><header className="flex h-14 shrink-0 items-center justify-between border-b border-neutral-200 bg-white px-4 sm:px-6"><h2 id="catalog-modal-title" className="truncate text-sm font-bold uppercase text-neutral-950">{title}</h2><button ref={closeRef} onClick={() => router.back()} aria-label="Close catalog" className="p-2 text-neutral-500 hover:text-neutral-950"><X className="h-5 w-5" /></button></header><div className="min-h-0 flex-1 overflow-y-auto bg-neutral-200">{children}</div></div></div>;
}
