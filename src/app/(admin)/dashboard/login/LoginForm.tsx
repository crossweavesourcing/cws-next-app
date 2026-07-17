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
  const [rememberMe, setRememberMe] = useState(false);
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

      <div className="flex flex-col gap-3 border-y border-neutral-200 py-5 sm:flex-row sm:items-start sm:justify-between">
        <label className="flex cursor-pointer items-center gap-3">
          <input
            type="checkbox"
            name="rememberMe"
            checked={rememberMe}
            onChange={(e) => setRememberMe(e.target.checked)}
            className="hidden"
          />
          <span className={`flex h-5 w-5 shrink-0 items-center justify-center border transition-colors ${rememberMe ? 'border-[#E02424] bg-[#E02424]' : 'border-neutral-300 bg-white'}`}>
            {rememberMe ? <CheckCircle2 className="h-3.5 w-3.5 text-white" /> : null}
          </span>
          <span className="text-xs font-bold uppercase tracking-[0.14em] text-neutral-700 select-none">
            Remember Me
          </span>
        </label>

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

      <div className="text-center">
        <a
          href="/dashboard/forgot-password"
          className="text-[11px] font-bold uppercase tracking-[0.14em] text-neutral-500 underline hover:text-neutral-900"
        >
          Forgot password?
        </a>
      </div>

      <div className="relative py-2 text-center">
        <span className="relative z-10 bg-white px-3 text-[10px] font-bold uppercase tracking-[0.16em] text-neutral-400">
          Or continue with
        </span>
        <span className="absolute left-0 top-1/2 h-px w-full -translate-y-1/2 bg-neutral-200" />
      </div>

      <a
        href="/api/auth/google"
        className="inline-flex min-h-12 w-full items-center justify-center gap-3 border border-neutral-300 bg-white px-5 py-3 text-center text-xs font-bold uppercase tracking-[0.18em] text-neutral-800 transition-colors hover:bg-neutral-50"
      >
        <svg className="h-4 w-4" viewBox="0 0 24 24" aria-hidden="true">
          <path
            fill="#4285F4"
            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.27-4.74 3.27-8.1Z"
          />
          <path
            fill="#34A853"
            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23Z"
          />
          <path
            fill="#FBBC05"
            d="M5.84 14.1a6.6 6.6 0 0 1 0-4.2V7.06H2.18a11 11 0 0 0 0 9.88l3.66-2.84Z"
          />
          <path
            fill="#EA4335"
            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84C6.71 7.31 9.14 5.38 12 5.38Z"
          />
        </svg>
        Google
      </a>
    </form>
  );
}
