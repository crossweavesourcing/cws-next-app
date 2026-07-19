'use client';

import { useState, useRef } from 'react';
import Image from 'next/image';
import { UploadCloud, X } from 'lucide-react';
import { updateProduct } from '@/auth/actions/product.actions';
import type { ProductDocument, CategoryDocument } from '@/types/catalog';

export function EditProductForm({ product, categories, onSuccess, onCancel }: { product: ProductDocument, categories: CategoryDocument[], onSuccess?: () => void, onCancel?: () => void }) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  
  const [dragActive, setDragActive] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(product.image || null);
  const inputRef = useRef<HTMLInputElement>(null);

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

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    setPending(true);
    setError('');
    
    if (file) {
      formData.set('image', file);
    }
    
    const productId = product._id?.toString();
    if (!productId) {
      setError('Invalid product ID');
      setPending(false);
      return;
    }
    
    const mfg = formData.get('manufacturingStr') as string;
    formData.set('manufacturing', JSON.stringify(mfg ? mfg.split(',').map(s => s.trim()) : []));
    
    const feat = formData.get('featuresStr') as string;
    formData.set('features', JSON.stringify(feat ? feat.split(',').map(s => s.trim()) : []));
    
    const specs = {
      material: formData.get('spec_material') as string,
      productionFocus: formData.get('spec_productionFocus') as string,
      finishing: formData.get('spec_finishing') as string,
      quality: formData.get('spec_quality') as string,
    };
    formData.set('specifications', JSON.stringify(specs));

    const res = await updateProduct(productId, formData);
    if (res.success) {
      if (onSuccess) onSuccess();
    } else {
      setError(res.error || 'An error occurred');
    }
    setPending(false);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5 text-white">
      <span className="break-words text-[10px] font-bold uppercase tracking-[0.16em] text-[#E02424]">
        Edit Product
      </span>
      <h3 className="mt-2 text-2xl font-black uppercase tracking-tight text-white">Update</h3>
      
      {error && <div className="border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300">{error}</div>}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className="block text-xs font-bold uppercase text-neutral-400 mb-1">Name</label>
          <input name="name" defaultValue={product.name} required className="w-full border border-white/10 bg-white/[0.06] p-2.5 text-white outline-none transition-colors placeholder:text-neutral-600 focus:border-[#E02424] focus:bg-white/[0.09] focus-visible:ring-2 focus-visible:ring-[#E02424]/30" />
        </div>
        <div>
          <label className="block text-xs font-bold uppercase text-neutral-400 mb-1">Slug</label>
          <input name="slug" defaultValue={product.slug} required className="w-full border border-white/10 bg-white/[0.06] p-2.5 text-white outline-none transition-colors placeholder:text-neutral-600 focus:border-[#E02424] focus:bg-white/[0.09] focus-visible:ring-2 focus-visible:ring-[#E02424]/30" />
        </div>
      </div>

      <div>
        <label className="block text-xs font-bold uppercase text-neutral-400 mb-1">Category (Optional)</label>
        <select name="categoryId" defaultValue={product.categoryId?.toString() || ''} className="w-full border border-white/10 bg-[#181818] p-2.5 text-white outline-none transition-colors focus:border-[#E02424] focus-visible:ring-2 focus-visible:ring-[#E02424]/30">
          <option value="">No Category</option>
          {categories.map(c => (
            <option key={c._id.toString()} value={c._id.toString()}>{c.name}</option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-xs font-bold uppercase text-neutral-400 mb-1">Short Description</label>
        <textarea name="shortDescription" defaultValue={product.shortDescription} required className="w-full border border-white/10 bg-white/[0.06] p-2.5 text-white outline-none transition-colors placeholder:text-neutral-600 focus:border-[#E02424] focus:bg-white/[0.09] focus-visible:ring-2 focus-visible:ring-[#E02424]/30" rows={2} />
      </div>

      <div>
        <label className="block text-xs font-bold uppercase text-neutral-400 mb-1">Overview</label>
        <textarea name="overview" defaultValue={product.overview} required className="w-full border border-white/10 bg-white/[0.06] p-2.5 text-white outline-none transition-colors placeholder:text-neutral-600 focus:border-[#E02424] focus:bg-white/[0.09] focus-visible:ring-2 focus-visible:ring-[#E02424]/30" rows={3} />
      </div>

      <div>
        <label className="block text-xs font-bold uppercase text-neutral-400 mb-1">Main Image</label>
        <div 
          className={`relative border-2 border-dashed bg-black/15 p-6 text-center transition-colors ${dragActive ? 'border-[#E02424] bg-[#E02424]/10' : 'border-white/20 hover:border-white/40'} ${preview ? 'border-none p-0' : ''}`}
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
                aria-label="Remove selected main image"
                className="absolute right-2 top-2 rounded-full bg-black/70 p-2 text-white transition-colors hover:bg-[#E02424] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <button type="button" className="flex w-full flex-col items-center justify-center space-y-2 text-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E02424]" onClick={() => inputRef.current?.click()}>
              <UploadCloud className="w-8 h-8 text-neutral-400" />
              <p className="text-sm text-neutral-400">
                <span className="text-white font-bold">Click to upload</span> or drag and drop
              </p>
              <p className="text-xs text-neutral-500">PNG, JPG, WEBP up to 5MB</p>
            </button>
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

      <div>
        <label className="block text-xs font-bold uppercase text-neutral-400 mb-1">Gallery Images (Optional, selecting new files replaces existing)</label>
        <input type="file" name="images" multiple accept="image/*" className="w-full border border-white/10 bg-white/[0.06] p-2 text-sm text-neutral-300 file:mr-3 file:border-0 file:bg-[#E02424] file:px-3 file:py-2 file:text-xs file:font-bold file:uppercase file:tracking-wider file:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E02424]/40" />
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 border-t border-white/10 pt-5 sm:grid-cols-2">
        <div>
          <label className="block text-xs font-bold uppercase text-neutral-400 mb-1">Manufacturing (comma separated)</label>
          <textarea name="manufacturingStr" defaultValue={product.manufacturing?.join(', ')} className="w-full border border-white/10 bg-white/[0.06] p-2.5 text-white outline-none transition-colors focus:border-[#E02424] focus-visible:ring-2 focus-visible:ring-[#E02424]/30" rows={2} />
        </div>
        <div>
          <label className="block text-xs font-bold uppercase text-neutral-400 mb-1">Features (comma separated)</label>
          <textarea name="featuresStr" defaultValue={product.features?.join(', ')} className="w-full border border-white/10 bg-white/[0.06] p-2.5 text-white outline-none transition-colors focus:border-[#E02424] focus-visible:ring-2 focus-visible:ring-[#E02424]/30" rows={2} />
        </div>
      </div>

      <div className="mt-4 border border-white/10 bg-white/[0.04] p-4">
        <h4 className="mb-3 text-sm font-bold uppercase text-white">Specifications</h4>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="block text-[10px] font-bold uppercase text-neutral-400 mb-1">Material</label>
            <input name="spec_material" defaultValue={product.specifications?.material} required className="w-full border border-white/10 bg-black/20 p-2.5 text-sm text-white outline-none transition-colors focus:border-[#E02424] focus-visible:ring-2 focus-visible:ring-[#E02424]/30" />
          </div>
          <div>
            <label className="block text-[10px] font-bold uppercase text-neutral-400 mb-1">Production Focus</label>
            <input name="spec_productionFocus" defaultValue={product.specifications?.productionFocus} required className="w-full border border-white/10 bg-black/20 p-2.5 text-sm text-white outline-none transition-colors focus:border-[#E02424] focus-visible:ring-2 focus-visible:ring-[#E02424]/30" />
          </div>
          <div>
            <label className="block text-[10px] font-bold uppercase text-neutral-400 mb-1">Finishing</label>
            <input name="spec_finishing" defaultValue={product.specifications?.finishing} required className="w-full border border-white/10 bg-black/20 p-2.5 text-sm text-white outline-none transition-colors focus:border-[#E02424] focus-visible:ring-2 focus-visible:ring-[#E02424]/30" />
          </div>
          <div>
            <label className="block text-[10px] font-bold uppercase text-neutral-400 mb-1">Quality</label>
            <input name="spec_quality" defaultValue={product.specifications?.quality} required className="w-full border border-white/10 bg-black/20 p-2.5 text-sm text-white outline-none transition-colors focus:border-[#E02424] focus-visible:ring-2 focus-visible:ring-[#E02424]/30" />
          </div>
        </div>
      </div>

      <label className="mt-4 flex items-center gap-3 text-xs font-bold uppercase tracking-wider text-neutral-300">
        <input type="hidden" name="visible" value="false" />
        <input type="checkbox" name="visible" value="true" defaultChecked={product.visible} className="h-4 w-4 accent-[#E02424] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E02424]/50" />
        Visible
      </label>

      <button disabled={pending} className="mt-4 w-full bg-[#E02424] py-3 font-bold uppercase tracking-wider text-white transition-colors hover:bg-[#c91f1f] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-[#101010] disabled:cursor-not-allowed disabled:opacity-50">
        {pending ? 'Saving...' : 'Update Product'}
      </button>
      {onCancel && (
        <button type="button" onClick={onCancel} className="mt-2 w-full border border-white/20 bg-transparent py-3 font-bold uppercase tracking-wider text-white transition-colors hover:border-white/40 hover:bg-white/[0.06] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E02424]">
          Cancel
        </button>
      )}
    </form>
  );
}
