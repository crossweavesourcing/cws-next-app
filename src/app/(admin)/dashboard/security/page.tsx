import Link from 'next/link';
import {
  AlertTriangle,
  ArrowLeft,
  ExternalLink,
  MonitorSmartphone,
  ShieldCheck,
} from 'lucide-react';
import { getFriendlySecurityView } from '@/auth/services/friendly-security.service';
import { DevicesTabbedManager } from './DevicesTabbedManager';
import { TwoFaPreferenceToggle } from './SecurityClient';
import { requireActiveSession } from '@/auth/dal';
import { UserRepository } from '@/auth/repositories/user.repository';

export default async function SecurityPage() {
  const data = await getFriendlySecurityView();
  const session = await requireActiveSession();
  const user = await new UserRepository().findById(session.userId);
  const twoFaPreference = user?.security?.twoFaPreference ?? 'always';

  return (
    <main className="min-h-screen bg-[#F5F5F3] text-neutral-950">
      <header className="border-b border-neutral-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-5 py-5 sm:px-8">
          <Link
            href="/dashboard/account-security"
            className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.14em] text-neutral-600 hover:text-[#E02424]"
          >
            <ArrowLeft className="h-4 w-4" /> Account &amp; Security
          </Link>
          <span className="inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.18em] text-[#E02424]">
            <ShieldCheck className="h-4 w-4" /> CWS Secure
          </span>
        </div>
      </header>

      <div className="mx-auto max-w-5xl px-5 py-10 sm:px-8 sm:py-14">
        {/* Banner Section */}
        <section className="relative overflow-hidden border border-neutral-200 bg-white px-6 py-9 sm:px-10 sm:py-12 rounded-xl shadow-sm">
          <div className="absolute right-0 top-0 h-full w-2 bg-[#E02424]" aria-hidden="true" />
          <div className="grid gap-8 md:grid-cols-[minmax(0,1fr)_260px] md:items-center">
            <div>
              <span className="inline-flex h-14 w-14 items-center justify-center bg-neutral-950 text-white rounded-xl">
                <MonitorSmartphone className="h-7 w-7" />
              </span>
              <h1 className="mt-6 text-3xl font-black uppercase tracking-tight sm:text-4xl">
                Your devices
              </h1>
              <p className="mt-3 max-w-xl text-sm leading-6 text-neutral-600 sm:text-base">
                You’re signed in to your account on these devices. You can sign out of any section or device below.
              </p>
            </div>
            <div className="border-l-2 border-[#E02424] bg-neutral-50 p-5 rounded-r-xl">
              <p className="text-3xl font-black">{data.activeSessions.length}</p>
              <p className="mt-1 text-xs font-bold uppercase tracking-[0.14em] text-neutral-500">
                Active {data.activeSessions.length === 1 ? 'device' : 'devices'}
              </p>
              <p className="mt-3 text-xs leading-5 text-neutral-500">
                The device you are using right now is marked below.
              </p>
            </div>
          </div>
        </section>

        {data.unavailable && (
          <div className="mt-5 flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" /> Some sign-in information is temporarily unavailable.
          </div>
        )}

        <section className="mt-8 rounded-xl border border-neutral-200 bg-white p-6 shadow-sm sm:p-10">
          <h2 className="mb-6 text-sm font-black uppercase tracking-tight text-neutral-900">
            Security Preferences
          </h2>
          <TwoFaPreferenceToggle preference={twoFaPreference} />
        </section>

        {/* Tabbed Devices & Activity Manager */}
        <DevicesTabbedManager
          activeSessions={data.activeSessions}
          inactiveSessions={data.inactiveSessions}
          activity={data.activity}
          currentSessionId={data.currentSessionId}
        />

        <footer className="flex flex-col gap-3 py-8 text-xs text-neutral-500 sm:flex-row sm:items-center sm:justify-between border-t border-neutral-200 mt-12">
          <p>Only approximate location and masked network information are shown.</p>
          <Link
            href="/dashboard/sessions"
            className="inline-flex items-center gap-2 font-bold text-neutral-700 hover:text-[#E02424]"
          >
            Advanced session management <ExternalLink className="h-3.5 w-3.5" />
          </Link>
        </footer>
      </div>
    </main>
  );
}
