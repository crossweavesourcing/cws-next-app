'use client';

import { useState } from 'react';
import { startAuthentication } from '@simplewebauthn/browser';
import { useRouter } from 'next/navigation';

export default function VerifyWebAuthnForm() {
  const [error, setError] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleWebAuthnLogin = async () => {
    setIsLoading(true);
    setError('');
    
    try {
      const resp = await fetch('/api/auth/webauthn/login-options', { method: 'POST' });
      if (!resp.ok) {
        throw new Error('Failed to get authentication options');
      }
      const options = await resp.json();
      
      let asseResp;
      try {
        asseResp = await startAuthentication({ optionsJSON: options });
      } catch (e: any) {
        throw new Error(e.message || 'Authentication cancelled or failed');
      }
      
      const verificationResp = await fetch('/api/auth/webauthn/login-verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(asseResp),
      });
      
      if (verificationResp.ok) {
        router.push('/dashboard');
        router.refresh();
      } else {
        const errorData = await verificationResp.json();
        throw new Error(errorData.error || 'Verification failed');
      }
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="mt-4 flex flex-col gap-4">
      {error && <div className="text-sm text-red-600 font-medium">{error}</div>}
      <button
        type="button"
        onClick={handleWebAuthnLogin}
        disabled={isLoading}
        className="flex w-full justify-center bg-black p-3 text-sm font-bold uppercase tracking-wide text-white hover:bg-neutral-800 disabled:opacity-50"
      >
        {isLoading ? 'Verifying...' : 'Use Passkey / WebAuthn'}
      </button>
    </div>
  );
}
