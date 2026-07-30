'use client';

import { useState, useTransition } from 'react';
import { startRegistration } from '@simplewebauthn/browser';
import { useRouter } from 'next/navigation';
import { CalendarDays, Edit3, Fingerprint, KeyRound, Plus, ShieldCheck, Trash2 } from 'lucide-react';
import { removePasskeyAction, renamePasskeyAction } from '@/auth/actions/passkey';
import { getFriendlyPasskeyError } from '@/auth/presentation/passkey-errors';
import type { PasskeySummary } from '@/auth/services/mfa.service';

function dateLabel(value: string | null): string {
  if (!value) return 'Never used';
  return new Intl.DateTimeFormat('en', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));
}

function deviceLabel(passkey: PasskeySummary): string {
  return [passkey.deviceName, passkey.browser, passkey.operatingSystem, passkey.deviceType]
    .filter((value): value is string => Boolean(value))
    .join(' · ') || 'Enrolled device';
}

export function PasskeyManager({ passkeys }: { passkeys: PasskeySummary[] }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [setupLoading, setSetupLoading] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [nameDraft, setNameDraft] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const startSetup = async () => {
    setSetupLoading(true);
    setError(null);
    setMessage(null);
    try {
      const optionsResp = await fetch('/api/auth/webauthn/register-options', { method: 'POST' });
      if (!optionsResp.ok) {
        const data = await optionsResp.json().catch(() => null);
        throw new Error(data?.error ?? 'Unable to start passkey setup.');
      }
      const options = await optionsResp.json();
      const registration = await startRegistration({ optionsJSON: options }).catch((setupError: unknown) => {
        throw new Error(getFriendlyPasskeyError(setupError, 'setup'));
      });
      const verifyResp = await fetch('/api/auth/webauthn/register-verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(registration),
      });
      if (!verifyResp.ok) {
        const data = await verifyResp.json().catch(() => null);
        throw new Error(data?.error ?? 'Unable to verify passkey.');
      }
      setMessage('Passkey added');
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Passkey setup was cancelled or failed.');
    } finally {
      setSetupLoading(false);
    }
  };

  const rename = (id: string) => {
    startTransition(async () => {
      setError(null);
      setMessage(null);
      const result = await renamePasskeyAction(id, nameDraft);
      if (!result.success) {
        setError(result.error ?? 'Unable to rename passkey.');
        return;
      }
      setEditingId(null);
      setMessage('Passkey renamed');
      router.refresh();
    });
  };

  const remove = (id: string) => {
    startTransition(async () => {
      setError(null);
      setMessage(null);
      const result = await removePasskeyAction(id);
      if (!result.success) {
        setError(result.error ?? 'Unable to remove passkey.');
        return;
      }
      setMessage('Passkey removed');
      router.refresh();
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 border border-neutral-200 bg-neutral-50 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center bg-white text-[#E02424]">
            <Fingerprint className="h-5 w-5" />
          </span>
          <div>
            <p className="text-sm font-black uppercase tracking-[0.1em] text-neutral-900">
              Passwordless sign-in
            </p>
            <p className="mt-1 text-xs leading-5 text-neutral-600">
              Add a passkey on this device and browser. It will not unlock sign-in from another device.
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={startSetup}
          disabled={setupLoading || isPending}
          className="inline-flex min-h-10 items-center justify-center gap-2 bg-neutral-950 px-4 text-[10px] font-bold uppercase tracking-[0.14em] text-white hover:bg-[#E02424] disabled:cursor-not-allowed disabled:opacity-60"
        >
          <Plus className="h-4 w-4" />
          {setupLoading ? 'Starting...' : 'Add Passkey'}
        </button>
      </div>

      {error && (
        <div className="border border-red-500/25 bg-red-500/5 px-4 py-3 text-xs font-bold uppercase tracking-[0.14em] text-red-600">
          {error}
        </div>
      )}
      {message && (
        <div className="border border-emerald-500/20 bg-emerald-50 px-4 py-3 text-xs font-bold uppercase tracking-[0.14em] text-emerald-700">
          {message}
        </div>
      )}

      <div className="grid gap-3 lg:grid-cols-2">
        {passkeys.length === 0 ? (
          <div className="border border-dashed border-neutral-300 bg-white p-5 text-sm leading-6 text-neutral-600 lg:col-span-2">
            No passkeys are registered yet. Passkeys work only on the device and browser where they are added.
          </div>
        ) : (
          passkeys.map((passkey) => (
            <article key={passkey.id} className="border border-neutral-200 bg-white p-4">
              <div className="flex items-start justify-between gap-4">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center bg-neutral-100 text-[#E02424]">
                  <KeyRound className="h-5 w-5" />
                </span>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setEditingId(passkey.id);
                      setNameDraft(passkey.name ?? '');
                    }}
                    disabled={isPending || setupLoading}
                    aria-label="Rename passkey"
                    className="flex h-9 w-9 items-center justify-center border border-neutral-200 text-neutral-600 hover:border-neutral-400 hover:text-neutral-950 disabled:opacity-50"
                  >
                    <Edit3 className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => remove(passkey.id)}
                    disabled={isPending || setupLoading}
                    aria-label="Remove passkey"
                    className="flex h-9 w-9 items-center justify-center border border-red-200 text-red-600 hover:bg-red-50 disabled:opacity-50"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
              <div className="mt-4 min-w-0">
                {editingId === passkey.id ? (
                  <div className="flex flex-col gap-2 sm:flex-row">
                    <input
                      value={nameDraft}
                      maxLength={80}
                      onChange={(event) => setNameDraft(event.target.value)}
                      className="h-10 min-w-0 border border-neutral-300 px-3 text-sm outline-none focus:border-[#E02424]"
                      placeholder="Passkey name"
                    />
                    <button
                      type="button"
                      onClick={() => rename(passkey.id)}
                      disabled={isPending}
                      className="h-10 bg-neutral-950 px-4 text-[10px] font-bold uppercase tracking-[0.14em] text-white"
                    >
                      Save
                    </button>
                  </div>
                ) : (
                  <h4 className="break-words text-sm font-black uppercase tracking-[0.1em] text-neutral-900">
                    {passkey.name ?? 'Unnamed passkey'}
                  </h4>
                )}
                <p className="mt-2 text-xs leading-5 text-neutral-600">
                  {deviceLabel(passkey)}
                </p>
              </div>
              <div className="mt-4 grid gap-2 border-t border-neutral-100 pt-4 text-xs text-neutral-500">
                <p className="flex items-center gap-2">
                  <ShieldCheck className="h-3.5 w-3.5 text-[#E02424]" />
                  {passkey.deviceObjectId ? 'Bound to enrolled device' : 'Needs re-enrollment on this device'} · {passkey.credentialBackedUp ? 'Backed up' : 'Device bound'}
                </p>
                <p className="flex items-center gap-2">
                  <CalendarDays className="h-3.5 w-3.5 text-[#E02424]" />
                  Added: {dateLabel(passkey.createdAt)} · Last used: {dateLabel(passkey.lastUsedAt)}
                </p>
              </div>
            </article>
          ))
        )}
      </div>
    </div>
  );
}
