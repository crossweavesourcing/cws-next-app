'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef } from 'react';
import { X } from 'lucide-react';

export function Modal({ children }: { children: React.ReactNode }) {
  const overlay = useRef<HTMLDivElement>(null);
  const wrapper = useRef<HTMLDivElement>(null);
  const router = useRouter();

  const onDismiss = useCallback(() => {
    router.back();
  }, [router]);

  const onClick = useCallback(
    (e: React.MouseEvent) => {
      if (e.target === overlay.current || e.target === wrapper.current) {
        if (onDismiss) onDismiss();
      }
    },
    [onDismiss, overlay, wrapper]
  );

  const onKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') onDismiss();
    },
    [onDismiss]
  );

  useEffect(() => {
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [onKeyDown]);

  return (
    <div
      ref={overlay}
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
      onClick={onClick}
    >
      <div
        ref={wrapper}
        className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6"
        onClick={onClick}
      >
        <div className="relative w-full max-w-lg bg-[#101010] p-6 text-white shadow-2xl border border-neutral-800">
          <button
            onClick={onDismiss}
            className="absolute right-4 top-4 text-neutral-400 hover:text-white"
          >
            <X className="h-5 w-5" />
            <span className="sr-only">Close modal</span>
          </button>
          
          <div className="mt-2">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
