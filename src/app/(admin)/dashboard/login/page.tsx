"use client";

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import {
  ArrowRight,
  CheckCircle2,
  Eye,
  EyeOff,
  KeyRound,
  LockKeyhole,
  Mail,
  ShieldCheck,
} from 'lucide-react';

const accessNotes = [
  'Content sections',
  'Product records',
  'Navigation manager',
  'Media library',
];

export default function DashboardLoginPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [rememberDevice, setRememberDevice] = useState(true);

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
              UI-only access screen. Authentication can be connected later.
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

              <form className="space-y-5 p-6 sm:p-8">
                <label className="block min-w-0">
                  <span className="block text-[10px] font-bold uppercase tracking-[0.16em] text-neutral-500">
                    Email Address
                  </span>
                  <span className="relative mt-2 block">
                    <Mail className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
                    <input
                      type="email"
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

                  <button
                    type="button"
                    className="text-left text-xs font-bold uppercase tracking-[0.14em] text-[#E02424] transition-colors hover:text-neutral-950 sm:text-right"
                  >
                    Forgot password?
                  </button>
                </div>

                <Link
                  href="/dashboard"
                  className="inline-flex min-h-12 w-full items-center justify-center gap-3 bg-[#E02424] px-5 py-3 text-center text-xs font-bold uppercase tracking-[0.18em] text-white transition-colors hover:bg-neutral-950"
                >
                  Enter CMS Dashboard
                  <ArrowRight className="h-4 w-4" />
                </Link>

                <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
                  <span className="h-px bg-neutral-200" />
                  <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-neutral-400">
                    Or
                  </span>
                  <span className="h-px bg-neutral-200" />
                </div>

                <button
                  type="button"
                  className="inline-flex min-h-12 w-full items-center justify-center gap-3 border border-neutral-200 bg-white px-5 py-3 text-center text-xs font-bold uppercase tracking-[0.16em] text-neutral-950 transition-colors hover:border-neutral-950 hover:bg-[#F9F9F9]"
                >
                  <span className="flex h-6 w-6 items-center justify-center border border-neutral-200 bg-white text-sm font-black normal-case tracking-normal text-[#E02424]">
                    G
                  </span>
                  Continue with Google
                </button>

                <p className="text-center text-xs leading-relaxed text-neutral-500">
                  This login screen is prepared for the CMS access flow. Credential validation and session handling can be wired in the backend phase.
                </p>
              </form>
            </div>
          </aside>
        </div>
      </section>
    </main>
  );
}
