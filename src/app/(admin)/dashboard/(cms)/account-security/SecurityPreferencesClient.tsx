'use client';

import { useMemo, useState, useTransition, type ComponentType } from 'react';
import { useRouter } from 'next/navigation';
import {
  Check,
  Laptop,
  Mail,
  ShieldAlert,
  ShieldCheck,
  ShieldOff,
  Smartphone,
} from 'lucide-react';
import {
  updateTwoFaPreferencesAction,
  type UpdateTwoFaPreferencesResult,
} from '@/auth/actions/mfa';
import { SudoConfirmModal } from '@/components/ui/SudoConfirmModal';

type TwoFaPreference = 'always' | 'new_device_only' | 'off';
type TwoFaMethod = 'email' | 'totp';
type SaveStatus = 'idle' | 'saved' | 'error';

type TileOption<Value extends string> = {
  value: Value;
  title: string;
  description: string;
  icon: ComponentType<{ className?: string }>;
  disabled?: boolean;
};

function sanitizeDefaultMethod(
  method: TwoFaMethod | null,
  hasTotp: boolean
): TwoFaMethod {
  if (method === 'totp' && hasTotp) return 'totp';
  return 'email';
}

function PreferenceTile<Value extends string>({
  group,
  option,
  selected,
  pending,
  onSelect,
}: {
  group: string;
  option: TileOption<Value>;
  selected: boolean;
  pending: boolean;
  onSelect: (value: Value) => void;
}) {
  const Icon = option.icon;
  const disabled = pending || option.disabled;

  return (
    <button
      type="button"
      aria-pressed={selected}
      aria-label={`${group}: ${option.title}`}
      disabled={disabled}
      onClick={() => onSelect(option.value)}
      className={[
        'group min-h-[132px] border p-4 text-left transition-colors',
        'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#E02424]',
        selected
          ? 'border-[#E02424] bg-[#E02424]/5 text-neutral-950'
          : 'border-neutral-200 bg-neutral-50 text-neutral-800 hover:border-neutral-400 hover:bg-white',
        disabled ? 'cursor-not-allowed opacity-55' : 'cursor-pointer',
      ].join(' ')}
    >
      <span className="flex items-start justify-between gap-3">
        <span
          className={[
            'flex h-10 w-10 shrink-0 items-center justify-center border',
            selected
              ? 'border-[#E02424]/25 bg-white text-[#E02424]'
              : 'border-neutral-200 bg-white text-neutral-500 group-hover:text-neutral-900',
          ].join(' ')}
        >
          <Icon className="h-5 w-5" />
        </span>
        {selected && (
          <span className="flex h-6 w-6 shrink-0 items-center justify-center bg-[#E02424] text-white">
            <Check className="h-3.5 w-3.5" />
          </span>
        )}
      </span>
      <span className="mt-4 block text-sm font-black uppercase tracking-[0.1em]">
        {option.title}
      </span>
      <span className="mt-2 block text-xs leading-5 text-neutral-600">
        {option.description}
      </span>
    </button>
  );
}

function StatusMessage({
  status,
  message,
  pending,
}: {
  status: SaveStatus;
  message: string | null;
  pending: boolean;
}) {
  if (pending) {
    return (
      <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-neutral-500">
        Saving preferences...
      </p>
    );
  }

  if (status === 'saved') {
    return (
      <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-emerald-700">
        Preferences saved
      </p>
    );
  }

  if (status === 'error' && message) {
    return (
      <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-red-600">
        {message}
      </p>
    );
  }

  return (
    <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-neutral-400">
      Changes save automatically
    </p>
  );
}

