'use client';

import { useActionState, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { loginAction } from '@/auth/actions/login';
import {
  ArrowRight,
  CheckCircle2,
  Eye,
  EyeOff,
  KeyRound,
  Mail,
} from 'lucide-react';

export default function LoginForm() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [rememberDevice, setRememberDevice] = useState(true);
  
  const [state, formAction, isPending] = useActionState(loginAction, undefined);

  useEffect(() => {
    if (state?.redirect) {
      router.push(state.redirect);
      router.refresh();
    }
  }, [state, router]);

  return (
    <form action={formAction} className="space-y-5 p-6 sm:p-8">
      {state?.error && (
        <div className="border border-red-500/25 bg-red-500/5 px-4 py-3 text-xs font-bold uppercase tracking-[0.14em] text-red-500">
          {state.error}
        </div>
      )}

      <label className="block min-w-0">
        <span className="block text-[10px] font-bold uppercase tracking-[0.16em] text-neutral-500">
          Email Address
        </span>
        <span className="relative mt-2 block">
          <Mail className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
          <input
            type="email"
            name="email"
            required
            placeholder="admin@crossweavesourcing.com"
            className="h-12 w-full border border-neutral-200 bg-[#F9F9F9] pl-11 pr-4 text-sm text-neutral-950 outline-none transition-colors placeholder:text-neutral-400 focus:border-[#E02424] focus:bg-white"
          />
        </span>
      </label>

      <label className="block min-w-0">
        <span className="block text-[10px] font-bold uppercase tracking-[0.16em] text-neutral-500">
          Password
        </span>
        <span className="relative mt-2 block">
          <KeyRound className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
          <input
            type={showPassword ? 'text' : 'password'}
            name="password"
            required
            placeholder="Enter password"
            className="h-12 w-full border border-neutral-200 bg-[#F9F9F9] pl-11 pr-12 text-sm text-neutral-950 outline-none transition-colors placeholder:text-neutral-400 focus:border-[#E02424] focus:bg-white"
          />
          <button
            type="button"
            onClick={() => setShowPassword((visible) => !visible)}
            className="absolute right-3 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center text-neutral-500 transition-colors hover:text-[#E02424]"
            aria-label={showPassword ? 'Hide password' : 'Show password'}
          >
            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </span>
      </label>

      <div className="flex flex-col gap-3 border-y border-neutral-200 py-5 sm:flex-row sm:items-center sm:justify-between">
        <button
          type="button"
          onClick={() => setRememberDevice((remember) => !remember)}
          className="flex min-w-0 items-center gap-3 text-left"
          aria-pressed={rememberDevice}
        >
          <span className={`flex h-5 w-5 shrink-0 items-center justify-center border ${rememberDevice ? 'border-[#E02424] bg-[#E02424]' : 'border-neutral-300 bg-white'}`}>
            {rememberDevice ? <CheckCircle2 className="h-3.5 w-3.5 text-white" /> : null}
          </span>
          <span className="text-xs font-bold uppercase tracking-[0.14em] text-neutral-700">
            Remember this device
          </span>
        </button>
      </div>

      <button
        type="submit"
        disabled={isPending}
        className="inline-flex min-h-12 w-full items-center justify-center gap-3 bg-[#E02424] px-5 py-3 text-center text-xs font-bold uppercase tracking-[0.18em] text-white transition-colors hover:bg-neutral-950 disabled:bg-neutral-800 disabled:cursor-not-allowed"
      >
        {isPending ? 'Verifying...' : 'Enter CMS Dashboard'}
        <ArrowRight className="h-4 w-4" />
      </button>

      <p className="text-center text-xs leading-relaxed text-neutral-500">
        Access is restricted to registered system administrators. Public signups are disabled.
      </p>
    </form>
  );
}
