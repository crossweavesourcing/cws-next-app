'use client';

import { useActionState } from 'react';
import { revokeSessionAction, revokeAllOtherSessionsAction } from '@/auth/actions/session';
import { LogOut, Monitor, Smartphone } from 'lucide-react';

export interface SessionRow {
  id: string;
  device: string;
  browser: string;
  os: string;
  platform: string;
  ipAddress: string;
  createdAt: string;
  lastActivityAt: string;
  revoked: boolean;
  isCurrent: boolean;
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}

export default function SessionsClient({
  rows,
  currentSessionId,
}: {
  rows: SessionRow[];
  currentSessionId: string;
}) {
  if (rows.length === 0) {
    return <p className="text-sm text-neutral-500">No sessions found.</p>;
  }

  return (
    <div className="space-y-3">
      <EndAllOtherSessions currentSessionId={currentSessionId} />
      <ul className="space-y-3">
      {rows.map((row) => (
        <li
          key={row.id}
          className="flex flex-col gap-3 border border-neutral-200 p-4 sm:flex-row sm:items-center sm:justify-between"
        >
          <div className="flex min-w-0 items-start gap-3">
            <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center border border-neutral-200 bg-[#F9F9F9] text-neutral-700">
              {row.platform === 'mobile' ? (
                <Smartphone className="h-4 w-4" />
              ) : (
                <Monitor className="h-4 w-4" />
              )}
            </span>
            <div className="min-w-0">
              <p className="break-words text-sm font-bold uppercase tracking-wide text-neutral-900">
                {row.device}
                {row.isCurrent && (
                  <span className="ml-2 rounded bg-[#E02424] px-2 py-0.5 text-[10px] font-bold text-white">
                    This device
                  </span>
                )}
              </p>
              <p className="truncate text-xs text-neutral-500">
                {row.browser} · {row.os} · {row.ipAddress}
              </p>
              <p className="text-xs text-neutral-400">
                Created {formatDate(row.createdAt)} · Active {formatDate(row.lastActivityAt)}
              </p>
            </div>
          </div>

          {row.isCurrent ? (
            <span className="shrink-0 text-[10px] font-bold uppercase tracking-[0.14em] text-neutral-400">
              Current
            </span>
          ) : (
            <RevokeButton sessionId={row.id} currentSessionId={currentSessionId} />
          )}
        </li>
      ))}</ul>
      </div>
  );
}

function RevokeButton({
  sessionId,
  currentSessionId,
}: {
  sessionId: string;
  currentSessionId: string;
}) {
  const [state, formAction, isPending] = useActionState(revokeSessionAction, undefined);

  return (
    <div className="flex shrink-0 flex-col items-end gap-1">
      <form action={formAction}>
        <input type="hidden" name="sessionId" value={sessionId} />
        <input type="hidden" name="currentSessionId" value={currentSessionId} />
        <button
          type="submit"
          disabled={isPending}
          className="inline-flex min-h-9 items-center gap-2 border border-neutral-300 bg-white px-3 py-2 text-[10px] font-bold uppercase tracking-[0.14em] text-neutral-700 transition-colors hover:border-[#E02424] hover:text-[#E02424] disabled:cursor-not-allowed disabled:opacity-50"
        >
          <LogOut className="h-3.5 w-3.5" />
          {isPending ? 'Ending…' : 'End session'}
        </button>
      </form>
      {state?.error && (
        <span className="text-[10px] font-bold uppercase tracking-wide text-red-500">
          {state.error}
        </span>
      )}
    </div>
  );
}


function EndAllOtherSessions({ currentSessionId }: { currentSessionId: string }) {
  const [state, formAction, isPending] = useActionState(revokeAllOtherSessionsAction, undefined);
  return (
    <form action={formAction} className="flex items-center justify-end gap-2">
      <input type="hidden" name="currentSessionId" value={currentSessionId} />
      <button
        type="submit"
        disabled={isPending}
        className="inline-flex min-h-9 items-center gap-2 border border-neutral-300 bg-white px-3 py-2 text-[10px] font-bold uppercase tracking-[0.14em] text-neutral-700 transition-colors hover:border-[#E02424] hover:text-[#E02424] disabled:cursor-not-allowed disabled:opacity-50"
      >
        <LogOut className="h-3.5 w-3.5" />
        {isPending ? 'Ending all other…' : 'End all other sessions'}
      </button>
      {state?.error && (
        <span className="text-[10px] font-bold uppercase tracking-wide text-red-500">{state.error}</span>
      )}
      {state?.success && (
        <span className="text-[10px] font-bold uppercase tracking-wide text-emerald-600">Done</span>
      )}
    </form>
  );
}

