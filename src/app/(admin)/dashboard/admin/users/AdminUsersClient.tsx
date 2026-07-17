'use client';

import { useActionState } from 'react';
import {
  adminRevokeUserSessionsAction,
  adminRevokeAllSessionsAction,
  type AdminRevokeState,
} from '@/auth/actions/admin';
import { LogOut, AlertTriangle } from 'lucide-react';

export interface AdminUserRow {
  id: string;
  displayName: string;
  email: string | null;
  role: string;
  status: string;
}

export default function AdminUsersClient({ rows }: { rows: AdminUserRow[] }) {
  return (
    <div className="space-y-8">
      <GlobalRevokeAll />

      <section>
        <h2 className="mb-3 text-xs font-bold uppercase tracking-[0.18em] text-neutral-500">
          Users ({rows.length})
        </h2>
        {rows.length === 0 ? (
          <p className="text-sm text-neutral-500">No users found.</p>
        ) : (
          <ul className="divide-y divide-neutral-200 border border-neutral-200">
            {rows.map((row) => (
              <li key={row.id} className="flex items-center justify-between gap-4 p-3">
                <div className="min-w-0">
                  <p className="text-sm font-bold uppercase tracking-wide text-neutral-900">
                    {row.displayName}
                  </p>
                  <p className="truncate text-xs text-neutral-500">
                    {row.email ?? 'no email'} ·{' '}
                    <span className="uppercase">{row.role}</span> · {row.status}
                  </p>
                </div>
                <RevokeUserButton userId={row.id} displayName={row.displayName} />
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function RevokeUserButton({ userId, displayName }: { userId: string; displayName: string }) {
  const [state, formAction, isPending] = useActionState<AdminRevokeState | undefined, FormData>(
    adminRevokeUserSessionsAction,
    undefined
  );

  return (
    <div className="flex shrink-0 flex-col items-end gap-1">
      <form action={formAction}>
        <input type="hidden" name="userId" value={userId} />
        <button
          type="submit"
          disabled={isPending}
          className="inline-flex min-h-8 items-center gap-2 border border-neutral-300 bg-white px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-[0.14em] text-neutral-700 transition-colors hover:border-[#E02424] hover:text-[#E02424] disabled:cursor-not-allowed disabled:opacity-50"
        >
          <LogOut className="h-3.5 w-3.5" />
          {isPending ? 'Revoking…' : 'Force logout'}
        </button>
      </form>
      {state?.error && (
        <span className="text-[10px] font-bold uppercase tracking-wide text-red-500">
          {state.error}
        </span>
      )}
      {state?.success && (
        <span className="text-[10px] font-bold uppercase tracking-wide text-emerald-600">
          Logged out {displayName}
        </span>
      )}
    </div>
  );
}

function GlobalRevokeAll() {
  const [state, formAction, isPending] = useActionState<AdminRevokeState | undefined, FormData>(
    async () => adminRevokeAllSessionsAction(),
    undefined
  );

  return (
    <section className="border border-red-300 bg-red-50 p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-red-700">
            <AlertTriangle className="h-4 w-4" /> Global logout (breach response)
          </p>
          <p className="mt-1 text-xs text-red-600">
            Ends every active session and refresh token for all users. Use only during a
            confirmed compromise. This cannot be undone.
          </p>
        </div>
        <form action={formAction}>
          <button
            type="submit"
            disabled={isPending}
            onClick={(e) => {
              if (
                !window.confirm(
                  'Force-logout ALL users? Every active session will be revoked immediately.'
                )
              ) {
                e.preventDefault();
              }
            }}
            className="inline-flex min-h-9 items-center gap-2 border border-red-600 bg-red-600 px-3 py-2 text-[10px] font-bold uppercase tracking-[0.14em] text-white transition-colors hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <LogOut className="h-3.5 w-3.5" />
            {isPending ? 'Revoking all…' : 'Revoke all sessions'}
          </button>
        </form>
      </div>
      {state?.error && (
        <p className="mt-2 text-[10px] font-bold uppercase tracking-wide text-red-700">
          {state.error}
        </p>
      )}
      {state?.success && (
        <p className="mt-2 text-[10px] font-bold uppercase tracking-wide text-emerald-600">
          All sessions revoked.
        </p>
      )}
    </section>
  );
}
