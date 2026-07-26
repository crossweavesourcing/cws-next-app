'use client';

import { useState, useTransition } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  Clock3,
  Laptop,
  LogOut,
  MapPin,
  Monitor,
  ShieldCheck,
  Smartphone,
} from 'lucide-react';
import { revokeFriendlySessionAction, revokeAllOtherSessionsAction } from '@/auth/actions/session';
import type { FriendlyActivity, FriendlySession } from '@/auth/presentation/friendly-security';
import { CurrentDeviceSignOut } from './CurrentDeviceSignOut';

interface DevicesTabbedManagerProps {
  activeSessions: Array<FriendlySession & { targetId: string }>;
  inactiveSessions: Array<FriendlySession & { targetId: string }>;
  activity: FriendlyActivity[];
  currentSessionId: string;
}

export function DevicesTabbedManager({
  activeSessions,
  inactiveSessions,
  activity,
  currentSessionId,
}: DevicesTabbedManagerProps) {
  const [activeTab, setActiveTab] = useState<'active' | 'inactive' | 'activity'>('active');
  const [openDetailId, setOpenDetailId] = useState<string | null>(
    activeSessions.find((s) => s.isCurrent)?.targetId || activeSessions[0]?.targetId || null
  );

  return (
    <div className="mt-8 space-y-6">
      {/* Tab Navigation */}
      <nav
        aria-label="Device sections"
        className="flex gap-8 border-b border-neutral-200 bg-white px-6 pt-4 sm:px-8"
      >
        <button
          type="button"
          onClick={() => setActiveTab('active')}
          className={`flex items-center gap-2 border-b-2 px-1 pb-4 text-sm font-bold transition-colors ${
            activeTab === 'active'
              ? 'border-[#E02424] text-[#E02424]'
              : 'border-transparent text-neutral-500 hover:border-neutral-300 hover:text-neutral-900'
          }`}
        >
          Active <span className="text-xs font-semibold text-neutral-400">({activeSessions.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('inactive')}
          className={`flex items-center gap-2 border-b-2 px-1 pb-4 text-sm font-bold transition-colors ${
            activeTab === 'inactive'
              ? 'border-[#E02424] text-[#E02424]'
              : 'border-transparent text-neutral-500 hover:border-neutral-300 hover:text-neutral-900'
          }`}
        >
          Inactive <span className="text-xs font-semibold text-neutral-400">({inactiveSessions.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('activity')}
          className={`flex items-center gap-2 border-b-2 px-1 pb-4 text-sm font-bold transition-colors ${
            activeTab === 'activity'
              ? 'border-[#E02424] text-[#E02424]'
              : 'border-transparent text-neutral-500 hover:border-neutral-300 hover:text-neutral-900'
          }`}
        >
          Recent sign-ins <span className="text-xs font-semibold text-neutral-400">({activity.length})</span>
        </button>
      </nav>

      {/* Tab 1: Active Devices */}
      {activeTab === 'active' && (
        <section className="space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border border-neutral-200 bg-white p-6 rounded-xl shadow-sm">
            <div>
              <h2 className="text-lg font-black uppercase tracking-tight text-neutral-900">
                Where you’re signed in
              </h2>
              <p className="mt-1 text-sm text-neutral-500">
                Devices currently active on your account. You can sign out of any device below.
              </p>
            </div>
            {activeSessions.length > 1 && (
              <SignOutAllOtherButton currentSessionId={currentSessionId} />
            )}
          </div>

          {activeSessions.length === 0 ? (
            <div className="border border-neutral-200 bg-white py-12 text-center rounded-xl">
              <Monitor className="mx-auto h-8 w-8 text-neutral-300" />
              <p className="mt-3 text-sm text-neutral-500">No active devices found.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {activeSessions.map((session) => (
                <DeviceCard
                  key={session.targetId}
                  session={session}
                  isOpen={openDetailId === session.targetId}
                  onToggle={() =>
                    setOpenDetailId(openDetailId === session.targetId ? null : session.targetId)
                  }
                />
              ))}
            </div>
          )}
        </section>
      )}

      {/* Tab 2: Inactive Devices */}
      {activeTab === 'inactive' && (
        <section className="space-y-4">
          <div className="border border-neutral-200 bg-white p-6 rounded-xl shadow-sm">
            <h2 className="text-lg font-black uppercase tracking-tight text-neutral-900">
              Previously signed-in devices
            </h2>
            <p className="mt-1 text-sm text-neutral-500">
              History of devices and sessions that have been signed out or expired.
            </p>
          </div>

          {inactiveSessions.length === 0 ? (
            <div className="border border-neutral-200 bg-white py-12 text-center rounded-xl">
              <Monitor className="mx-auto h-8 w-8 text-neutral-300" />
              <p className="mt-3 text-sm text-neutral-500">No inactive devices recorded.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {inactiveSessions.map((session) => (
                <DeviceCard
                  key={session.targetId}
                  session={session}
                  isOpen={openDetailId === session.targetId}
                  onToggle={() =>
                    setOpenDetailId(openDetailId === session.targetId ? null : session.targetId)
                  }
                  isInactive
                />
              ))}
            </div>
          )}
        </section>
      )}

      {/* Tab 3: Recent Activity */}
      {activeTab === 'activity' && (
        <section className="border border-neutral-200 bg-white p-6 sm:p-8 rounded-xl shadow-sm">
          <div className="border-b border-neutral-200 pb-4">
            <h2 className="text-lg font-black uppercase tracking-tight text-neutral-900">
              Recent sign-in activity
            </h2>
            <p className="mt-1 text-sm text-neutral-500">
              Security log of successful and failed authentication attempts.
            </p>
          </div>
          {activity.length === 0 ? (
            <p className="py-8 text-sm text-neutral-500">No recent activity logged.</p>
          ) : (
            <ol className="divide-y divide-neutral-200">
              {activity.map((item, index) => (
                <li key={`${item.occurredAt}-${index}`} className="flex gap-4 py-4">
                  <span
                    className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
                      item.warning ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'
                    }`}
                  >
                    {item.warning ? (
                      <AlertTriangle className="h-4 w-4" />
                    ) : (
                      <CheckCircle2 className="h-4 w-4" />
                    )}
                  </span>
                  <div className="min-w-0">
                    <h3 className="text-sm font-bold text-neutral-900">{item.title}</h3>
                    <p className="mt-0.5 text-sm text-neutral-600">{item.description}</p>
                    <p className="mt-1 text-xs text-neutral-400">{item.occurredAt}</p>
                  </div>
                </li>
              ))}
            </ol>
          )}
        </section>
      )}
    </div>
  );
}

function DeviceCard({
  session,
  isOpen,
  onToggle,
  isInactive = false,
}: {
  session: FriendlySession & { targetId: string };
  isOpen: boolean;
  onToggle: () => void;
  isInactive?: boolean;
}) {
  const [isPending, startTransition] = useTransition();

  const handleSignOut = () => {
    startTransition(async () => {
      await revokeFriendlySessionAction(session.targetId);
    });
  };

  return (
    <div
      className={`border rounded-xl bg-white shadow-sm transition-all overflow-hidden ${
        isOpen ? 'border-neutral-300 ring-1 ring-neutral-200 shadow-md' : 'border-neutral-200 hover:border-neutral-300'
      }`}
    >
      <div
        onClick={onToggle}
        className="flex cursor-pointer items-center justify-between gap-4 p-5 sm:px-6"
      >
        <div className="flex min-w-0 items-center gap-4 sm:gap-5">
          {/* Left Circular Badge Icon (Google Style) */}
          <div
            className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full transition-colors ${
              session.isCurrent
                ? 'bg-[#E02424]/10 text-[#E02424]'
                : isInactive
                ? 'bg-neutral-100 text-neutral-400'
                : 'bg-[#E8F0FE] text-[#1A73E8]'
            }`}
          >
            {session.iconCategory === 'android' ? (
              <Smartphone className="h-6 w-6 text-[#1A73E8]" />
            ) : session.iconCategory === 'ios' ? (
              <Smartphone className="h-6 w-6 text-[#1A73E8]" />
            ) : session.iconCategory === 'chrome' || session.iconCategory === 'mac' ? (
              <Laptop className="h-6 w-6 text-[#1A73E8]" />
            ) : (
              <Monitor className="h-6 w-6 text-[#1A73E8]" />
            )}
          </div>

          {/* Title and Subtitle Text (matching attached screenshot design & text) */}
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-base font-bold text-neutral-900 sm:text-lg">
                {session.deviceName}
              </h3>
              {session.isCurrent && (
                <span className="rounded bg-[#E02424]/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[#E02424]">
                  This device
                </span>
              )}
              {isInactive && (
                <span className="rounded bg-neutral-100 px-2 py-0.5 text-[10px] font-semibold text-neutral-500">
                  Signed out
                </span>
              )}
            </div>
            {/* Subtitle text matching Google format: Android device – active 2 hours ago */}
            <p className="mt-0.5 text-sm text-neutral-500">
              {session.deviceTypeSubtitle}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Direct Sign Out Button on Card for Active Sessions */}
          {!isInactive && !session.isCurrent && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleSignOut();
              }}
              disabled={isPending}
              className="hidden sm:inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-neutral-300 bg-white px-3 py-1.5 text-xs font-bold text-neutral-700 transition-colors hover:border-[#E02424] hover:bg-[#E02424]/5 hover:text-[#E02424] disabled:opacity-50"
            >
              <LogOut className="h-3.5 w-3.5" />
              {isPending ? 'Signing out...' : 'Sign out'}
            </button>
          )}

          <button
            type="button"
            aria-label="Toggle details"
            className="flex h-9 w-9 items-center justify-center rounded-full text-neutral-400 transition-colors hover:bg-neutral-100 hover:text-neutral-700"
          >
            <ChevronDown
              className={`h-5 w-5 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
            />
          </button>
        </div>
      </div>

      {/* Expanded Accordion Details */}
      {isOpen && (
        <div className="border-t border-neutral-200 bg-neutral-50/50 p-5 sm:px-6">
          <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <DetailItem icon={MapPin} label="Approximate location" value={session.location} />
            <DetailItem icon={ShieldCheck} label="Network / IP" value={session.maskedIp} />
            <DetailItem icon={Clock3} label="Signed in date" value={session.signedInAt} />
            <DetailItem icon={Clock3} label="Browser & System" value={session.browserAndSystem} />
          </dl>

          {!isInactive && (
            <div className="mt-5 flex flex-col gap-3 border-t border-neutral-200 pt-4 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-xs text-neutral-500">
                {session.isCurrent
                  ? 'Signing out of this device will require you to log in again.'
                  : 'Signing out will immediately revoke access for this device.'}
              </p>

              {session.isCurrent ? (
                <CurrentDeviceSignOut />
              ) : (
                <button
                  type="button"
                  onClick={handleSignOut}
                  disabled={isPending}
                  className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-[#E02424] bg-white px-4 text-xs font-bold text-[#E02424] transition-colors hover:bg-[#E02424] hover:text-white disabled:opacity-50"
                >
                  <LogOut className="h-4 w-4" />
                  {isPending ? 'Signing out...' : 'Sign out this device'}
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function SignOutAllOtherButton({ currentSessionId }: { currentSessionId: string }) {
  const [isPending, startTransition] = useTransition();

  const handleSignOutAllOther = () => {
    startTransition(async () => {
      const formData = new FormData();
      formData.append('currentSessionId', currentSessionId);
      await revokeAllOtherSessionsAction(undefined, formData);
    });
  };

  return (
    <button
      type="button"
      onClick={handleSignOutAllOther}
      disabled={isPending}
      className="inline-flex min-h-9 items-center justify-center gap-2 rounded-lg border border-neutral-300 bg-white px-3.5 py-1.5 text-xs font-bold text-neutral-700 transition-colors hover:border-[#E02424] hover:text-[#E02424] disabled:opacity-50"
    >
      <LogOut className="h-3.5 w-3.5" />
      {isPending ? 'Signing out all other...' : 'Sign out all other devices'}
    </button>
  );
}

function DetailItem({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof MapPin;
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
