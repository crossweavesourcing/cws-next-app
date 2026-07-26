'use client';

import { useState, useActionState } from 'react';
import { revokeSessionAction, revokeAllOtherSessionsAction } from '@/auth/actions/session';
import {
  ChevronDown,
  Clock3,
  Laptop,
  LogOut,
  Monitor,
  ShieldCheck,
  Smartphone,
} from 'lucide-react';

export interface SessionRow {
  id: string;
  device: string;
  browser: string;
  os: string;
  platform: string;
  ipAddress: string;
  createdAt: string;
  lastActivityAt: string;
  revoked: boolean;
  isCurrent: boolean;
}

function formatRelativeTime(isoDate: string): string {
  try {
    const date = new Date(isoDate);
    const now = new Date();
    const minutes = Math.max(0, Math.floor((now.getTime() - date.getTime()) / 60_000));
    if (minutes < 2) return 'active now';
    if (minutes < 60) return `active ${minutes} minutes ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `active ${hours} ${hours === 1 ? 'hour' : 'hours'} ago`;
    const days = Math.floor(hours / 24);
    if (days < 30) return `active ${days} ${days === 1 ? 'day' : 'days'} ago`;
    return `active ${date.toLocaleDateString()}`;
  } catch {
    return 'active recently';
  }
}

function formatSignedOutTime(isoDate: string): string {
  try {
    const date = new Date(isoDate);
    const now = new Date();
    const minutes = Math.max(0, Math.floor((now.getTime() - date.getTime()) / 60_000));
    if (minutes < 2) return 'signed out just now';
    if (minutes < 60) return `signed out ${minutes} minutes ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `signed out ${hours} ${hours === 1 ? 'hour' : 'hours'} ago`;
    const days = Math.floor(hours / 24);
    if (days < 30) return `signed out ${days} ${days === 1 ? 'day' : 'days'} ago`;
    return `signed out on ${date.toLocaleDateString()}`;
  } catch {
    return 'signed out';
  }
}

function getOsLabel(os: string, platform: string): string {
  const normalized = (os || '').toLowerCase();
  if (normalized.includes('android')) return 'Android device';
  if (normalized.includes('ios') || normalized.includes('iphone') || normalized.includes('ipad')) return 'iOS device';
  if (normalized.includes('chrome os')) return 'Chrome OS device';
  if (normalized.includes('mac')) return 'macOS device';
  if (normalized.includes('win')) return 'Windows device';
  if (normalized.includes('linux')) return 'Linux device';
  if (platform === 'mobile') return 'Mobile device';
  return 'Desktop device';
}

export default function SessionsClient({
  rows,
  currentSessionId,
}: {
  rows: SessionRow[];
  currentSessionId: string;
}) {
  const [activeTab, setActiveTab] = useState<'active' | 'inactive'>('active');

  const activeRows = rows.filter((r) => !r.revoked);
  const inactiveRows = rows.filter((r) => r.revoked);

  const displayRows = activeTab === 'active' ? activeRows : inactiveRows;

  return (
    <div className="space-y-6">
      {/* Tab Navigation */}
      <div className="flex items-center justify-between border-b border-neutral-200 pb-3">
        <nav className="flex gap-6" aria-label="Session status tabs">
          <button
            type="button"
            onClick={() => setActiveTab('active')}
            className={`flex items-center gap-2 border-b-2 pb-3 text-sm font-bold transition-colors ${
              activeTab === 'active'
                ? 'border-[#E02424] text-[#E02424]'
                : 'border-transparent text-neutral-500 hover:border-neutral-300 hover:text-neutral-900'
            }`}
          >
            Active <span className="text-xs font-semibold text-neutral-400">({activeRows.length})</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('inactive')}
            className={`flex items-center gap-2 border-b-2 pb-3 text-sm font-bold transition-colors ${
              activeTab === 'inactive'
                ? 'border-[#E02424] text-[#E02424]'
                : 'border-transparent text-neutral-500 hover:border-neutral-300 hover:text-neutral-900'
            }`}
          >
            Inactive <span className="text-xs font-semibold text-neutral-400">({inactiveRows.length})</span>
          </button>
        </nav>

        {activeTab === 'active' && activeRows.length > 1 && (
          <EndAllOtherSessions currentSessionId={currentSessionId} />
        )}
      </div>

      {displayRows.length === 0 ? (
        <div className="border border-neutral-200 bg-white py-12 text-center rounded-xl">
          <Monitor className="mx-auto h-8 w-8 text-neutral-300" />
          <p className="mt-3 text-sm text-neutral-500">
            {activeTab === 'active' ? 'No active sessions found.' : 'No inactive sessions recorded.'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {displayRows.map((row) => (
            <SessionCard key={row.id} row={row} currentSessionId={currentSessionId} />
          ))}
        </div>
      )}
    </div>
  );
}

