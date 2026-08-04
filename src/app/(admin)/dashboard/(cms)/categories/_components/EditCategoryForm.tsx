'use client';

import { useEffect, useState, useRef } from 'react';
import Image from 'next/image';
import { UploadCloud, X } from 'lucide-react';
import { updateCategory } from '@/auth/actions/category.actions';
import type { CategoryDocument } from '@/types/catalog';
import { CatalogManager } from '../../_components/CatalogManager';

export function EditCategoryForm({ category, onSuccess, onCancel }: { category: CategoryDocument, onSuccess?: () => void, onCancel?: () => void }) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const [dragActive, setDragActive] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(category.image || null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    return () => {
      if (preview?.startsWith('blob:')) {
        URL.revokeObjectURL(preview);
      }
    };
  }, [preview]);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') setDragActive(true);
    else if (e.type === 'dragleave') setDragActive(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0]);
    }
  };

  const handleFile = (selectedFile: File) => {
    setFile(selectedFile);
    const objectUrl = URL.createObjectURL(selectedFile);
    setPreview(objectUrl);
  };

  const clearFile = () => {
    setFile(null);
    setPreview(null);
    if (inputRef.current) inputRef.current.value = '';
  };

  async function handleUpdate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    setPending(true);
    setError('');
    
    // Append the file if a new one was selected
    if (file) {
      formData.set('image', file);
    }
    
    const categoryId = category._id?.toString();
    if (!categoryId) {
      setError('Invalid category ID');
      setPending(false);
      return;
    }

    const res = await updateCategory(categoryId, formData);
    if (res.success) {
      if (onSuccess) onSuccess();
    } else {
      setError(res.error || 'An error occurred');
    }
    setPending(false);
  }

  return (
    <><form onSubmit={handleUpdate} className="space-y-4">
      <span className="break-words text-[10px] font-bold uppercase tracking-[0.16em] text-[#E02424]">
        Edit Category
      </span>
      <h3 className="mt-2 text-2xl font-black uppercase tracking-tight">Update</h3>
      
      {error && <div className="text-red-500 text-sm bg-red-500/10 p-2 border border-red-500/20">{error}</div>}

      <div>
        <label className="block text-xs font-bold uppercase text-neutral-400 mb-1">Name</label>
        <input name="name" defaultValue={category.name} required className="w-full bg-white/5 border border-white/10 p-2 text-white" />
      </div>
      
      <div>
        <label className="block text-xs font-bold uppercase text-neutral-400 mb-1">Slug</label>
        <input name="slug" defaultValue={category.slug} required className="w-full bg-white/5 border border-white/10 p-2 text-white" />
      </div>

      <div>
        <label className="block text-xs font-bold uppercase text-neutral-400 mb-1">Description</label>
        <textarea name="description" defaultValue={category.description} required className="w-full bg-white/5 border border-white/10 p-2 text-white" rows={3} />
      </div>

      <div>
        <label className="block text-xs font-bold uppercase text-neutral-400 mb-1">Image</label>
        <div 
          className={`relative border-2 border-dashed p-6 text-center transition-colors ${dragActive ? 'border-[#E02424] bg-[#E02424]/10' : 'border-white/20 hover:border-white/40'} ${preview ? 'border-none p-0' : ''}`}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
        >
          {preview ? (
            <div className="relative h-48 w-full overflow-hidden border border-white/20">
              <Image src={preview} alt="Preview" fill className="object-cover" />
              <button 
                type="button" 
                onClick={clearFile}
                className="absolute top-2 right-2 bg-black/50 p-1 rounded-full text-white hover:bg-red-500 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center space-y-2 cursor-pointer" onClick={() => inputRef.current?.click()}>
              <UploadCloud className="w-8 h-8 text-neutral-400" />
              <p className="text-sm text-neutral-400">
                <span className="text-white font-bold">Click to upload</span> or drag and drop
              </p>
              <p className="text-xs text-neutral-500">PNG, JPG, WEBP up to 5MB</p>
            </div>
          )}
          <input 
            ref={inputRef}
            type="file" 
            name="image" 
            accept="image/*" 
            className="hidden" 
            onChange={handleChange}
          />
        </div>
      </div>

      <div className="mt-4 border border-white/10 bg-white/[0.04] p-4">
        <h4 className="mb-3 text-sm font-bold uppercase text-white">SEO Overrides</h4>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="block text-xs font-bold uppercase text-neutral-400 mb-1">Title Override</label>
            <input name="seoOverrides.title" defaultValue={category.seoOverrides?.title} className="w-full border border-white/10 bg-white/[0.06] p-2.5 text-white outline-none transition-colors" />
          </div>
          <div>
            <label className="block text-xs font-bold uppercase text-neutral-400 mb-1">Canonical URL Override</label>
            <input name="seoOverrides.canonicalUrl" defaultValue={category.seoOverrides?.canonicalUrl} className="w-full border border-white/10 bg-white/[0.06] p-2.5 text-white outline-none transition-colors" />
          </div>
        </div>
        <div className="mt-4">
          <label className="block text-xs font-bold uppercase text-neutral-400 mb-1">Description Override</label>
          <textarea name="seoOverrides.description" defaultValue={category.seoOverrides?.description} className="w-full border border-white/10 bg-white/[0.06] p-2.5 text-white outline-none transition-colors" rows={2} />
        </div>
        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="block text-xs font-bold uppercase text-neutral-400 mb-1">Social Title</label>
            <input name="seoOverrides.socialTitle" defaultValue={category.seoOverrides?.socialTitle} className="w-full border border-white/10 bg-white/[0.06] p-2.5 text-white outline-none transition-colors" />
          </div>
          <div>
            <label className="block text-xs font-bold uppercase text-neutral-400 mb-1">Social Image URL</label>
            <input name="seoOverrides.socialImage" defaultValue={category.seoOverrides?.socialImage} className="w-full border border-white/10 bg-white/[0.06] p-2.5 text-white outline-none transition-colors" />
          </div>
        </div>
        <div className="mt-4">
          <label className="block text-xs font-bold uppercase text-neutral-400 mb-1">Social Description</label>
          <textarea name="seoOverrides.socialDescription" defaultValue={category.seoOverrides?.socialDescription} className="w-full border border-white/10 bg-white/[0.06] p-2.5 text-white outline-none transition-colors" rows={2} />
        </div>
        <div className="mt-4">
          <label className="block text-xs font-bold uppercase text-neutral-400 mb-1">Breadcrumb Label</label>
          <input name="seoOverrides.breadcrumbLabel" defaultValue={category.seoOverrides?.breadcrumbLabel} className="w-full border border-white/10 bg-white/[0.06] p-2.5 text-white outline-none transition-colors" />
        </div>
        <div className="mt-4 space-y-3">
          <label className="flex items-center gap-2 text-xs font-bold uppercase text-neutral-300">
            <input type="hidden" name="seoOverrides.noindex" value="false" />
            <input type="checkbox" name="seoOverrides.noindex" value="true" defaultChecked={category.seoOverrides?.noindex} className="h-4 w-4 accent-[#E02424]" />
            No Index (Hide from search)
          </label>
          <label className="flex items-center gap-2 text-xs font-bold uppercase text-neutral-300">
            <input type="hidden" name="seoOverrides.nofollow" value="false" />
            <input type="checkbox" name="seoOverrides.nofollow" value="true" defaultChecked={category.seoOverrides?.nofollow} className="h-4 w-4 accent-[#E02424]" />
            No Follow
          </label>
          <label className="flex items-center gap-2 text-xs font-bold uppercase text-neutral-300">
            <input type="hidden" name="seoOverrides.includeInSitemap" value="false" />
            <input type="checkbox" name="seoOverrides.includeInSitemap" value="true" defaultChecked={category.seoOverrides?.includeInSitemap !== false} className="h-4 w-4 accent-[#E02424]" />
            Include in sitemap
          </label>
        </div>
      </div>

      <div className="flex items-center gap-2">
        {/* We need a hidden input with value 'false' so that if checkbox is unchecked, it sends 'false' instead of nothing, or we can just let checkbox send 'true'. 
            Wait, in my previous code I did: <input type="hidden" name="visible" value="true" />
            Actually, HTML checkboxes only send their value if checked. If unchecked, they send nothing.
            So we should do what they had: a hidden input that always sends false? Wait, the original code had:
            <input type="hidden" name="visible" value="true" />
            <input type="checkbox" defaultChecked disabled className="mt-1" />
            Wait, the original code hardcoded visible to true!
            We should allow toggling visible. */}
        <input type="hidden" name="visible" value="false" />
        <input type="checkbox" defaultChecked={category.visible} name="visible" value="true" className="mt-1" />
        <span className="text-xs uppercase text-neutral-400">Visible</span>
      </div>

      <button disabled={pending} className="w-full bg-[#E02424] text-white py-2 font-bold uppercase tracking-wider disabled:opacity-50 mt-4">
        {pending ? 'Saving...' : 'Update Category'}
      </button>
      {onCancel && (
        <button type="button" onClick={onCancel} className="w-full bg-transparent border border-white/20 text-white py-2 font-bold uppercase tracking-wider mt-2 hover:bg-white/5">
          Cancel
        </button>
      )}
    </form><CatalogManager locked={{ kind: 'category', id: category._id.toString(), name: category.name }} /></>
  );
}
