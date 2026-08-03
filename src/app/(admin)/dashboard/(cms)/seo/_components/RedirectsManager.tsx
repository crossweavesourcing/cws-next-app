'use client';

import { useState } from 'react';
import { Pencil, Trash2 } from 'lucide-react';
import { Panel } from '../../_components/DashboardComponents';
import { ConfirmDeleteModal } from '../../_components/ConfirmDeleteModal';
import {
  createRedirectAction,
  updateRedirectAction,
  deleteRedirectAction,
} from '@/auth/actions/seo.actions';

interface SerializedRedirect {
  _id: string;
  source: string;
  destination: string;
  statusCode: 301 | 302 | 307 | 308;
  active: boolean;
  createdAt: string;
  createdBy: string | null;
  updatedAt: string;
  updatedBy: string | null;
}

const STATUS_CODES = [301, 302, 307, 308] as const;

const STATUS_LABELS: Record<number, string> = {
  301: '301 — Permanent',
  302: '302 — Temporary (Found)',
  307: '307 — Temporary (Preserve method)',
  308: '308 — Permanent (Preserve method)',
};

export function RedirectsManager({ redirects: initial }: { redirects: SerializedRedirect[] }) {
  const [redirects] = useState(initial);
  const [pending, setPending] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Form state
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formSource, setFormSource] = useState('');
  const [formDestination, setFormDestination] = useState('');
  const [formStatusCode, setFormStatusCode] = useState<301 | 302 | 307 | 308>(301);
  const [formActive, setFormActive] = useState(true);

  // Delete modal state
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deletingSource, setDeletingSource] = useState('');

  function resetForm() {
    setShowForm(false);
    setEditingId(null);
    setFormSource('');
    setFormDestination('');
    setFormStatusCode(301);
    setFormActive(true);
  }

  function startEdit(redirect: SerializedRedirect) {
    setEditingId(redirect._id);
    setFormSource(redirect.source);
    setFormDestination(redirect.destination);
    setFormStatusCode(redirect.statusCode);
    setFormActive(redirect.active);
    setShowForm(true);
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPending(true);
    setFeedback(null);

    const formData = new FormData();
    formData.set('source', formSource);
    formData.set('destination', formDestination);
    formData.set('statusCode', String(formStatusCode));
    formData.set('active', String(formActive));

    let res;
    if (editingId) {
      res = await updateRedirectAction(editingId, formData);
    } else {
      res = await createRedirectAction(formData);
    }

    setPending(false);

    if (res && 'success' in res && res.success) {
      setFeedback({
        type: 'success',
        message: editingId ? 'Redirect updated successfully.' : 'Redirect created successfully.',
      });
      resetForm();
    } else {
      const errorMsg = res && 'error' in res ? (res as { error?: string }).error : 'An unexpected error occurred.';
      setFeedback({ type: 'error', message: errorMsg ?? 'An unexpected error occurred.' });
    }
  }

  async function handleConfirmDelete() {
    if (!deletingId) return;
    setPending(true);
    setFeedback(null);

    const res = await deleteRedirectAction(deletingId);
    setPending(false);
    setDeletingId(null);

    if (res && 'success' in res && res.success) {
      setFeedback({ type: 'success', message: `Redirect "${deletingSource}" was deleted successfully.` });
    } else {
      const errorMsg = res && 'error' in res ? (res as { error?: string }).error : 'Failed to delete redirect.';
      setFeedback({ type: 'error', message: errorMsg ?? 'Failed to delete redirect.' });
    }
  }

  const inputClass =
    'h-11 w-full border border-neutral-200 bg-white px-3 text-sm text-neutral-900 outline-none transition-colors placeholder:text-neutral-400 focus:border-[#E02424]';
  const labelClass = 'mb-2 block text-[10px] font-bold uppercase tracking-[0.16em] text-neutral-500';

  return (
    <Panel eyebrow="URL Management" title="Active Redirects">
      {feedback && (
        <div
          className={`mb-4 border p-3 text-sm font-semibold ${
            feedback.type === 'success'
              ? 'border-green-500/30 bg-green-500/10 text-green-400'
              : 'border-red-500/30 bg-red-500/10 text-red-400'
          }`}
        >
          {feedback.message}
        </div>
      )}

      <div className="mb-4 flex items-center justify-between">
        <button
          type="button"
          onClick={() => {
            resetForm();
            setShowForm(true);
          }}
          className="inline-block bg-[#E02424] text-white px-4 py-2 text-xs font-bold uppercase tracking-wider hover:bg-[#c91f1f] transition-colors"
        >
          + Add Redirect
        </button>
        <span className="text-xs font-bold uppercase tracking-wider text-neutral-400">
          {redirects.length} redirect{redirects.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Inline Form */}
      {showForm && (
        <form onSubmit={handleSubmit} className="mb-6 border border-neutral-200 bg-[#F9F9F9] p-4 md:p-5 space-y-4">
          <h3 className="text-xs font-black uppercase tracking-[0.14em] text-neutral-950">
            {editingId ? 'Edit Redirect' : 'New Redirect'}
          </h3>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <label className="block">
              <span className={labelClass}>Source Path</span>
              <input
                type="text"
                value={formSource}
                onChange={(e) => setFormSource(e.target.value)}
                className={inputClass}
                placeholder="/old-page"
                required
              />
            </label>
            <label className="block">
              <span className={labelClass}>Destination</span>
              <input
                type="text"
                value={formDestination}
                onChange={(e) => setFormDestination(e.target.value)}
                className={inputClass}
                placeholder="/new-page"
                required
              />
            </label>
            <label className="block">
              <span className={labelClass}>Status Code</span>
              <select
                value={formStatusCode}
                onChange={(e) => setFormStatusCode(Number(e.target.value) as 301 | 302 | 307 | 308)}
                className={inputClass}
              >
                {STATUS_CODES.map((code) => (
                  <option key={code} value={code}>
                    {STATUS_LABELS[code]}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex items-center gap-3 pt-6">
              <input
                type="checkbox"
                checked={formActive}
                onChange={(e) => setFormActive(e.target.checked)}
                className="h-5 w-5 accent-[#E02424]"
              />
              <span className="text-sm font-bold text-neutral-700">Active</span>
            </label>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="submit"
              disabled={pending}
              className="bg-[#E02424] px-5 py-2.5 text-xs font-bold uppercase tracking-wider text-white transition-colors hover:bg-[#c91f1f] disabled:opacity-50"
            >
              {pending ? 'Saving…' : editingId ? 'Update Redirect' : 'Create Redirect'}
            </button>
            <button
              type="button"
              onClick={resetForm}
              className="border border-neutral-300 px-5 py-2.5 text-xs font-bold uppercase tracking-wider text-neutral-600 transition-colors hover:border-neutral-500 hover:text-neutral-900"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* Table */}
      {redirects.length === 0 ? (
        <div className="border border-dashed border-neutral-300 py-12 text-center text-sm text-neutral-400">
          No redirects configured yet.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-neutral-200 text-[10px] font-bold uppercase tracking-[0.16em] text-neutral-500">
                <th className="pb-3 pr-4">Source</th>
                <th className="pb-3 pr-4">Destination</th>
                <th className="pb-3 pr-4">Code</th>
                <th className="pb-3 pr-4">Active</th>
                <th className="pb-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {redirects.map((redirect) => (
                <tr key={redirect._id} className="group">
                  <td className="py-3 pr-4">
                    <code className="bg-neutral-100 px-2 py-0.5 text-xs text-neutral-700">
                      {redirect.source}
                    </code>
                  </td>
                  <td className="py-3 pr-4">
                    <code className="bg-neutral-100 px-2 py-0.5 text-xs text-neutral-700">
                      {redirect.destination}
                    </code>
                  </td>
                  <td className="py-3 pr-4 text-xs font-bold tabular-nums text-neutral-600">
                    {redirect.statusCode}
                  </td>
                  <td className="py-3 pr-4">
                    <span
                      className={`inline-block rounded-sm px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                        redirect.active
                          ? 'bg-green-500/10 text-green-600'
                          : 'bg-neutral-200 text-neutral-500'
                      }`}
                    >
                      {redirect.active ? 'Yes' : 'No'}
                    </span>
                  </td>
                  <td className="py-3 text-right">
                    <div className="inline-flex gap-1">
                      <button
                        type="button"
                        onClick={() => startEdit(redirect)}
                        className="border border-neutral-200 p-2 text-neutral-500 transition-colors hover:border-[#E02424] hover:text-[#E02424]"
                        aria-label={`Edit redirect ${redirect.source}`}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setDeletingId(redirect._id);
                          setDeletingSource(redirect.source);
                        }}
                        className="border border-neutral-200 p-2 text-neutral-500 transition-colors hover:border-red-500 hover:text-red-500"
                        aria-label={`Delete redirect ${redirect.source}`}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <ConfirmDeleteModal
        isOpen={!!deletingId}
        title="Delete Redirect"
        onCancel={() => setDeletingId(null)}
        onConfirm={handleConfirmDelete}
        isPending={pending}
        itemName={deletingSource}
      />
    </Panel>
  );
}
