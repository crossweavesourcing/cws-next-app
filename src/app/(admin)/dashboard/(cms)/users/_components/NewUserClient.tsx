'use client';
/* eslint-disable react-hooks/set-state-in-effect */

import { useActionState, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Check, ChevronLeft, KeyRound, Shield, UserCog, UserPlus, X } from 'lucide-react';
import { createUserAction } from '@/auth/actions/user-management';
import type { ActionState } from '@/auth/actions/action-state';
import type { CmsPermission, UserRole } from '@/types/auth';
import { ALL_CMS_PERMISSIONS } from '@/types/auth';

const permissionLabels: Record<CmsPermission, { label: string; helper: string }> = {
  overview: {
    label: 'Overview',
    helper: 'View the dashboard summary and publishing status.',
  },
  page_content: {
    label: 'Page Content',
    helper: 'Manage public website sections and page copy.',
  },
  categories: {
    label: 'Categories',
    helper: 'Create and update product category cards.',
  },
  products: {
    label: 'Products',
    helper: 'Manage product records, descriptions, and media.',
  },
  seo: {
    label: 'SEO & Redirects',
    helper: 'Manage global marketing settings and URL redirects.',
  },
};

export function NewUserClient({
  callerRole,
  variant = 'page',
}: {
  callerRole: UserRole;
  variant?: 'modal' | 'page';
}) {
  const router = useRouter();
  const overlayRef = useRef<HTMLDivElement>(null);
  const [role, setRole] = useState<UserRole>('manager');
  const [selectedPermissions, setSelectedPermissions] = useState<CmsPermission[]>([
    'overview',
  ]);
  const [state, formAction, isPending] = useActionState<ActionState, FormData>(
    createUserAction,
    { success: false }
  );

  const canCreateAdmin = callerRole === 'super_admin';
  const isModal = variant === 'modal';

  const close = useCallback(() => {
    router.push('/dashboard/users');
  }, [router]);

  const selectedPermissionSet = useMemo(
    () => new Set(selectedPermissions),
    [selectedPermissions]
  );

  useEffect(() => {
    if (state.success) {
      router.push('/dashboard/users');
    }
  }, [router, state]);

  useEffect(() => {
    if (!isModal) return;

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        close();
      }
    }

    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [close, isModal]);

  useEffect(() => {
    if (role === 'admin' && !canCreateAdmin) {
      setRole('manager');
    }
  }, [canCreateAdmin, role]);

  function togglePermission(permission: CmsPermission) {
    setSelectedPermissions((current) =>
      current.includes(permission)
        ? current.filter((item) => item !== permission)
        : [...current, permission]
    );
  }

  const content = (
    <form action={formAction} className="flex h-full min-h-0 flex-col bg-white text-neutral-950">
      <div className="shrink-0 border-b border-neutral-200 bg-[#101010] p-6 text-white md:p-7">
        <div className="flex items-start gap-4">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center border border-white/15 bg-white/10">
            <UserPlus className="h-5 w-5 text-[#E02424]" />
          </span>
          <div className="min-w-0">
            <span className="block text-[10px] font-bold uppercase tracking-[0.18em] text-[#E02424]">
              Users Management
            </span>
            <h2 className="mt-2 break-words text-xl font-black uppercase tracking-tight md:text-2xl">
              Add User
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-neutral-300">
              Create an active dashboard account and assign only the access this person needs.
            </p>
          </div>
        </div>
      </div>

      <div className="min-h-0 flex-1 space-y-5 overflow-y-auto p-4 md:space-y-6 md:p-7">
        {state.error && (
          <div className="border border-red-500/25 bg-red-500/5 px-4 py-3 text-xs font-bold uppercase tracking-[0.14em] text-red-600">
            {state.error}
          </div>
        )}

        <section className="border border-neutral-200 bg-[#F9F9F9] p-4 md:p-5">
          <SectionHeader
            icon={UserCog}
            step="01"
            title="Account"
            helper="Use the email they will sign in with."
          />
          <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2">
            <label className="block md:col-span-2">
              <span className="mb-2 block text-[10px] font-bold uppercase tracking-[0.16em] text-neutral-500">
                Email Address
              </span>
              <input
                type="email"
                name="email"
                autoComplete="email"
                required
                className="h-11 w-full border border-neutral-200 bg-white px-3 text-sm text-neutral-900 outline-none transition-colors placeholder:text-neutral-400 focus:border-[#E02424]"
                placeholder="name@company.com"
              />
            </label>
            <label className="block">
              <span className="mb-2 block text-[10px] font-bold uppercase tracking-[0.16em] text-neutral-500">
                First Name
              </span>
              <input
                type="text"
                name="firstName"
                autoComplete="given-name"
                required
                className="h-11 w-full border border-neutral-200 bg-white px-3 text-sm text-neutral-900 outline-none transition-colors placeholder:text-neutral-400 focus:border-[#E02424]"
                placeholder="First name"
              />
            </label>
            <label className="block">
              <span className="mb-2 block text-[10px] font-bold uppercase tracking-[0.16em] text-neutral-500">
                Last Name
              </span>
              <input
                type="text"
                name="lastName"
                autoComplete="family-name"
                required
                className="h-11 w-full border border-neutral-200 bg-white px-3 text-sm text-neutral-900 outline-none transition-colors placeholder:text-neutral-400 focus:border-[#E02424]"
                placeholder="Last name"
              />
            </label>
          </div>
        </section>

        <section className="border border-neutral-200 bg-white p-4 md:p-5">
          <SectionHeader
            icon={Shield}
            step="02"
            title="Access Level"
            helper={canCreateAdmin ? 'Choose whether this user manages everything or specific CMS areas.' : 'Admins can invite managers and assign CMS areas.'}
          />
          <input type="hidden" name="role" value={role} />
          <div className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-2">
            <RoleOption
              checked={role === 'manager'}
              label="Manager"
              helper="Explicit permissions. Best for focused content work."
              onSelect={() => setRole('manager')}
            />
            {canCreateAdmin && (
              <RoleOption
                checked={role === 'admin'}
                label="Admin"
                helper="Full CMS access except super admin-only controls."
                onSelect={() => setRole('admin')}
              />
            )}
          </div>
        </section>

        {role === 'manager' && (
          <section className="border border-neutral-200 bg-[#F9F9F9] p-4 md:p-5">
            <SectionHeader
              icon={KeyRound}
              step="03"
              title="Permissions"
              helper="Managers see only the selected CMS sections."
            />
            <div className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-2">
              {ALL_CMS_PERMISSIONS.map((permission) => {
                const checked = selectedPermissionSet.has(permission);
                const copy = permissionLabels[permission];

                return (
                  <label
                    key={permission}
                    className={`flex min-h-24 cursor-pointer items-start gap-3 border p-4 transition-colors ${
                      checked
                        ? 'border-[#E02424] bg-white'
                        : 'border-neutral-200 bg-white hover:border-[#E02424]/50'
                    }`}
                  >
                    <input
                      type="checkbox"
                      name="permissions"
                      value={permission}
                      checked={checked}
                      onChange={() => togglePermission(permission)}
                      className="sr-only"
                    />
                    <span
                      className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center border ${
                        checked
                          ? 'border-[#E02424] bg-[#E02424] text-white'
                          : 'border-neutral-300 bg-white text-transparent'
                      }`}
                    >
                      <Check className="h-3.5 w-3.5" />
                    </span>
                    <span className="min-w-0">
                      <span className="block text-xs font-black uppercase tracking-[0.12em] text-neutral-950">
                        {copy.label}
                      </span>
                      <span className="mt-1 block text-sm leading-relaxed text-neutral-500">
                        {copy.helper}
                      </span>
                    </span>
                  </label>
                );
              })}
            </div>
          </section>
        )}
      </div>

      <div className="shrink-0 flex flex-col-reverse gap-3 border-t border-neutral-200 bg-white p-4 sm:flex-row sm:items-center sm:justify-between md:p-6">
        <button
          type="button"
          onClick={close}
          className="inline-flex min-h-10 items-center justify-center gap-2 px-4 py-2 text-xs font-bold uppercase tracking-wider text-neutral-500 transition-colors hover:text-neutral-900"
        >
          <ChevronLeft className="h-4 w-4" />
          Cancel
        </button>
        <button
          type="submit"
          disabled={isPending}
          className="inline-flex min-h-10 items-center justify-center gap-2 bg-[#E02424] px-5 py-2 text-xs font-bold uppercase tracking-wider text-white transition-colors hover:bg-[#c91f1f] disabled:opacity-50"
        >
          <UserPlus className="h-4 w-4" />
          {isPending ? 'Creating...' : 'Create User'}
        </button>
      </div>
    </form>
  );

  if (isModal) {
    return (
      <div
        ref={overlayRef}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-3 backdrop-blur-sm sm:p-6"
        onMouseDown={(event) => {
          if (event.target === overlayRef.current) {
            close();
          }
        }}
      >
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Add user"
          className="relative flex h-[min(92vh,860px)] min-h-0 w-full max-w-3xl flex-col overflow-hidden border border-neutral-800 bg-white shadow-2xl"
        >
          <button
            type="button"
            onClick={close}
            className="absolute right-4 top-4 z-10 flex h-9 w-9 items-center justify-center border border-white/15 bg-white/10 text-white transition-colors hover:bg-white hover:text-neutral-950"
          >
            <X className="h-4 w-4" />
            <span className="sr-only">Close add user modal</span>
          </button>
          {content}
        </div>
      </div>
    );
  }

  return <div className="border border-neutral-200 bg-white shadow-sm">{content}</div>;
}

function SectionHeader({
  icon: Icon,
  step,
  title,
  helper,
}: {
  icon: typeof UserCog;
  step: string;
  title: string;
  helper: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center border border-neutral-200 bg-white text-[#E02424]">
        <Icon className="h-4 w-4" />
      </span>
      <span className="min-w-0">
        <span className="block text-[10px] font-bold uppercase tracking-[0.18em] text-neutral-400">
          Step {step}
        </span>
        <span className="mt-1 block text-sm font-black uppercase tracking-[0.12em] text-neutral-950">
          {title}
        </span>
        <span className="mt-1 block text-sm leading-relaxed text-neutral-500">
          {helper}
        </span>
      </span>
    </div>
  );
}

function RoleOption({
  checked,
  label,
  helper,
  onSelect,
}: {
  checked: boolean;
  label: string;
  helper: string;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`flex min-h-28 items-start gap-3 border p-4 text-left transition-colors ${
        checked
          ? 'border-[#E02424] bg-[#E02424]/5'
          : 'border-neutral-200 bg-white hover:border-[#E02424]/50'
      }`}
    >
      <span
        className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border ${
          checked ? 'border-[#E02424]' : 'border-neutral-300'
        }`}
      >
        <span className={`h-2.5 w-2.5 rounded-full ${checked ? 'bg-[#E02424]' : 'bg-transparent'}`} />
      </span>
      <span className="min-w-0">
        <span className="block text-xs font-black uppercase tracking-[0.12em] text-neutral-950">
          {label}
        </span>
        <span className="mt-2 block text-sm leading-relaxed text-neutral-500">
          {helper}
        </span>
      </span>
    </button>
  );
}
