'use client';

import { useActionState } from 'react';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { changePasswordAction, type ChangePasswordState } from '@/auth/actions/change-password';
import { PasswordStrengthFields } from '@/components/PasswordStrengthFields';

export default function ChangePasswordForm() {
  const router = useRouter();
  const [state, formAction, isPending] = useActionState<ChangePasswordState, FormData>(
    changePasswordAction,
    {}
  );

  useEffect(() => {
    if (state.success) {
      router.push('/dashboard');
      router.refresh();
    }
  }, [state, router]);

  return (
    <form action={formAction} className="mt-6 space-y-4">
      {state.error && (
        <div className="border border-red-500/25 bg-red-500/5 px-4 py-3 text-xs font-bold uppercase tracking-[0.14em] text-red-500">
          {state.error}
        </div>
      )}

      <label className="block">
        <span className="block text-[10px] font-bold uppercase tracking-[0.16em] text-neutral-500">
          Current Password
        </span>
        <input
          type="password"
          name="currentPassword"
          required
          className="mt-2 h-12 w-full border border-neutral-200 bg-neutral-50 px-4 text-sm text-neutral-950 outline-none focus:border-neutral-900"
        />
      </label>

      <fieldset disabled={isPending} className="space-y-4">
        <PasswordStrengthFields weakConfirmationRequested={state.requiresWeakConfirmation} />
      </fieldset>
    </form>
  );
}
