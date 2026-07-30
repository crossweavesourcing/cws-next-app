import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { PendingAuthenticationRepository } from '@/auth/repositories/pending-authentication.repository';
import { UserRepository } from '@/auth/repositories/user.repository';
import * as crypto from 'crypto';
import Link from 'next/link';
import { Mail, ShieldAlert, Smartphone } from 'lucide-react';
import Verify2FAForm from './Verify2FAForm';
import VerifyTotpForm from './VerifyTotpForm';

export default async function Verify2FAPage(props: {
  searchParams: Promise<{ method?: string }>;
}) {
  const searchParams = await props.searchParams;
  const cookieStore = await cookies();
  const pending = cookieStore.get('cws_2fa_pending');
  if (!pending?.value) {
    redirect('/dashboard/login');
  }

  const tokenHash = crypto.createHash('sha256').update(pending.value).digest('hex');
  const pendingRepo = new PendingAuthenticationRepository();
  const pendingAuth = await pendingRepo.findByTokenHash(tokenHash);

  // eslint-disable-next-line react-hooks/purity
  if (!pendingAuth || pendingAuth.expiresAt.getTime() < Date.now()) {
    redirect('/dashboard/login');
  }

  const userRepo = new UserRepository();
  const user = await userRepo.findById(pendingAuth.userId);

  if (!user) {
    redirect('/dashboard/login');
  }


  const hasTotp = user.security?.totpEnabled;
  const isEmailOnlyPrimary = pendingAuth.primaryAuthenticationMethod === 'passkey' || pendingAuth.primaryAuthenticationMethod === 'google';
  const primaryLabel = pendingAuth.primaryAuthenticationMethod === 'google'
    ? 'Google sign-in'
    : pendingAuth.primaryAuthenticationMethod === 'passkey'
      ? 'Passkey sign-in'
      : 'Password sign-in';

  const defaultMethod = user.security?.defaultTwoFaMethod || 'email';
  let method = searchParams.method || defaultMethod;

  // Ensure requested method is actually enabled
  if (method === 'totp' && !hasTotp) method = 'email';
  if (isEmailOnlyPrimary) method = 'email';

  return (
    <main className="flex min-h-screen items-center justify-center bg-neutral-100 p-6">
      <div className="w-full max-w-lg border border-neutral-200 bg-white p-6 shadow-sm sm:p-8">
        <div className="mb-6 flex items-start gap-4">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center bg-neutral-950 text-white">
            <ShieldAlert className="h-5 w-5" />
          </span>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#E02424]">
              {primaryLabel}
            </p>
            <h1 className="mt-2 text-xl font-black uppercase tracking-tight text-neutral-900">
              {isEmailOnlyPrimary ? 'Email verification required' : 'Password two-factor verification'}
            </h1>
            <p className="mt-2 text-sm leading-6 text-neutral-600">
              {isEmailOnlyPrimary
                ? 'This sign-in needs an extra email code because the risk check was high. Authenticator apps are used only after password sign-ins.'
                : 'Choose one of your password verification methods to finish signing in.'}
            </p>
          </div>
        </div>

        {hasTotp && !isEmailOnlyPrimary && (
          <div className="mb-6 grid gap-3 sm:grid-cols-2">
            <Link
              href="?method=email"
              aria-current={method === 'email' ? 'page' : undefined}
              className={`border p-4 transition-colors ${method === 'email' ? 'border-[#E02424] bg-[#E02424]/5 text-neutral-950' : 'border-neutral-200 bg-neutral-50 text-neutral-700 hover:border-neutral-400'}`}
            >
              <Mail className="h-5 w-5 text-[#E02424]" />
              <span className="mt-3 block text-xs font-black uppercase tracking-[0.14em]">Email code</span>
              <span className="mt-1 block text-xs leading-5 text-neutral-500">Use the code sent to your email.</span>
            </Link>
            <Link
              href="?method=totp"
              aria-current={method === 'totp' ? 'page' : undefined}
              className={`border p-4 transition-colors ${method === 'totp' ? 'border-[#E02424] bg-[#E02424]/5 text-neutral-950' : 'border-neutral-200 bg-neutral-50 text-neutral-700 hover:border-neutral-400'}`}
            >
              <Smartphone className="h-5 w-5 text-[#E02424]" />
              <span className="mt-3 block text-xs font-black uppercase tracking-[0.14em]">Authenticator</span>
              <span className="mt-1 block text-xs leading-5 text-neutral-500">Use your configured app code.</span>
            </Link>
          </div>
        )}

        <div className="flex flex-col gap-8">
          {method === 'totp' && (
            <div className="border border-neutral-200 bg-neutral-50 p-5">
              <h2 className="mb-2 text-sm font-black uppercase tracking-[0.1em] text-neutral-900">Authenticator app</h2>
              <p className="text-xs leading-5 text-neutral-500">
                Enter the 6-digit code from your authenticator app.
              </p>
              <VerifyTotpForm />
            </div>
          )}

          {method === 'email' && (
            <div className="border border-neutral-200 bg-neutral-50 p-5">
              <h2 className="mb-2 text-sm font-black uppercase tracking-[0.1em] text-neutral-900">Email verification</h2>
              <p className="text-xs leading-5 text-neutral-500">
                Enter the 6-digit code we emailed you. It expires in 5 minutes.
              </p>
              <Verify2FAForm />
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
