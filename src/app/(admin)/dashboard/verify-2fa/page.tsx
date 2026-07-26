import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { PendingAuthenticationRepository } from '@/auth/repositories/pending-authentication.repository';
import { UserRepository } from '@/auth/repositories/user.repository';
import * as crypto from 'crypto';
import Link from 'next/link';
import Verify2FAForm from './Verify2FAForm';
import VerifyTotpForm from './VerifyTotpForm';
import VerifyWebAuthnForm from './VerifyWebAuthnForm';

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
  const hasWebAuthn = user.security?.webAuthnEnabled;

  const defaultMethod = user.security?.defaultTwoFaMethod || 'email';
  let method = searchParams.method || defaultMethod;

  // Ensure requested method is actually enabled
  if (method === 'totp' && !hasTotp) method = 'email';
  if (method === 'webauthn' && !hasWebAuthn) method = 'email';

  return (
    <main className="flex min-h-screen items-center justify-center bg-neutral-100 p-6">
      <div className="w-full max-w-md border border-neutral-200 bg-white p-8 shadow-sm">
        <h1 className="text-xl font-black uppercase tracking-tight text-neutral-900 mb-6">
          Two-Factor Verification
        </h1>
        
        <div className="flex flex-col gap-8">
          {method === 'webauthn' && (
            <div>
              <h2 className="text-sm font-semibold uppercase text-neutral-500 mb-2">Use Passkey</h2>
              <VerifyWebAuthnForm />
            </div>
          )}

          {method === 'totp' && (
            <div>
              <h2 className="text-sm font-semibold uppercase text-neutral-500 mb-2">Authenticator App</h2>
              <VerifyTotpForm />
            </div>
          )}

          {method === 'email' && (
            <div>
              <h2 className="text-sm font-semibold uppercase text-neutral-500 mb-2">Email Verification</h2>
              <p className="mb-4 text-xs text-neutral-500">
                Enter the 6-digit code we emailed you. It expires in 5 minutes.
              </p>
              <Verify2FAForm />
            </div>
          )}
        </div>

        {/* Alternative methods */}
        {(hasTotp || hasWebAuthn) && (
          <div className="mt-8 border-t border-neutral-200 pt-6">
            <h3 className="text-[10px] font-bold uppercase tracking-[0.14em] text-neutral-500 mb-3">Try another way</h3>
            <div className="flex flex-col gap-2">
              {method !== 'email' && (
                <Link href="?method=email" className="text-xs font-semibold text-neutral-900 underline hover:text-[#E02424]">
                  Send code to email
                </Link>
              )}
              {hasTotp && method !== 'totp' && (
                <Link href="?method=totp" className="text-xs font-semibold text-neutral-900 underline hover:text-[#E02424]">
                  Use Authenticator App
                </Link>
              )}
              {hasWebAuthn && method !== 'webauthn' && (
                <Link href="?method=webauthn" className="text-xs font-semibold text-neutral-900 underline hover:text-[#E02424]">
                  Use Passkey
                </Link>
              )}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
