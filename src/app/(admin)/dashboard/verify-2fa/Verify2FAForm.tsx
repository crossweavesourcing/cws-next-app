'use client';

import { useActionState, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { verify2faAction, resend2faAction, type Verify2FAState } from '@/auth/actions/verify-2fa';
import { trustCurrentDeviceAction } from '@/auth/actions/device';

export default function Verify2FAForm() {
  const router = useRouter();
  const [sent, setSent] = useState(false);
  const [state, formAction, isPending] = useActionState<Verify2FAState, FormData>(
    verify2faAction,
    { success: false }
  );
  const [isResending, startResend] = useTransition();

  const [trustPending, startTrust] = useTransition();

  useEffect(() => {
    if (state?.success && !state?.showTrustPrompt) {
      // Explicit success (cookies set, pending cleared).
      router.push('/dashboard');
      router.refresh();
    }
  }, [state, router]);

  const handleTrust = (trust: boolean) => {
    startTrust(async () => {
      if (trust && state?.pendingDeviceId) {
        const fd = new FormData();
        fd.append('deviceId', state.pendingDeviceId);
        await trustCurrentDeviceAction(undefined, fd);
      }
      router.push('/dashboard');
      router.refresh();
    });
  };

  return (
    <form action={formAction} className="mt-6 space-y-4">
      {state.error && (
        <div className="border border-red-500/25 bg-red-500/5 px-4 py-3 text-xs font-bold uppercase tracking-[0.14em] text-red-500">
          {state.error}
        </div>
      )}

      <label className="block">
        <span className="block text-[10px] font-bold uppercase tracking-[0.16em] text-neutral-500">
          Verification Code
        </span>
        <input
          inputMode="numeric"
          name="code"
          required
          maxLength={6}
          placeholder="123456"
          className="mt-2 h-12 w-full border border-neutral-200 bg-neutral-50 px-4 text-sm tracking-[0.3em] text-neutral-950 outline-none focus:border-neutral-900"
        />
      </label>

      <button
        type="submit"
        disabled={isPending}
        className="inline-flex h-12 w-full items-center justify-center bg-neutral-900 px-5 text-xs font-bold uppercase tracking-[0.18em] text-white transition-colors hover:bg-neutral-700 disabled:cursor-not-allowed disabled:bg-neutral-400"
      >
        {isPending ? 'Verifying...' : 'Verify & Sign In'}
      </button>

      <button
        type="button"
        disabled={isResending}
        onClick={() => startResend(async () => { await resend2faAction(); setSent(true); })}
        className="text-xs font-bold uppercase tracking-[0.14em] text-neutral-500 underline hover:text-neutral-900"
      >
        {sent ? 'Code resent to your email' : 'Resend code'}
      </button>

      {state.success && state.showTrustPrompt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-sm bg-white p-6 shadow-xl">
            <h3 className="mb-2 text-sm font-bold uppercase tracking-[0.14em] text-neutral-900">
              Trust this device?
            </h3>
            <p className="mb-6 text-xs text-neutral-600">
              If you trust this device, you won&apos;t be asked for a verification code every time you sign in.
            </p>
            <div className="flex gap-3">
              <button
                type="button"
                disabled={trustPending}
                onClick={() => handleTrust(false)}
                className="flex-1 border border-neutral-200 py-3 text-[10px] font-bold uppercase tracking-[0.18em] text-neutral-600 transition hover:bg-neutral-50 disabled:opacity-50"
              >
                No, skip
              </button>
              <button
                type="button"
                disabled={trustPending}
                onClick={() => handleTrust(true)}
                className="flex-1 bg-neutral-900 py-3 text-[10px] font-bold uppercase tracking-[0.18em] text-white transition hover:bg-neutral-700 disabled:opacity-50"
              >
                Yes, trust
              </button>
            </div>
          </div>
        </div>
      )}
    </form>
  );
}