export function SecurityPreferencesClient({
  preference,
  defaultMethod,
  hasTotp,
}: {
  preference: TwoFaPreference;
  defaultMethod: TwoFaMethod | null;
  hasTotp: boolean;
}) {
  const router = useRouter();
  const [transitionPending, startTransition] = useTransition();
  const [isSaving, setIsSaving] = useState(false);
  const initialMethod = sanitizeDefaultMethod(defaultMethod, hasTotp);
  const [selectedPreference, setSelectedPreference] = useState<TwoFaPreference>(preference);
  const [selectedMethod, setSelectedMethod] = useState<TwoFaMethod>(initialMethod);
  const [savedPreference, setSavedPreference] = useState<TwoFaPreference>(preference);
  const [savedMethod, setSavedMethod] = useState<TwoFaMethod>(initialMethod);
  const [status, setStatus] = useState<SaveStatus>('idle');
  const [message, setMessage] = useState<string | null>(null);
  const [sudoModalOpen, setSudoModalOpen] = useState(false);
  const [pendingPrefs, setPendingPrefs] = useState<{
    preference: TwoFaPreference;
    method: TwoFaMethod;
  } | null>(null);
  const isPending = transitionPending || isSaving;

  const preferenceOptions = useMemo<Array<TileOption<TwoFaPreference>>>(
    () => [
      {
        value: 'off',
        title: 'Off',
        description: 'Use a password for low-risk sign-ins. Risk checks can still require verification.',
        icon: ShieldOff,
      },
      {
        value: 'new_device_only',
        title: 'New Devices',
        description: 'Ask for verification when a device is new, untrusted, or the sign-in looks unusual.',
        icon: Laptop,
      },
      {
        value: 'always',
        title: 'Always',
        description: 'Require verification every time you sign in for the strongest account protection.',
        icon: ShieldAlert,
      },
    ],
    []
  );

  const methodOptions = useMemo<Array<TileOption<TwoFaMethod>>>(
    () => [
      {
        value: 'email',
        title: 'Email',
        description: 'Receive a one-time code at your verified primary email address.',
        icon: Mail,
      },
      {
        value: 'totp',
        title: 'Authenticator',
        description: hasTotp
          ? 'Use the code from your configured authenticator app.'
          : 'Set up an authenticator app before choosing this method.',
        icon: Smartphone,
        disabled: !hasTotp,
      },
    ],
    [hasTotp]
  );

  const savePreferences = (nextPreference: TwoFaPreference, nextMethod: TwoFaMethod) => {
    if (isPending) {
      return;
    }

    if (
      nextPreference === selectedPreference &&
      nextMethod === selectedMethod
    ) {
      return;
    }

    setSelectedPreference(nextPreference);
    setSelectedMethod(nextMethod);
    setStatus('idle');
    setMessage(null);
    setIsSaving(true);

    startTransition(async () => {
      let result: UpdateTwoFaPreferencesResult;
      try {
        result = await updateTwoFaPreferencesAction(nextPreference, nextMethod);
      } catch (err) {
        result = {
          success: false,
          error: err instanceof Error ? err.message : 'Unable to update preferences.',
        };
      }

      if (!result.success || !result.preference || !result.defaultMethod) {
        if (result.requiresSudo) {
          setPendingPrefs({ preference: nextPreference, method: nextMethod });
          setSudoModalOpen(true);
        } else {
          setSelectedPreference(savedPreference);
          setSelectedMethod(savedMethod);
          setStatus('error');
          setMessage(result.error ?? 'Unable to update preferences.');
        }
        setIsSaving(false);
        return;
      }

      setSavedPreference(result.preference);
      setSavedMethod(result.defaultMethod);
      setSelectedPreference(result.preference);
      setSelectedMethod(result.defaultMethod);
      setStatus('saved');
      setMessage(null);
      router.refresh();
      setIsSaving(false);
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 border border-neutral-200 bg-white p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center bg-neutral-950 text-white">
            <ShieldCheck className="h-5 w-5" />
          </span>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-neutral-500">
              Auto-save
            </p>
            <p className="mt-1 text-sm font-semibold text-neutral-900">
              Pick a password sign-in policy and the method shown first when password 2FA is required.
            </p>
          </div>
        </div>
        <StatusMessage status={status} message={message} pending={isPending} />
      </div>

      <section className="space-y-3">
        <div>
          <p className="text-sm font-black uppercase tracking-[0.1em] text-neutral-900">
            Require 2FA for password sign-in
          </p>
          <p className="mt-1 text-xs leading-5 text-neutral-500">
            Choose when email or authenticator verification is required after email and password.
          </p>
        </div>
        <div className="grid gap-3 md:grid-cols-3">
          {preferenceOptions.map((option) => (
            <PreferenceTile
              key={option.value}
              group="Require 2FA for password sign-in"
              option={option}
              selected={selectedPreference === option.value}
              pending={isPending}
              onSelect={(value) => savePreferences(value, selectedMethod)}
            />
          ))}
        </div>
      </section>

      <section className="space-y-3 border-t border-neutral-200 pt-6">
        <div>
          <p className="text-sm font-black uppercase tracking-[0.1em] text-neutral-900">
            Default password verification method
          </p>
          <p className="mt-1 text-xs leading-5 text-neutral-500">
            Choose the method shown first for password sign-ins. Google and passkey sign-ins use email only for high-risk checks.
          </p>
        </div>
        <div className="grid gap-3 md:grid-cols-3">
          {methodOptions.map((option) => (
            <PreferenceTile
              key={option.value}
              group="Default password verification method"
              option={option}
              selected={selectedMethod === option.value}
              pending={isPending}
              onSelect={(value) => savePreferences(selectedPreference, value)}
            />
          ))}
        </div>
      </section>

      <SudoConfirmModal
        isOpen={sudoModalOpen}
        onClose={() => {
          setSudoModalOpen(false);
          setPendingPrefs(null);
          setSelectedPreference(savedPreference);
          setSelectedMethod(savedMethod);
          setStatus('idle');
          setMessage(null);
        }}
        onSuccess={() => {
          setSudoModalOpen(false);
          if (pendingPrefs) {
            savePreferences(pendingPrefs.preference, pendingPrefs.method);
            setPendingPrefs(null);
          }
        }}
      />
    </div>
  );
}
