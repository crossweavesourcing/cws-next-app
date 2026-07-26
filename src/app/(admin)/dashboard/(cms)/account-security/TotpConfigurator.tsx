'use client';

import { useState } from 'react';
import QRCode from 'qrcode';
import { generateTotpSecretAction, verifyAndEnableTotpAction, disableTotpAction } from '@/auth/actions/mfa';
import { Smartphone, X } from 'lucide-react';

export function TotpConfigurator({ initiallyEnabled }: { initiallyEnabled: boolean }) {
  const [enabled, setEnabled] = useState(initiallyEnabled);
  const [setupData, setSetupData] = useState<{ secret: string; qrDataUrl: string } | null>(null);
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);

  const startSetup = async () => {
    setLoading(true);
    setError(null);
    setModalOpen(true);
    try {
      const result = await generateTotpSecretAction();
      if (result.error) throw new Error(result.error);
      if (!result.secret || !result.otpauthUrl) throw new Error('Failed to generate TOTP secret');
      
      const qrDataUrl = await QRCode.toDataURL(result.otpauthUrl, {
        color: { dark: '#000000', light: '#FFFFFF' },
        width: 256,
        margin: 1,
      });
      setSetupData({ secret: result.secret, qrDataUrl });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start setup');
    } finally {
      setLoading(false);
    }
  };

  const closeSetup = () => {
    setModalOpen(false);
    setSetupData(null);
    setCode('');
    setError(null);
  };

  const verifyAndEnable = async () => {
    if (!setupData) return;
    setLoading(true);
    setError(null);
    try {
      const res = await verifyAndEnableTotpAction(setupData.secret, code);
      if (res.success) {
        setEnabled(true);
        closeSetup();
      } else {
        setError(res.error || 'Invalid code');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to verify code');
    } finally {
      setLoading(false);
    }
  };

  const disable = async () => {
    setLoading(true);
    setError(null);
    try {
      await disableTotpAction();
      setEnabled(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to disable');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mt-4">
      {enabled ? (
        <div className="flex flex-col gap-2">
          <p className="text-sm font-semibold text-emerald-600">Authenticator App is configured and active.</p>
          <button
            onClick={disable}
            disabled={loading}
            className="inline-flex max-w-max items-center justify-center border border-[#E02424] bg-white px-4 py-2 text-[10px] font-bold uppercase tracking-[0.14em] text-[#E02424] hover:bg-[#E02424] hover:text-white transition-colors disabled:opacity-50"
          >
            {loading ? 'Disabling...' : 'Remove Authenticator App'}
          </button>
          {error && <p className="text-xs text-red-600">{error}</p>}
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          <button
            onClick={startSetup}
            disabled={loading}
            className="inline-flex max-w-max items-center justify-center bg-neutral-950 px-4 py-2 text-[10px] font-bold uppercase tracking-[0.14em] text-white hover:bg-[#E02424] transition-colors disabled:opacity-50"
          >
            {loading ? 'Starting...' : 'Set up Authenticator App'}
          </button>
          {error && !modalOpen && <p className="text-xs text-red-600">{error}</p>}
        </div>
      )}

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md border border-neutral-200 bg-white shadow-2xl relative flex flex-col max-h-[90vh] overflow-y-auto">
            
            <div className="flex items-center justify-between border-b border-neutral-100 p-5">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center bg-neutral-100 text-neutral-950">
                  <Smartphone className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-sm font-black uppercase tracking-tight text-neutral-900">Authenticator App</h3>
                  <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-neutral-400">Setup Wizard</p>
                </div>
              </div>
              <button
                type="button"
                onClick={closeSetup}
                className="text-neutral-400 hover:text-neutral-900"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-6">
              {!setupData && loading ? (
                <div className="py-12 flex justify-center items-center">
                  <p className="text-sm font-bold uppercase tracking-wider text-neutral-400 animate-pulse">Generating Secure Key...</p>
                </div>
              ) : setupData ? (
                <div className="flex flex-col items-center text-center">
                  <p className="text-sm font-semibold text-neutral-900 mb-2">1. Scan the QR code</p>
                  <p className="text-xs text-neutral-500 mb-6 leading-relaxed max-w-xs">
                    Open your preferred authenticator app (like Google Authenticator or Authy) and scan this QR code.
                  </p>
                  
                  <div className="rounded-xl border border-neutral-200 p-2 shadow-sm mb-8">
                    <img src={setupData.qrDataUrl} alt="QR Code" className="h-48 w-48" />
                  </div>

                  <p className="text-sm font-semibold text-neutral-900 mb-2">2. Enter the verification code</p>
                  <p className="text-xs text-neutral-500 mb-4 leading-relaxed max-w-xs">
                    Enter the 6-digit code generated by your app to verify the connection.
                  </p>
                  
                  <input
                    type="text"
                    maxLength={6}
                    value={code}
                    onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                    placeholder="000000"
                    className="block w-full max-w-[240px] border border-neutral-300 p-3 text-2xl tracking-[0.3em] font-mono text-center outline-none focus:border-neutral-900 transition-colors mb-2"
                  />
                  {error && <p className="text-xs text-red-600 font-medium">{error}</p>}
                </div>
              ) : (
                <div className="py-6">
                  <p className="text-sm text-red-600">{error || 'Something went wrong.'}</p>
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-3 border-t border-neutral-100 bg-neutral-50 p-5">
              <button
                type="button"
                onClick={closeSetup}
                disabled={loading}
                className="px-4 py-2 text-[10px] font-bold uppercase tracking-[0.14em] text-neutral-600 hover:text-neutral-900 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={verifyAndEnable}
                disabled={loading || !setupData || code.length !== 6}
                className="bg-[#E02424] px-5 py-2.5 text-[10px] font-bold uppercase tracking-[0.14em] text-white transition-colors hover:bg-[#c91f1f] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading && setupData ? 'Verifying...' : 'Verify & Enable'}
              </button>
            </div>
            
          </div>
        </div>
      )}
    </div>
  );
}
