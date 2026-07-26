import { getAuthSession } from '@/auth/dal';
import { redirect } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import LoginForm from './LoginForm';
import {
  CheckCircle2,
  LockKeyhole,
  ShieldCheck,
} from 'lucide-react';

const accessNotes = [
  'Content sections',
  'Product records',
  'Navigation manager',
  'Media library',
];

export default async function DashboardLoginPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  // If user already has an active, valid session, bypass login page
  const session = await getAuthSession();
  if (session) {
    redirect('/dashboard');
  }
  const { error } = await searchParams;
  const initialError = error === 'invalid'
    ? 'Invalid email address or password.'
    : error === 'blocked'
      ? 'Request blocked. Refresh the page and try again.'
      : error === 'system'
        ? 'An unexpected system error occurred. Please try again later.'
        : undefined;

  return (
    <main className="min-h-screen bg-[#101010] text-white font-sans antialiased selection:bg-[#E02424]/20 selection:text-white">
      <section className="relative min-h-screen overflow-hidden">
        <div className="absolute inset-0">
          <Image
            src="/assets/images/service_private_label_manufacturing.jpg"
            alt="CWS private label manufacturing"
            fill
            priority
            sizes="100vw"
            className="object-cover opacity-35"
          />
          <div className="absolute inset-0 bg-black/55" />
          <div className="absolute inset-0 bg-[linear-gradient(90deg,#101010_0%,rgba(16,16,16,0.94)_34%,rgba(16,16,16,0.62)_100%)]" />
        </div>

        <div className="relative z-10 grid min-h-screen grid-cols-1 lg:grid-cols-[minmax(0,1fr)_520px]">
          <div className="flex min-w-0 flex-col justify-between px-5 py-6 sm:px-8 lg:px-12">
            <Link href="/" className="relative block h-14 w-44" aria-label="Back to CWS home">
              <Image
                src="/cws_logo.png"
                alt="CWS"
                fill
                priority
                sizes="176px"
                className="object-contain object-left"
              />
            </Link>

            <div className="max-w-3xl py-14 lg:py-20">
              <span className="inline-flex min-h-9 items-center gap-2 border border-white/15 bg-white/5 px-3 py-2 text-[10px] font-bold uppercase tracking-[0.18em] text-[#E02424]">
                <ShieldCheck className="h-4 w-4" />
                CWS Admin Portal
              </span>
              <h1 className="mt-6 max-w-2xl text-4xl font-black uppercase leading-none tracking-tight text-white sm:text-5xl lg:text-7xl">
                Manage The Website With Control
              </h1>
              <p className="mt-6 max-w-xl text-sm leading-relaxed text-neutral-300 sm:text-base">
                Sign in to review CMS content, product records, visibility controls, navigation links and media assets for Cross Weave Sourcing.
              </p>

              <div className="mt-10 grid max-w-2xl grid-cols-1 gap-3 sm:grid-cols-2">
                {accessNotes.map((note) => (
                  <div key={note} className="flex min-h-14 items-center gap-3 border border-white/10 bg-white/[0.04] px-4 py-3">
                    <CheckCircle2 className="h-4 w-4 shrink-0 text-[#E02424]" />
                    <span className="break-words text-[11px] font-bold uppercase tracking-[0.14em] text-neutral-200">
                      {note}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="hidden border-t border-white/10 pt-5 text-[10px] font-bold uppercase tracking-[0.18em] text-neutral-500 lg:block">
              Secure Administration Environment. All connections are audited.
            </div>
          </div>

          <aside className="flex min-w-0 items-center border-t border-white/10 bg-[#F9F9F9] p-5 text-neutral-950 sm:p-8 lg:border-l lg:border-t-0 lg:p-10">
            <div className="w-full border border-neutral-200 bg-white">
              <div className="border-b border-neutral-200 bg-[#101010] p-6 text-white sm:p-8">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <span className="block break-words text-[10px] font-bold uppercase tracking-[0.18em] text-[#E02424]">
                      Secure Dashboard Access
                    </span>
                    <h2 className="mt-3 break-words text-2xl font-black uppercase tracking-tight sm:text-3xl">
                      CMS Sign In
                    </h2>
                  </div>
                  <span className="flex h-12 w-12 shrink-0 items-center justify-center border border-white/15 bg-white/5 text-[#E02424]">
                    <LockKeyhole className="h-5 w-5" />
                  </span>
                </div>
              </div>

              {/* Render dynamic, client-side login form component */}
              <LoginForm initialError={initialError} />
            </div>
          </aside>
        </div>
      </section>
    </main>
  );
}
