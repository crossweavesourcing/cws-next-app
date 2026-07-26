'use client';

import { useActionState, useEffect, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { verifyTotpAction, type VerifyTotpState } from '@/auth/actions/verify-totp';
import { trustCurrentDeviceAction } from '@/auth/actions/device';

export default function VerifyTotpForm() {
  const router = useRouter();
  const [state, action, isPending] = useActionState<VerifyTotpState, FormData>(
    verifyTotpAction,
    { success: false }
  );

  const [trustPending, startTrust] = useTransition();

  useEffect(() => {
    if (state?.success && !state?.showTrustPrompt) {
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

      {state?.success && state.showTrustPrompt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-sm bg-white p-6 shadow-xl">
            <h3 className="mb-2 text-sm font-bold uppercase tracking-[0.14em] text-neutral-900">
              Trust this device?
            </h3>
            <p className="mb-6 text-xs text-neutral-600">
              If you trust this device, you won't be asked for a verification code every time you sign in.
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
