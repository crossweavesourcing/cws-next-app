import { requireActiveSession } from '@/auth/dal';
import { redirect } from 'next/navigation';
import { LoginAttemptRepository } from '@/auth/repositories/login-attempt.repository';
import { getDevicesCollection } from '@/database';
import { ShieldCheck } from 'lucide-react';
import SecurityClient from './SecurityClient';

export default async function SecurityPage() {
  const session = await requireActiveSession();
  if (!session) {
    redirect('/dashboard/login');
  }

  const attemptRepo = new LoginAttemptRepository();
  const attempts = await attemptRepo.recentForUser(session.userId, 30);

  const devicesColl = await getDevicesCollection();
  const devices = await devicesColl
    .find({ userId: session.userId })
    .sort({ lastUsedAt: -1 })
    .limit(20)
    .toArray();

  const loginRows = attempts.map((a) => ({
    id: a._id.toString(),
    success: a.success,
    ipAddress: a.ipAddress,
    failureReason: a.failureReason,
    createdAt: a.createdAt.toISOString(),
    userAgent: a.userAgent,
  }));

  const deviceRows = devices.map((d) => ({
    id: d._id.toString(),
    deviceId: d.deviceId,
    label: d.name ?? d.deviceId ?? 'Device',
    lastSeenAt: d.lastSeenAt ? d.lastSeenAt.toISOString() : null,
    trusted: d.trusted ?? false,
    blocked: d.blocked ?? false,
  }));

  return (
    <main className="min-h-screen bg-[#101010] text-white font-sans antialiased selection:bg-[#E02424]/20 selection:text-white">
      <div className="mx-auto flex min-h-screen max-w-5xl flex-col px-5 py-10 sm:px-8 lg:px-12">
        <div className="flex items-center justify-between">
          <span className="inline-flex min-h-9 items-center gap-2 border border-white/15 bg-white/5 px-3 py-2 text-[10px] font-bold uppercase tracking-[0.18em] text-[#E02424]">
            <ShieldCheck className="h-4 w-4" /> CWS Admin Portal
          </span>
          <a
            href="/dashboard"
            className="text-[11px] font-bold uppercase tracking-[0.14em] text-neutral-400 underline hover:text-white"
          >
            Back to dashboard
          </a>
        </div>

        <div className="mt-8 w-full border border-neutral-200 bg-white text-neutral-950">
          <div className="border-b border-neutral-200 bg-[#101010] p-6 text-white sm:p-8">
            <span className="block text-[10px] font-bold uppercase tracking-[0.18em] text-[#E02424]">
              Account Security
            </span>
            <h1 className="mt-1 text-2xl font-black uppercase tracking-tight sm:text-3xl">
              Login History &amp; Devices
            </h1>
          </div>

          <div className="space-y-8 p-6 sm:p-8">
            <SecurityClient loginRows={loginRows} deviceRows={deviceRows} />
          </div>
        </div>
      </div>
    </main>
  );
}
