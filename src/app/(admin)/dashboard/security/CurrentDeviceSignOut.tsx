'use client';

import { useState } from 'react';
import { LogOut } from 'lucide-react';

export function CurrentDeviceSignOut() {
  const [pending, setPending] = useState(false);

  return (
    <button
      type="button"
      disabled={pending}
      onClick={async () => {
        setPending(true);
        const response = await fetch('/api/auth/logout', { method: 'POST' });
        if (response.ok) window.location.href = '/dashboard/login';
        else setPending(false);
      }}
      className="inline-flex min-h-11 items-center justify-center gap-2 border border-[#E02424] px-5 text-xs font-bold text-[#E02424] transition-colors hover:bg-[#E02424] hover:text-white disabled:cursor-wait disabled:opacity-60"
    >
      <LogOut className="h-4 w-4" />
      {pending ? 'Signing out…' : 'Sign out'}
    </button>
  );
}
