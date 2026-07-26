import Link from 'next/link';
import {
  AlertTriangle,
  Check,
  Fingerprint,
  KeyRound,
  Laptop,
  LockKeyhole,
  Mail,
  MapPin,
  ShieldCheck,
  Smartphone,
  UserRound,
} from 'lucide-react';
import { getAccountSecurityView } from '@/auth/services/account-security.service';
import { PASSWORD_STRENGTH_EVALUATOR_VERSION } from '@/auth/validation/password-strength';
import { TotpConfigurator } from './TotpConfigurator';
import { SecurityPreferencesClient } from './SecurityPreferencesClient';

function dateLabel(value: string | null): string {
  if (!value) return 'Not available';
  return new Intl.DateTimeFormat('en', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));
}

const categoryLabels = { very_weak: 'Very weak', weak: 'Weak', fair: 'Fair', strong: 'Strong', very_strong: 'Very strong' };

function Status({ active, children }: { active: boolean; children: React.ReactNode }) {
  return <span className={`inline-flex min-h-7 items-center px-2.5 text-[10px] font-bold uppercase tracking-[0.14em] ${active ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>{children}</span>;
}

function Heading({ eyebrow, title, copy }: { eyebrow: string; title: string; copy: string }) {
  return <div className="border-b border-neutral-200 pb-5"><p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#E02424]">{eyebrow}</p><h2 className="mt-2 text-xl font-black uppercase tracking-tight sm:text-2xl">{title}</h2><p className="mt-2 max-w-2xl text-sm leading-6 text-neutral-600">{copy}</p></div>;
}

export default async function AccountSecurityPage() {
  const data = await getAccountSecurityView();
  const strengthLabel = data.password.category ? categoryLabels[data.password.category] : 'Not evaluated';
  const evaluatorIsCurrent = data.password.evaluatorVersion === PASSWORD_STRENGTH_EVALUATOR_VERSION;

  return (
    <div className="space-y-5">
      <section className="overflow-hidden border border-neutral-200 bg-white">
        <div className="grid gap-6 bg-[#101010] p-6 text-white md:p-8 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-end">
          <div><div className="inline-flex items-center gap-2 border border-white/15 bg-white/5 px-3 py-2 text-[10px] font-bold uppercase tracking-[0.18em] text-[#E02424]"><ShieldCheck className="h-4 w-4" /> Account control center</div><h1 className="mt-5 max-w-3xl text-3xl font-black uppercase leading-none tracking-tight sm:text-4xl lg:text-5xl">Personal information &amp; security</h1><p className="mt-4 max-w-2xl text-sm leading-6 text-neutral-400">Review your administrator identity, password health, two-factor protection and active access.</p></div>
          <div className="border border-white/10 bg-white/[0.04] p-5"><div className="flex items-center justify-between gap-4"><span className="text-[10px] font-bold uppercase tracking-[0.16em] text-neutral-400">Account security</span><span className="text-3xl font-black">{data.accountScore.percent}%</span></div><div className="mt-4 grid grid-cols-5 gap-1.5">{data.accountScore.checks.map((check) => <span key={check.label} className={`h-1.5 ${check.complete ? 'bg-[#E02424]' : 'bg-white/10'}`} />)}</div><p className="mt-4 text-xs leading-5 text-neutral-400">Based on the five safeguards shown in the checklist below.</p></div>
        </div>
        {data.unavailable.length > 0 && <div className="flex items-center gap-2 bg-amber-50 px-6 py-4 text-xs text-amber-800"><AlertTriangle className="h-4 w-4" /> Some security information is temporarily unavailable.</div>}
      </section>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.55fr)_minmax(320px,0.85fr)]">
        <div className="space-y-5">
          <section className="border border-neutral-200 bg-white p-6 md:p-8">
            <Heading eyebrow="Identity" title="Personal information" copy="The identity attached to security notifications and audit activity." />
            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              {[['Display name', data.profile.displayName], ['Full name', [data.profile.firstName, data.profile.lastName].filter(Boolean).join(' ') || 'Not provided'], ['Email', data.profile.email ?? 'Not configured'], ['Access role', data.profile.role]].map(([label, value]) => <div key={label} className="border border-neutral-200 bg-neutral-50 p-4"><p className="text-[10px] font-bold uppercase tracking-[0.14em] text-neutral-500">{label}</p><p className="mt-2 break-words text-sm font-semibold text-neutral-900">{value}</p></div>)}
            </div>
            <div className="mt-4 flex items-center gap-2 text-sm"><Mail className="h-4 w-4 text-[#E02424]" /><Status active={data.profile.emailVerified}>{data.profile.emailVerified ? 'Email verified' : 'Email not verified'}</Status></div>
          </section>

          <section className="border border-neutral-200 bg-white p-6 md:p-8">
            <Heading eyebrow="Authentication" title="Password strength" copy="Strength is evaluated only when a password is created, changed or reset. Existing hashes cannot be safely rescored." />
            <div className="mt-6 grid gap-4 md:grid-cols-[minmax(0,1fr)_220px]">
              <article className="border border-neutral-200 bg-neutral-50 p-5"><div className="flex flex-wrap items-start justify-between gap-3"><span className="flex h-11 w-11 items-center justify-center bg-neutral-950 text-white"><KeyRound className="h-5 w-5" /></span><Status active={(data.password.percent ?? 0) >= 50}>{strengthLabel}</Status></div><div className="mt-5 flex items-end justify-between gap-4"><div><p className="text-xs font-bold uppercase tracking-[0.14em] text-neutral-500">Latest evaluation</p><p className="mt-2 text-3xl font-black">{data.password.percent === null ? '—' : `${data.password.percent}%`}</p></div><p className="text-right text-xs leading-5 text-neutral-500">{dateLabel(data.password.evaluatedAt)}</p></div><div className="mt-4 grid grid-cols-5 gap-1.5">{[20, 40, 60, 80, 100].map((point) => <span key={point} className={`h-1.5 ${data.password.percent !== null && point <= data.password.percent ? 'bg-[#E02424]' : 'bg-neutral-200'}`} />)}</div><p className="mt-4 text-xs text-neutral-500">Password changed: {dateLabel(data.password.changedAt)}</p></article>
              <div className="flex flex-col justify-between border border-neutral-200 p-5"><div><Fingerprint className="h-6 w-6 text-[#E02424]" /><p className="mt-4 text-sm font-black uppercase tracking-[0.1em]">Private by design</p><p className="mt-2 text-xs leading-5 text-neutral-600">Only the latest category, percentage, date and evaluator version are stored—not your password or matched patterns.</p><div className="mt-4"><Status active={evaluatorIsCurrent}>{data.password.evaluatedAt === null ? 'Awaiting evaluation' : evaluatorIsCurrent ? 'Evaluator current' : 'Review recommended'}</Status></div></div><Link href="/dashboard/change-password" className="mt-5 inline-flex min-h-11 items-center justify-center bg-neutral-950 px-4 text-[11px] font-bold uppercase tracking-[0.14em] text-white hover:bg-[#E02424]">Change password</Link></div>
            </div>
          </section>

          <section className="border border-neutral-200 bg-white p-6 md:p-8">
            <Heading eyebrow="Protection" title="Two-factor authentication" copy="Authenticator apps and passkeys provide stronger protection than a password alone." />
            <div className="mt-6 space-y-3">
              {[
                { icon: Smartphone, title: 'Authenticator app', detail: data.protection.totpEnabled ? 'Configured' : 'Not configured', active: data.protection.totpEnabled, renderExtras: () => <TotpConfigurator initiallyEnabled={data.protection.totpEnabled} /> },
                { icon: Fingerprint, title: 'Passkeys', detail: data.protection.passkeyCount === null ? 'Unavailable' : `${data.protection.passkeyCount} registered`, active: (data.protection.passkeyCount ?? 0) > 0, renderExtras: undefined },
                { icon: LockKeyhole, title: 'Recovery codes', detail: data.protection.recoveryCodesRemaining === null ? 'Unavailable' : `${data.protection.recoveryCodesRemaining} remaining`, active: (data.protection.recoveryCodesRemaining ?? 0) > 0, renderExtras: undefined },
              ].map(({ icon: Icon, title, detail, active, renderExtras }) => <article key={title} className="grid gap-4 border border-neutral-200 p-5 sm:grid-cols-[48px_1fr_auto] sm:items-start"><span className="flex h-12 w-12 items-center justify-center bg-neutral-100 text-[#E02424] mt-1"><Icon className="h-5 w-5" /></span><div className="flex flex-col"><h3 className="text-sm font-black uppercase tracking-[0.1em]">{title}</h3><p className="mt-1 text-sm text-neutral-600">{detail}</p>{renderExtras?.()}</div><Status active={active}>{active ? 'Protected' : 'Recommended'}</Status></article>)}
            </div>
          </section>

          <section className="border border-neutral-200 bg-white p-6 md:p-8">
            <Heading eyebrow="Settings" title="Security Preferences" copy="Configure when Two-Factor Authentication is required and set your default verification method." />
            <div className="mt-6">
              <SecurityPreferencesClient 
                preference={data.protection.twoFaPreference}
                defaultMethod={data.protection.defaultTwoFaMethod ?? 'email'}
                hasTotp={data.protection.totpEnabled}
                hasWebAuthn={(data.protection.passkeyCount ?? 0) > 0}
              />
            </div>
          </section>
        </div>

        <aside className="space-y-5">
          <section className="border border-neutral-200 bg-white p-6"><Heading eyebrow="Checklist" title="Security safeguards" copy="Each completed safeguard contributes 20 points." /><ol className="mt-6 space-y-4">{data.accountScore.checks.map((check) => <li key={check.label} className="grid grid-cols-[32px_1fr] items-center gap-3 text-sm font-semibold"><span className={`flex h-8 w-8 items-center justify-center ${check.complete ? 'bg-emerald-600 text-white' : 'bg-neutral-100 text-neutral-500'}`}>{check.complete ? <Check className="h-4 w-4" /> : '—'}</span>{check.label}</li>)}</ol></section>

          <section className="border border-neutral-200 bg-[#101010] p-6 text-white"><p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#E02424]">Active access</p><div className="mt-5 grid grid-cols-2 gap-3">{[['Sessions', data.access.activeSessionCount], ['Trusted devices', data.access.trustedDeviceCount], ['Blocked', data.access.blockedDeviceCount], ['Failed sign-ins', data.access.recentFailedLoginCount]].map(([label, value]) => <div key={String(label)} className="border border-white/10 bg-white/[0.04] p-4"><p className="text-2xl font-black">{value ?? '—'}</p><p className="mt-1 text-[10px] uppercase tracking-[0.12em] text-neutral-400">{label}</p></div>)}</div><div className="mt-4 space-y-3">{data.access.sessions.map((session, index) => <div key={`${session.device}-${index}`} className="border border-white/10 p-4"><div className="flex items-center justify-between gap-3"><span className="flex items-center gap-2 text-sm font-bold"><Laptop className="h-4 w-4 text-[#E02424]" />{session.device}</span>{session.current && <span className="text-[10px] font-bold uppercase text-emerald-400">Current</span>}</div><p className="mt-2 flex items-center gap-2 text-xs text-neutral-400"><MapPin className="h-3.5 w-3.5" />{session.location}</p><p className="mt-1 text-xs text-neutral-500">{session.browser ?? 'Unknown browser'} · {dateLabel(session.lastActiveAt)}</p></div>)}</div><Link href="/dashboard/security" className="mt-5 inline-flex min-h-11 w-full items-center justify-center bg-white px-4 text-[11px] font-bold uppercase tracking-[0.14em] text-neutral-950">Review devices &amp; sign-ins</Link></section>

          <section className="border border-neutral-200 bg-white p-6"><div className="flex h-11 w-11 items-center justify-center bg-[#E02424]/10 text-[#E02424]"><UserRound className="h-5 w-5" /></div><h2 className="mt-5 text-lg font-black uppercase tracking-tight">Your data stays scoped</h2><p className="mt-3 text-sm leading-6 text-neutral-600">This information is loaded only when you open Account &amp; Security. It is not queried by the dashboard overview or shared layout.</p></section>
        </aside>
      </div>
    </div>
  );
}
