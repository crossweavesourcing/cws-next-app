import { getAuthSession } from '@/auth/dal';
import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { verifySessionSignature } from '@/auth/crypto/token';
import { getEnv } from '@/auth/config/env';
import ChangePasswordForm from './ChangePasswordForm';

export default async function ChangePasswordPage() {
  // FIX-02: accept EITHER a real session OR a valid signed `cws_pw_pending`
  // cookie. The latter is set by the login flow when a password is expired /
  // force-change is required, before any session exists (so the user can set a
  // new password without being bounced back to login).
  const session = await getAuthSession();
  const pendingCookie = (await cookies()).get('cws_pw_pending')?.value;
  const pendingId = pendingCookie
    ? verifySessionSignature(pendingCookie, getEnv().SESSION_SECRET)
    : null;
  if (!session && !pendingId) {
    redirect('/dashboard/login');
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-neutral-100 p-6">
      <div className="w-full max-w-md border border-neutral-200 bg-white p-8 shadow-sm">
        <h1 className="text-xl font-black uppercase tracking-tight text-neutral-900">
          Change Password
        </h1>
        <p className="mt-2 text-sm text-neutral-500">
          For your security, please set a new password before continuing.
        </p>
        <ChangePasswordForm />
      </div>
    </main>
  );
}
