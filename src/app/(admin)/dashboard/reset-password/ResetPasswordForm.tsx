'use client';

import { useActionState } from 'react';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { resetPasswordAction, type ResetPasswordState } from '@/auth/actions/password-reset';
import { PasswordStrengthFields } from '@/components/PasswordStrengthFields';

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

      <fieldset disabled={isPending} className="space-y-4">
        <PasswordStrengthFields weakConfirmationRequested={state.requiresWeakConfirmation} />
      </fieldset>
    </form>
  );
}
