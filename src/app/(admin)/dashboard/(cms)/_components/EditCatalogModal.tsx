'use client';

import { useState } from 'react';
import { LoaderCircle, X } from 'lucide-react';
import type { SerializedCatalogDocument } from '@/types/catalog';
import { updateCatalogMetadataAction } from '@/auth/actions/catalog-document.actions';

export function EditCatalogModal({ 
  catalog, 
  onClose, 
  onSuccess 
}: { 
  catalog: SerializedCatalogDocument; 
  onClose: () => void; 
  onSuccess: () => void;
}) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  
  async function handleSave(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    setPending(true);
    setError('');

    const checked = (name: string) => formData.getAll(name).includes('true');
    const input = {
      title: formData.get('title') as string,
      description: formData.get('description') as string,
      seoOverrides: {
        title: (formData.get('seoOverrides.title') as string) || undefined,
        description: (formData.get('seoOverrides.description') as string) || undefined,
        canonicalUrl: (formData.get('seoOverrides.canonicalUrl') as string) || undefined,
        noindex: checked('seoOverrides.noindex'),
        nofollow: checked('seoOverrides.nofollow'),
        includeInSitemap: checked('seoOverrides.includeInSitemap'),
        socialTitle: (formData.get('seoOverrides.socialTitle') as string) || undefined,
        socialDescription: (formData.get('seoOverrides.socialDescription') as string) || undefined,
        socialImage: (formData.get('seoOverrides.socialImage') as string) || undefined,
        breadcrumbLabel: (formData.get('seoOverrides.breadcrumbLabel') as string) || undefined,
      }
    };

    const res = await updateCatalogMetadataAction(catalog._id, input);
    
    setPending(false);
    if (res.success) {
      onSuccess();
    } else {
      setError(res.error || 'Failed to update catalog');
    }
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/75 p-3 sm:p-6" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div role="dialog" className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden border border-neutral-700 bg-[#101010] shadow-2xl">
        <div className="flex shrink-0 items-center justify-between border-b border-white/10 px-5 py-4">
          <div>
            <span className="text-[10px] font-bold uppercase text-[#E02424]">Edit Document</span>
            <h3 className="mt-1 text-xl font-black uppercase">Catalog Metadata</h3>
          </div>
          <button type="button" disabled={pending} onClick={onClose} className="p-2 text-neutral-400 hover:text-white disabled:opacity-40">
            <X className="h-5 w-5" />
          </button>
        </div>
        <form onSubmit={handleSave} className="flex min-h-0 flex-col overflow-y-auto">
          <div className="space-y-5 p-5">
            {error && <div className="border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-200">{error}</div>}
            
            <label className="block text-xs font-bold uppercase text-neutral-400">
              Title
              <input name="title" defaultValue={catalog.title} required maxLength={160} className="mt-2 w-full border border-white/10 bg-white/[0.06] p-3 text-white" />
            </label>
            <label className="block text-xs font-bold uppercase text-neutral-400">
              Description
              <textarea name="description" defaultValue={catalog.description} rows={3} maxLength={1000} className="mt-2 w-full border border-white/10 bg-white/[0.06] p-3 text-white" />
            </label>

            <div className="mt-6 border border-white/10 bg-white/[0.04] p-4">
              <h4 className="mb-3 text-sm font-bold uppercase text-white">SEO Overrides</h4>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <label className="block text-xs font-bold uppercase text-neutral-400">
                  Title Override
                  <input name="seoOverrides.title" defaultValue={catalog.seoOverrides?.title} className="mt-2 w-full border border-white/10 bg-white/[0.06] p-2.5 text-white" />
                </label>
                <label className="block text-xs font-bold uppercase text-neutral-400">
                  Canonical URL Override
                  <input name="seoOverrides.canonicalUrl" defaultValue={catalog.seoOverrides?.canonicalUrl} className="mt-2 w-full border border-white/10 bg-white/[0.06] p-2.5 text-white" />
                </label>
              </div>
              <label className="mt-4 block text-xs font-bold uppercase text-neutral-400">
                Description Override
                <textarea name="seoOverrides.description" defaultValue={catalog.seoOverrides?.description} rows={2} className="mt-2 w-full border border-white/10 bg-white/[0.06] p-2.5 text-white" />
              </label>
              <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
                <label className="block text-xs font-bold uppercase text-neutral-400">
                  Social Title
                  <input name="seoOverrides.socialTitle" defaultValue={catalog.seoOverrides?.socialTitle} className="mt-2 w-full border border-white/10 bg-white/[0.06] p-2.5 text-white" />
                </label>
                <label className="block text-xs font-bold uppercase text-neutral-400">
                  Social Image URL
                  <input name="seoOverrides.socialImage" defaultValue={catalog.seoOverrides?.socialImage} className="mt-2 w-full border border-white/10 bg-white/[0.06] p-2.5 text-white" />
                </label>
              </div>
              <label className="mt-4 block text-xs font-bold uppercase text-neutral-400">
                Social Description
                <textarea name="seoOverrides.socialDescription" defaultValue={catalog.seoOverrides?.socialDescription} rows={2} className="mt-2 w-full border border-white/10 bg-white/[0.06] p-2.5 text-white" />
              </label>
              <label className="mt-4 block text-xs font-bold uppercase text-neutral-400">
                Breadcrumb Label
                <input name="seoOverrides.breadcrumbLabel" defaultValue={catalog.seoOverrides?.breadcrumbLabel} className="mt-2 w-full border border-white/10 bg-white/[0.06] p-2.5 text-white" />
              </label>
              <div className="mt-4 space-y-3">
                <label className="flex items-center gap-2">
                  <input type="hidden" name="seoOverrides.noindex" value="false" />
                  <input type="checkbox" name="seoOverrides.noindex" value="true" defaultChecked={catalog.seoOverrides?.noindex} className="h-4 w-4 accent-[#E02424]" />
                  <span className="text-xs font-bold uppercase text-neutral-300">No Index (Hide from search)</span>
                </label>
                <label className="flex items-center gap-2">
                  <input type="hidden" name="seoOverrides.nofollow" value="false" />
                  <input type="checkbox" name="seoOverrides.nofollow" value="true" defaultChecked={catalog.seoOverrides?.nofollow} className="h-4 w-4 accent-[#E02424]" />
                  <span className="text-xs font-bold uppercase text-neutral-300">No Follow</span>
                </label>
                <label className="flex items-center gap-2">
                  <input type="hidden" name="seoOverrides.includeInSitemap" value="false" />
                  <input type="checkbox" name="seoOverrides.includeInSitemap" value="true" defaultChecked={catalog.seoOverrides?.includeInSitemap !== false} className="h-4 w-4 accent-[#E02424]" />
                  <span className="text-xs font-bold uppercase text-neutral-300">Include in sitemap</span>
                </label>
              </div>
            </div>
          </div>
          <div className="flex shrink-0 justify-end gap-3 border-t border-white/10 bg-[#101010] p-4">
            <button type="button" disabled={pending} onClick={onClose} className="h-11 border border-white/20 px-5 text-xs font-bold uppercase disabled:opacity-40">Cancel</button>
            <button type="submit" disabled={pending} className="inline-flex h-11 items-center gap-2 bg-[#E02424] px-5 text-xs font-bold uppercase disabled:opacity-40">
              {pending && <LoaderCircle className="h-4 w-4 animate-spin" />} Save Changes
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
