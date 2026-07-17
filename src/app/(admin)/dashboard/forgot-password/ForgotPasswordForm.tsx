'use client';

import { useActionState } from 'react';
import Link from 'next/link';
import { requestResetAction, type RequestResetState } from '@/auth/actions/password-reset';

export default function ForgotPasswordForm() {
  const [state, formAction, isPending] = useActionState<RequestResetState, FormData>(
    requestResetAction,
    {}
  );

  return (
    <form action={formAction} className="mt-6 space-y-4">
      {state.success && (
        <div className="border border-green-500/25 bg-green-500/5 px-4 py-3 text-xs font-bold uppercase tracking-[0.14em] text-green-600">
          If that email exists, a reset link is on its way.
        </div>
      )}
      {state.error && (
        <div className="border border-red-500/25 bg-red-500/5 px-4 py-3 text-xs font-bold uppercase tracking-[0.14em] text-red-500">
          {state.error}
        </div>
      )}

      <label className="block">
        <span className="block text-[10px] font-bold uppercase tracking-[0.16em] text-neutral-500">
          Email Address
        </span>
        <input
          type="email"
          name="email"
          required
          className="mt-2 h-12 w-full border border-neutral-200 bg-neutral-50 px-4 text-sm text-neutral-950 outline-none focus:border-neutral-900"
        />
      </label>

      <button
        type="submit"
        disabled={isPending}
        className="inline-flex h-12 w-full items-center justify-center bg-neutral-900 px-5 text-xs font-bold uppercase tracking-[0.18em] text-white transition-colors hover:bg-neutral-700 disabled:bg-neutral-400"
      >
        {isPending ? 'Sending...' : 'Send Reset Link'}
      </button>

      <Link
        href="/dashboard/login"
        className="block text-center text-xs font-bold uppercase tracking-[0.14em] text-neutral-500 hover:text-neutral-900"
      >
        Back to sign in
      </Link>
    </form>
  );
}