function SessionCard({
  row,
  currentSessionId,
}: {
  row: SessionRow;
  currentSessionId: string;
}) {
  const [isOpen, setIsOpen] = useState(row.isCurrent);
  const osLabel = getOsLabel(row.os, row.platform);
  const subtitleText = row.revoked
    ? `${osLabel} – ${formatSignedOutTime(row.lastActivityAt)}`
    : `${osLabel} – ${formatRelativeTime(row.lastActivityAt)}`;

  return (
    <div
      className={`border rounded-xl bg-white shadow-sm transition-all overflow-hidden ${
        isOpen ? 'border-neutral-300 shadow-md ring-1 ring-neutral-200' : 'border-neutral-200 hover:border-neutral-300'
      }`}
    >
      <div
        onClick={() => setIsOpen(!isOpen)}
        className="flex cursor-pointer items-center justify-between gap-4 p-5 sm:px-6"
      >
        <div className="flex min-w-0 items-center gap-4 sm:gap-5">
          {/* Left Badge Circular Icon (Google Style) */}
          <div
            className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full transition-colors ${
              row.isCurrent
                ? 'bg-[#E02424]/10 text-[#E02424]'
                : row.revoked
                ? 'bg-neutral-100 text-neutral-400'
                : 'bg-[#E8F0FE] text-[#1A73E8]'
            }`}
          >
            {row.platform === 'mobile' ? (
              <Smartphone className="h-6 w-6 text-[#1A73E8]" />
            ) : row.os.toLowerCase().includes('mac') ? (
              <Laptop className="h-6 w-6 text-[#1A73E8]" />
            ) : (
              <Monitor className="h-6 w-6 text-[#1A73E8]" />
            )}
          </div>

          {/* Device Title & Google-Style Subtitle Text */}
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-base font-bold text-neutral-900 sm:text-lg">
                {row.device}
              </h3>
              {row.isCurrent && (
                <span className="rounded bg-[#E02424]/10 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[#E02424]">
                  This device
                </span>
              )}
              {row.revoked && (
                <span className="rounded bg-neutral-100 px-2.5 py-0.5 text-[10px] font-semibold text-neutral-500">
                  Signed out
                </span>
              )}
            </div>
            {/* Subtitle text matching Google format: Android device – active 2 hours ago */}
            <p className="mt-0.5 text-sm text-neutral-500">{subtitleText}</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {!row.revoked && !row.isCurrent && (
            <div onClick={(e) => e.stopPropagation()}>
              <RevokeButton sessionId={row.id} currentSessionId={currentSessionId} />
            </div>
          )}

          <button
            type="button"
            aria-label="Toggle session details"
            className="flex h-9 w-9 items-center justify-center rounded-full text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700"
          >
            <ChevronDown
              className={`h-5 w-5 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
            />
          </button>
        </div>
      </div>

      {isOpen && (
        <div className="border-t border-neutral-200 bg-neutral-50/50 p-5 sm:px-6">
          <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <DetailItem icon={ShieldCheck} label="IP Address" value={row.ipAddress} />
            <DetailItem icon={Clock3} label="Browser" value={row.browser} />
            <DetailItem icon={Clock3} label="Operating System" value={row.os} />
            <DetailItem icon={Clock3} label="Created At" value={new Date(row.createdAt).toLocaleString()} />
          </dl>

          {!row.revoked && !row.isCurrent && (
            <div className="mt-4 border-t border-neutral-200 pt-4 flex justify-end">
              <RevokeButton sessionId={row.id} currentSessionId={currentSessionId} label="Sign out this device" />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function DetailItem({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof ShieldCheck;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start gap-2.5">
      <Icon className="mt-0.5 h-4 w-4 shrink-0 text-[#E02424]" />
      <div className="min-w-0">
        <dt className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">{label}</dt>
        <dd className="mt-0.5 break-words text-xs font-medium text-neutral-800">{value}</dd>
      </div>
    </div>
  );
}

function RevokeButton({
  sessionId,
  currentSessionId,
  label = 'Sign out',
}: {
  sessionId: string;
  currentSessionId: string;
  label?: string;
}) {
  const [state, formAction, isPending] = useActionState(revokeSessionAction, undefined);

  return (
    <form action={formAction} className="inline-flex items-center">
      <input type="hidden" name="sessionId" value={sessionId} />
      <input type="hidden" name="currentSessionId" value={currentSessionId} />
      <button
        type="submit"
        disabled={isPending}
        className="inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-neutral-300 bg-white px-3 py-1.5 text-xs font-bold text-neutral-700 transition-colors hover:border-[#E02424] hover:bg-[#E02424]/5 hover:text-[#E02424] disabled:opacity-50"
      >
        <LogOut className="h-3.5 w-3.5" />
        {isPending ? 'Signing out...' : label}
      </button>
      {state?.error && (
        <span className="ml-2 text-xs font-bold text-red-500">{state.error}</span>
      )}
    </form>
  );
}

function EndAllOtherSessions({ currentSessionId }: { currentSessionId: string }) {
  const [state, formAction, isPending] = useActionState(revokeAllOtherSessionsAction, undefined);

  return (
    <form action={formAction} className="inline-flex items-center gap-2">
      <input type="hidden" name="currentSessionId" value={currentSessionId} />
      <button
        type="submit"
        disabled={isPending}
        className="inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-neutral-300 bg-white px-3.5 py-1.5 text-xs font-bold text-neutral-700 transition-colors hover:border-[#E02424] hover:text-[#E02424] disabled:opacity-50"
      >
        <LogOut className="h-3.5 w-3.5" />
        {isPending ? 'Signing out all other...' : 'Sign out all other devices'}
      </button>
      {state?.error && <span className="text-xs font-bold text-red-500">{state.error}</span>}
      {state?.success && <span className="text-xs font-bold text-emerald-600">Done</span>}
    </form>
  );
}
