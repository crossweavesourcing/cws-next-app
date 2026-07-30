'use client';

import { useState } from 'react';
import { startAuthentication } from '@simplewebauthn/browser';
import { useRouter } from 'next/navigation';
import { Fingerprint } from 'lucide-react';
import { getFriendlyPasskeyError } from '@/auth/presentation/passkey-errors';

export function PasskeyLoginButton({ email }: { email: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const hasEmail = email.trim().length > 0;

  const login = async () => {
    setLoading(true);
    setError(null);
    try {
      const normalizedEmail = email.trim().toLowerCase();
      if (!normalizedEmail) {
        throw new Error('Enter your email before using a passkey.');
      }
      const optionsResp = await fetch('/api/auth/webauthn/login-options', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: normalizedEmail }),
      });
      if (!optionsResp.ok) {
        const data = await optionsResp.json().catch(() => null);
        throw new Error(data?.error ?? 'Unable to start passkey sign-in.');
      }
      const options = await optionsResp.json();
      const authentication = await startAuthentication({ optionsJSON: options }).catch((authenticationError: unknown) => {
        throw new Error(getFriendlyPasskeyError(authenticationError, 'sign-in'));
      });
      const verifyResp = await fetch('/api/auth/webauthn/login-verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: normalizedEmail, response: authentication }),
      });
      if (!verifyResp.ok) {
        const data = await verifyResp.json().catch(() => null);
        throw new Error(data?.error ?? 'Passkey sign-in failed.');
      }
      const data = await verifyResp.json().catch(() => null);
      router.push(typeof data?.redirect === 'string' ? data.redirect : '/dashboard');
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Passkey sign-in was cancelled or failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={login}
        disabled={loading}
        className={[
          'inline-flex min-h-12 w-full items-center justify-center gap-3 border px-5 py-3 text-center text-xs font-bold uppercase tracking-[0.18em] transition-colors disabled:cursor-not-allowed disabled:opacity-60',
          hasEmail
            ? 'border-neutral-300 bg-white text-neutral-800 hover:border-[#E02424] hover:bg-neutral-50'
            : 'border-dashed border-neutral-300 bg-neutral-50 text-neutral-500 hover:border-neutral-400',
        ].join(' ')}
      >
        <Fingerprint className="h-4 w-4" />
        {loading ? 'Checking passkey...' : 'Sign in with passkey'}
      </button>
      {!hasEmail && !error && (
        <p className="text-center text-xs font-semibold text-neutral-500">
          Enter your email first so we can find passkeys saved for this device.
        </p>
      )}
      {error && <p className="text-center text-xs font-semibold text-red-600">{error}</p>}
    </div>
  );
}
