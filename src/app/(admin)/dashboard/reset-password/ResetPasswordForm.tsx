'use client';

import { useActionState } from 'react';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { resetPasswordAction, type ResetPasswordState } from '@/auth/actions/password-reset';

export default function ResetPasswordForm({ token }: { token: string }) {
  const router = useRouter();
  const [state, formAction, isPending] = useActionState<ResetPasswordState, FormData>(
    resetPasswordAction,
    {}
  );

  useEffect(() => {
    if (state.success) {
      router.push('/dashboard/login');
      router.refresh();
    }
  }, [state, router]);

  return (
    <form action={formAction} className="mt-6 space-y-4">
      <input type="hidden" name="token" value={token} />

      {state.error && (
        <div className="border border-red-500/25 bg-red-500/5 px-4 py-3 text-xs font-bold uppercase tracking-[0.14em] text-red-500">
          {state.error}
        </div>
      )}

      <label className="block">
        <span className="block text-[10px] font-bold uppercase tracking-[0.16em] text-neutral-500">
          New Password
        </span>
        <input
          type="password"
          name="newPassword"
          required
          minLength={12}
          className="mt-2 h-12 w-full border border-neutral-200 bg-neutral-50 px-4 text-sm text-neutral-950 outline-none focus:border-neutral-900"
        />
      </label>

      <label className="block">
        <span className="block text-[10px] font-bold uppercase tracking-[0.16em] text-neutral-500">
          Confirm New Password
        </span>
        <input
          type="password"
          name="confirmPassword"
          required
          minLength={12}
          className="mt-2 h-12 w-full border border-neutral-200 bg-neutral-50 px-4 text-sm text-neutral-950 outline-none focus:border-neutral-900"
        />
      </label>

      <button
        type="submit"
        disabled={isPending}
        className="inline-flex h-12 w-full items-center justify-center bg-neutral-900 px-5 text-xs font-bold uppercase tracking-[0.18em] text-white transition-colors hover:bg-neutral-700 disabled:bg-neutral-400"
      >
        {isPending ? 'Updating...' : 'Reset Password'}
      </button>
    </form>
  );
}
