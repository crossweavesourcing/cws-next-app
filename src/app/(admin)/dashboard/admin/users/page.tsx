import { requireRole } from '@/auth/dal';
import { redirect } from 'next/navigation';
import { UserRepository } from '@/auth/repositories/user.repository';
import { ShieldCheck, Users } from 'lucide-react';
import AdminUsersClient from './AdminUsersClient';

export default async function AdminUsersPage() {
  // Server-side RBAC: never trust any client-provided role.
  try {
    await requireRole('admin');
  } catch {
    redirect('/dashboard');
  }

  const users = await new UserRepository().listUsers(100);

  const rows = users.map((u) => ({
    id: u._id.toString(),
    displayName: u.displayName,
    email: u.email,
    role: u.role,
    status: u.status,
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
          <div className="flex items-center gap-3 border-b border-neutral-200 bg-[#101010] p-6 text-white sm:p-8">
            <span className="flex h-11 w-11 items-center justify-center border border-white/15 bg-white/5 text-[#E02424]">
              <Users className="h-5 w-5" />
            </span>
            <div>
              <span className="block text-[10px] font-bold uppercase tracking-[0.18em] text-[#E02424]">
                Administration
              </span>
              <h1 className="mt-1 text-2xl font-black uppercase tracking-tight sm:text-3xl">
                Users &amp; Sessions
              </h1>
            </div>
          </div>

          <div className="space-y-8 p-6 sm:p-8">
            <AdminUsersClient rows={rows} />
          </div>
        </div>
      </div>
    </main>
  );
}
