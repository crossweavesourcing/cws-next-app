'use client';

import { useEffect, useState, useRef } from 'react';
import Image from 'next/image';
import { UploadCloud, X } from 'lucide-react';
import { createCategory } from '@/auth/actions/category.actions';

export function CategoryForm({ onSuccess, onCancel }: { onSuccess?: () => void, onCancel?: () => void }) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const [dragActive, setDragActive] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
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

  async function handleAdd(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    setPending(true);
    setError('');
    
    if (file) {
      formData.set('image', file);
    } else {
      setError('Image is required');
      setPending(false);
      return;
    }
    
    const res = await createCategory(formData);
    if (res.success) {
      if (onSuccess) onSuccess();
    } else {
      setError(res.error || 'An error occurred');
    }
    setPending(false);
  }

  return (
    <form onSubmit={handleAdd} className="space-y-4">
      <span className="break-words text-[10px] font-bold uppercase tracking-[0.16em] text-[#E02424]">
        New Category
      </span>
      <h3 className="mt-2 text-2xl font-black uppercase tracking-tight">Create</h3>
      
      {error && <div className="text-red-500 text-sm bg-red-500/10 p-2 border border-red-500/20">{error}</div>}

      <div>
        <label className="block text-xs font-bold uppercase text-neutral-400 mb-1">Name</label>
        <input name="name" required className="w-full bg-white/5 border border-white/10 p-2 text-white" />
      </div>
      
      <div>
        <label className="block text-xs font-bold uppercase text-neutral-400 mb-1">Slug</label>
        <input name="slug" required className="w-full bg-white/5 border border-white/10 p-2 text-white" />
      </div>

      <div>
        <label className="block text-xs font-bold uppercase text-neutral-400 mb-1">Description</label>
        <textarea name="description" required className="w-full bg-white/5 border border-white/10 p-2 text-white" rows={3} />
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

      <div className="flex items-center gap-2 mt-4">
        <input type="hidden" name="visible" value="false" />
        <input type="checkbox" name="visible" value="true" defaultChecked className="mt-1" />
        <span className="text-xs uppercase text-neutral-400">Visible</span>
      </div>

      <button disabled={pending} className="w-full bg-[#E02424] text-white py-2 font-bold uppercase tracking-wider disabled:opacity-50 mt-4">
        {pending ? 'Saving...' : 'Save Category'}
      </button>
      {onCancel && (
        <button type="button" onClick={onCancel} className="w-full bg-transparent border border-white/20 text-white py-2 font-bold uppercase tracking-wider mt-2 hover:bg-white/5">
          Cancel
        </button>
      )}
    </form>
  );
}
