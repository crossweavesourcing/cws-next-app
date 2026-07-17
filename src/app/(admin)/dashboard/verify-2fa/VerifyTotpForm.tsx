'use client';

import { useActionState } from 'react';
import { verifyTotpAction, type VerifyTotpState } from '@/auth/actions/verify-totp';

export default function VerifyTotpForm() {
  const [state, action, isPending] = useActionState<VerifyTotpState, FormData>(
    verifyTotpAction,
    {}
  );

  return (
    <form action={action} className="mt-4 flex flex-col gap-4">
      {state?.error && (
        <div className="text-sm text-red-600 font-medium">{state.error}</div>
      )}

      <div>
        <label htmlFor="code" className="sr-only">
          TOTP Code
        </label>
        <input
          id="code"
          name="code"
          type="text"
          inputMode="numeric"
          autoComplete="one-time-code"
          pattern="[0-9]*"
          maxLength={6}
          placeholder="000000"
          required
          className="w-full border border-neutral-300 p-3 text-center text-2xl tracking-[0.5em] focus:border-black focus:outline-none"
        />
      </div>

      <button
        type="submit"
        disabled={isPending}
        className="flex w-full justify-center bg-black p-3 text-sm font-bold uppercase tracking-wide text-white hover:bg-neutral-800 disabled:opacity-50"
      >
        {isPending ? 'Verifying...' : 'Verify App Code'}
      </button>
    </form>
  );
}
