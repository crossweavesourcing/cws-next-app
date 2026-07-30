'use client';

import { useState } from 'react';
import { Shield, X } from 'lucide-react';
import { verifySudoPasswordAction } from '@/auth/actions/sudo';

type SudoConfirmModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
};

export function SudoConfirmModal({ isOpen, onClose, onSuccess }: SudoConfirmModalProps) {
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent | React.MouseEvent) => {
    e.preventDefault();
    if (!password) return;

    setLoading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.set('password', password);
      
      const result = await verifySudoPasswordAction({} as { error?: string; success?: boolean }, formData);
      if (result.success) {
        onSuccess();
        setPassword('');
      } else {
        setError(result.error || 'Verification failed');
      }
    } catch {
      setError('An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md border border-neutral-200 bg-white shadow-2xl relative flex flex-col">
        <div className="flex items-center justify-between border-b border-neutral-100 p-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center bg-neutral-100 text-neutral-950">
              <Shield className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-sm font-black uppercase tracking-tight text-neutral-900">Security Verification</h3>
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-neutral-400">Action Required</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-neutral-400 hover:text-neutral-900"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6">
          <p className="text-sm font-semibold text-neutral-900 mb-2">Confirm your password</p>
          <p className="text-xs text-neutral-500 mb-6 leading-relaxed">
            For your security, you must confirm your password to continue this action because your session started a while ago.
          </p>

          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Your password"
            className="block w-full border border-neutral-300 p-3 text-sm outline-none focus:border-neutral-900 transition-colors mb-2"
            autoFocus
          />
          {error && <p className="text-xs text-red-600 font-medium">{error}</p>}
        </form>

        <div className="flex items-center justify-end gap-3 border-t border-neutral-100 bg-neutral-50 p-5">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="px-4 py-2 text-[10px] font-bold uppercase tracking-[0.14em] text-neutral-600 hover:text-neutral-900 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={loading || !password}
            className="bg-[#E02424] px-5 py-2.5 text-[10px] font-bold uppercase tracking-[0.14em] text-white transition-colors hover:bg-[#c91f1f] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Verifying...' : 'Confirm'}
          </button>
        </div>
      </div>
    </div>
  );
}
