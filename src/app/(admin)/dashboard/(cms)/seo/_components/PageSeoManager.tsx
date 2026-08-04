'use client';

import { useState } from 'react';
import { Panel } from '../../_components/DashboardComponents';
import { savePageSeoAction, deletePageSeoAction } from '@/auth/actions/seo.actions';
import type { PageSeoDocument } from '@/types/seo';

export type SerializedPageSeoDocument = Omit<PageSeoDocument, '_id' | 'createdAt' | 'createdBy' | 'updatedAt' | 'updatedBy'> & {
  _id: string;
  createdAt?: string;
  createdBy?: string | null;
  updatedAt?: string;
  updatedBy?: string | null;
};

export function PageSeoManager({ pageSeos }: { pageSeos: SerializedPageSeoDocument[] }) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isAdding, setIsAdding] = useState(false);

  async function handleSave(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const res = await savePageSeoAction(formData);
    if (res.success) {
      setEditingId(null);
      setIsAdding(false);
    } else {
      alert(res.error || 'Failed to save SEO overrides');
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Are you sure you want to delete this page override?')) return;
    const res = await deletePageSeoAction(id);
    if (!res.success) {
      alert(res.error || 'Failed to delete');
    }
  }

  return (
    <Panel eyebrow="SEO Management" title="Page Overrides">
      <div className="mt-8 space-y-4">
        {pageSeos.map((seo) => {
          const isEditing = editingId === seo._id?.toString();
          
          if (isEditing) {
            return (
              <form key={seo._id?.toString()} onSubmit={handleSave} className="border border-white/10 bg-white/[0.04] p-4">
                <div className="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-xs font-bold uppercase text-neutral-400">Path (e.g. /about)</label>
                    <input name="path" defaultValue={seo.path} required className="w-full border border-white/10 bg-black/20 p-2 text-white" />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-bold uppercase text-neutral-400">Title</label>
                    <input name="title" defaultValue={seo.title} className="w-full border border-white/10 bg-black/20 p-2 text-white" />
                  </div>
                </div>
                <div className="mb-4">
                  <label className="mb-1 block text-xs font-bold uppercase text-neutral-400">Description</label>
                  <textarea name="description" defaultValue={seo.description} className="w-full border border-white/10 bg-black/20 p-2 text-white" rows={2} />
                </div>
                <div className="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-xs font-bold uppercase text-neutral-400">Canonical URL</label>
                    <input name="canonicalUrl" defaultValue={seo.canonicalUrl} type="url" className="w-full border border-white/10 bg-black/20 p-2 text-white" />
                  </div>
                  <div className="flex items-center mt-6">
                    <label className="flex items-center gap-2 text-xs font-bold uppercase text-neutral-300">
                      <input type="hidden" name="noindex" value="false" />
                      <input type="checkbox" name="noindex" value="true" defaultChecked={seo.noindex} className="h-4 w-4 accent-[#E02424]" />
                      No Index (Hide from search)
                    </label>
                  </div>
                </div>
                <div className="flex justify-end gap-2">
                  <button type="button" onClick={() => setEditingId(null)} className="px-4 py-2 text-xs font-bold uppercase text-neutral-400 hover:text-white">Cancel</button>
                  <button type="submit" className="bg-[#E02424] px-4 py-2 text-xs font-bold uppercase text-white hover:bg-[#c91f1f]">Save</button>
                </div>
              </form>
            );
          }

          return (
            <div key={seo._id?.toString()} className="flex items-center justify-between border border-white/10 bg-white/[0.02] p-4">
              <div>
                <p className="font-mono text-sm text-[#E02424]">{seo.path}</p>
                <p className="text-sm font-bold text-white mt-1">{seo.title || '(No Title Override)'}</p>
                {seo.noindex && <span className="mt-2 inline-block bg-red-500/20 text-red-400 text-[10px] px-2 py-1 font-bold uppercase">No Index</span>}
              </div>
              <div className="flex gap-2">
                <button onClick={() => setEditingId(seo._id?.toString() ?? null)} className="border border-white/20 px-3 py-1 text-xs font-bold uppercase text-white hover:bg-white/10">Edit</button>
                <button onClick={() => handleDelete(seo._id?.toString() ?? '')} className="border border-red-500/20 px-3 py-1 text-xs font-bold uppercase text-red-400 hover:bg-red-500/10">Delete</button>
              </div>
            </div>
          );
        })}

        {isAdding && (
          <form onSubmit={handleSave} className="border border-white/10 bg-white/[0.04] p-4">
             <div className="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs font-bold uppercase text-neutral-400">Path (e.g. /about)</label>
                  <input name="path" required className="w-full border border-white/10 bg-black/20 p-2 text-white" />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-bold uppercase text-neutral-400">Title</label>
                  <input name="title" className="w-full border border-white/10 bg-black/20 p-2 text-white" />
                </div>
              </div>
              <div className="mb-4">
                <label className="mb-1 block text-xs font-bold uppercase text-neutral-400">Description</label>
                <textarea name="description" className="w-full border border-white/10 bg-black/20 p-2 text-white" rows={2} />
              </div>
              <div className="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs font-bold uppercase text-neutral-400">Canonical URL</label>
                  <input name="canonicalUrl" type="url" className="w-full border border-white/10 bg-black/20 p-2 text-white" />
                </div>
                <div className="flex items-center mt-6">
                  <label className="flex items-center gap-2 text-xs font-bold uppercase text-neutral-300">
                    <input type="hidden" name="noindex" value="false" />
                    <input type="checkbox" name="noindex" value="true" className="h-4 w-4 accent-[#E02424]" />
                    No Index (Hide from search)
                  </label>
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <button type="button" onClick={() => setIsAdding(false)} className="px-4 py-2 text-xs font-bold uppercase text-neutral-400 hover:text-white">Cancel</button>
                <button type="submit" className="bg-[#E02424] px-4 py-2 text-xs font-bold uppercase text-white hover:bg-[#c91f1f]">Add Override</button>
              </div>
          </form>
        )}

        {!isAdding && (
          <button onClick={() => setIsAdding(true)} className="w-full border border-dashed border-white/20 p-4 text-sm font-bold uppercase text-neutral-400 hover:border-white/40 hover:text-white">
            + Add Page Override
          </button>
        )}
      </div>
    </Panel>
  );
}
