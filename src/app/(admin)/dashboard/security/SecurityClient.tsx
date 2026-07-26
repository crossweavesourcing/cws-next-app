'use client';

import { useActionState } from 'react';
import {
  trustDeviceAction,
  blockDeviceAction,
  renameDeviceAction,
  updateTwoFaPreferenceAction,
} from '@/auth/actions/device';

export interface LoginRow {
  id: string;
  success: boolean;
  ipAddress: string | null;
  failureReason: string | null;
  createdAt: string;
  userAgent: string | null;
}

export interface DeviceRow {
  id: string;
  deviceId: string;
  label: string;
  lastSeenAt: string | null;
  trusted: boolean;
  blocked: boolean;
}

function formatDate(iso: string | null): string {
  if (!iso) return 'unknown';
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}

export default function SecurityClient({
  loginRows,
  deviceRows,
  twoFaPreference,
}: {
  loginRows: LoginRow[];
  deviceRows: DeviceRow[];
  twoFaPreference: 'always' | 'new_device_only';
}) {
  return (
    <div className="space-y-10">
      <section>
        <h2 className="mb-3 text-xs font-bold uppercase tracking-[0.18em] text-neutral-500">
          Two-Factor Authentication Settings
        </h2>
        <div className="border border-neutral-200 p-4">
          <TwoFaPreferenceToggle preference={twoFaPreference} />
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-xs font-bold uppercase tracking-[0.18em] text-neutral-500">
          Recent Login Activity
        </h2>
        {loginRows.length === 0 ? (
          <p className="text-sm text-neutral-500">No recent login activity.</p>
        ) : (
          <ul className="divide-y divide-neutral-200 border border-neutral-200">
            {loginRows.map((row) => (
              <li key={row.id} className="flex items-start justify-between gap-4 p-3 text-sm">
                <div className="min-w-0">
                  <p className="font-medium text-neutral-900">
                    {row.success ? 'Successful sign-in' : 'Failed sign-in'}
                    {!row.success && row.failureReason && (
                      <span className="ml-2 font-normal text-red-600">— {row.failureReason}</span>
                    )}
                  </p>
                  <p className="truncate text-xs text-neutral-500">
                    {row.ipAddress ?? 'unknown IP'} · {row.userAgent ?? 'unknown device'}
                  </p>
                </div>
                <span className="shrink-0 text-xs text-neutral-400">{formatDate(row.createdAt)}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <h2 className="mb-3 text-xs font-bold uppercase tracking-[0.18em] text-neutral-500">
          Your Devices
        </h2>
        {deviceRows.length === 0 ? (
          <p className="text-sm text-neutral-500">No devices registered yet.</p>
        ) : (
          <ul className="space-y-3">
            {deviceRows.map((row) => (
              <DeviceCard key={row.id} row={row} />
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function DeviceCard({ row }: { row: DeviceRow }) {
  return (
    <li className="border border-neutral-200 p-4">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="break-words text-sm font-bold uppercase tracking-wide text-neutral-900">
            {row.label}
          </p>
          <p className="text-xs text-neutral-500">Last seen {formatDate(row.lastSeenAt)}</p>
          <div className="mt-1 flex gap-2">
            {row.trusted && (
              <span className="rounded bg-emerald-600 px-2 py-0.5 text-[10px] font-bold uppercase text-white">
                Trusted
              </span>
            )}
            {row.blocked && (
              <span className="rounded bg-red-600 px-2 py-0.5 text-[10px] font-bold uppercase text-white">
                Blocked
              </span>
            )}
          </div>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1">
          <TrustToggle deviceId={row.deviceId} trusted={row.trusted} />
          <BlockToggle deviceId={row.deviceId} blocked={row.blocked} />
        </div>
      </div>
      <RenameForm deviceId={row.deviceId} label={row.label} />
    </li>
  );
}

const actionBtn =
  'inline-flex min-h-8 items-center border border-neutral-300 bg-white px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-[0.14em] text-neutral-700 transition-colors hover:border-[#E02424] hover:text-[#E02424] disabled:cursor-not-allowed disabled:opacity-50';

function TrustToggle({ deviceId, trusted }: { deviceId: string; trusted: boolean }) {
  const [, formAction, isPending] = useActionState(trustDeviceAction, undefined);
  return (
    <form action={formAction} className="flex flex-col items-end gap-1">
      <input type="hidden" name="deviceId" value={deviceId} />
      <input type="hidden" name="trusted" value={(!trusted).toString()} />
      <button type="submit" disabled={isPending} className={actionBtn}>
        {isPending ? '…' : trusted ? 'Untrust' : 'Trust'}
      </button>
    </form>
  );
}

function BlockToggle({ deviceId, blocked }: { deviceId: string; blocked: boolean }) {
  const [, formAction, isPending] = useActionState(blockDeviceAction, undefined);
  return (
    <form action={formAction} className="flex flex-col items-end gap-1">
      <input type="hidden" name="deviceId" value={deviceId} />
      <input type="hidden" name="blocked" value={(!blocked).toString()} />
      <button type="submit" disabled={isPending} className={actionBtn}>
        {isPending ? '…' : blocked ? 'Unblock' : 'Block'}
      </button>
    </form>
  );
}

function RenameForm({ deviceId, label }: { deviceId: string; label: string }) {
  const [, formAction, isPending] = useActionState(renameDeviceAction, undefined);
  return (
    <form action={formAction} className="mt-3 flex items-center gap-2">
      <input type="hidden" name="deviceId" value={deviceId} />
      <input
        name="name"
        defaultValue={label === 'Device' ? '' : label}
        placeholder="Label this device (optional)"
        maxLength={120}
        className="min-w-0 flex-1 border border-neutral-300 px-2 py-1.5 text-xs text-neutral-900 outline-none focus:border-neutral-500"
      />
      <button type="submit" disabled={isPending} className={actionBtn}>
        {isPending ? 'Saving…' : 'Rename'}
      </button>
    </form>
  );
}

export function TwoFaPreferenceToggle({ preference }: { preference: 'always' | 'new_device_only' }) {
  const [, formAction, isPending] = useActionState(updateTwoFaPreferenceAction, undefined);

  return (
    <form action={formAction} className="flex flex-col gap-3">
      <div>
        <p className="text-sm font-bold text-neutral-900">Require 2FA</p>
        <p className="mt-1 text-xs text-neutral-500">
          Choose when you want to be asked for a verification code.
        </p>
      </div>
      
      <div className="flex flex-col gap-2 sm:flex-row sm:gap-6">
        <label className="flex cursor-pointer items-center gap-2">
          <input
            type="radio"
            name="preference"
            value="new_device_only"
            defaultChecked={preference === 'new_device_only'}
            onChange={(e) => {
              if (e.target.form) e.target.form.requestSubmit();
            }}
            disabled={isPending}
            className="accent-black"
          />
          <span className="text-sm text-neutral-800">Only on new, untrusted devices</span>
        </label>

        <label className="flex cursor-pointer items-center gap-2">
          <input
            type="radio"
            name="preference"
            value="always"
            defaultChecked={preference === 'always'}
            onChange={(e) => {
              if (e.target.form) e.target.form.requestSubmit();
            }}
            disabled={isPending}
            className="accent-black"
          />
          <span className="text-sm text-neutral-800">Always</span>
        </label>
      </div>
    </form>
  );
}

