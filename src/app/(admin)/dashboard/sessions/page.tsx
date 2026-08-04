import { requireActiveSession } from '@/auth/dal';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { SessionRepository } from '@/auth/repositories/session.repository';
import { Monitor, ShieldCheck } from 'lucide-react';
import SessionsClient from './SessionsClient';

export default async function SessionsPage() {
  const session = await requireActiveSession();
  if (!session) {
    redirect('/dashboard/login');
  }

  const repo = new SessionRepository();
  const sessions = await repo.listForUser(session.userId, 25);
  const currentId = session._id.toString();

  const rows = sessions.map((s) => ({
    id: s._id.toString(),
    device: s.device ?? 'Unknown device',
    browser: s.browser ?? 'Unknown',
    os: s.operatingSystem ?? 'Unknown',
    platform: s.platform ?? 'web',
    ipAddress: s.ipAddress,
    createdAt: s.createdAt.toISOString(),
    lastActivityAt: s.lastActivityAt.toISOString(),
    revoked: s.revoked,
    isCurrent: s._id.toString() === currentId,
  }));

  return (
    <main className="min-h-screen bg-[#101010] text-white font-sans antialiased selection:bg-[#E02424]/20 selection:text-white">
      <div className="mx-auto flex min-h-screen max-w-5xl flex-col px-5 py-10 sm:px-8 lg:px-12">
        <LinkHeader />

        <div className="mt-8 w-full border border-neutral-200 bg-white text-neutral-950">
          <div className="flex items-center gap-3 border-b border-neutral-200 bg-[#101010] p-6 text-white sm:p-8">
            <span className="flex h-11 w-11 items-center justify-center border border-white/15 bg-white/5 text-[#E02424]">
              <Monitor className="h-5 w-5" />
            </span>
            <div>
              <span className="block text-[10px] font-bold uppercase tracking-[0.18em] text-[#E02424]">
                Account Security
              </span>
              <h1 className="mt-1 text-2xl font-black uppercase tracking-tight sm:text-3xl">
                Active Sessions
              </h1>
            </div>
          </div>

          <div className="p-6 sm:p-8">
            <p className="mb-6 text-sm text-neutral-500">
              These are the devices currently signed in to your account. End any session you do not recognize.
            </p>
            <SessionsClient rows={rows} currentSessionId={currentId} />
          </div>
        </div>
      </div>
    </main>
  );
}

function LinkHeader() {
  return (
    <div className="flex items-center justify-between">
      <span className="inline-flex min-h-9 items-center gap-2 border border-white/15 bg-white/5 px-3 py-2 text-[10px] font-bold uppercase tracking-[0.18em] text-[#E02424]">
        <ShieldCheck className="h-4 w-4" /> CWS Admin Portal
      </span>
      <Link
        href="/dashboard"
        className="text-[11px] font-bold uppercase tracking-[0.14em] text-neutral-400 underline hover:text-white"
      >
        Back to dashboard
      </Link>
    </div>
  );
}
