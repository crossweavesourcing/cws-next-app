'use client';

import { useRef, useState } from 'react';
import Image from 'next/image';
import { UploadCloud, X, Star } from 'lucide-react';

export type MediaItem = {
  id: string;
  type: 'existing' | 'new';
  url?: string;
  file?: File;
  isFeatured: boolean;
  altText?: string;
};

interface MediaUploaderProps {
  mediaItems: MediaItem[];
  setMediaItems: (items: MediaItem[]) => void;
}

export function MediaUploader({ mediaItems, setMediaItems }: MediaUploaderProps) {
  const [dragActive, setDragActive] = useState(false);
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
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFiles(Array.from(e.dataTransfer.files));
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    if (e.target.files && e.target.files.length > 0) {
      handleFiles(Array.from(e.target.files));
    }
  };

  const handleFiles = (files: File[]) => {
    const newItems: MediaItem[] = files.map((file) => ({
      id: Math.random().toString(36).substring(7),
      type: 'new',
      file,
      url: URL.createObjectURL(file),
      isFeatured: false,
      altText: '',
    }));

    setMediaItems([...mediaItems, ...newItems]);
  };

  const updateAltText = (id: string, altText: string) => {
    setMediaItems(
      mediaItems.map((m) => m.id === id ? { ...m, altText } : m)
    );
  };

  const removeMedia = (id: string) => {
    const itemToRemove = mediaItems.find(m => m.id === id);
    if (itemToRemove?.url && itemToRemove.type === 'new') {
      URL.revokeObjectURL(itemToRemove.url);
    }
    setMediaItems(mediaItems.filter((m) => m.id !== id));
  };

  const setFeatured = (id: string) => {
    setMediaItems(
      mediaItems.map((m) => ({
        ...m,
        isFeatured: m.id === id,
      }))
    );
  };

  return (
    <div className="space-y-4">
      <label className="block text-xs font-bold uppercase text-neutral-400 mb-1">Product Media</label>
      
      <div 
        className={`relative border-2 border-dashed bg-black/15 p-8 text-center transition-colors ${dragActive ? 'border-[#E02424] bg-[#E02424]/10' : 'border-white/20 hover:border-white/40'}`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
      >
        <button type="button" className="flex w-full flex-col items-center justify-center space-y-2 text-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E02424]" onClick={() => inputRef.current?.click()}>
          <UploadCloud className="w-8 h-8 text-neutral-400" />
          <p className="text-sm text-neutral-400">
            <span className="text-white font-bold">Click to upload</span> or drag and drop
          </p>
          <p className="text-xs text-neutral-500">Images and Videos accepted</p>
        </button>
        <input 
          ref={inputRef}
          type="file" 
          multiple
          accept="image/*,video/*" 
          className="hidden" 
          onChange={handleChange}
        />
      </div>

      {mediaItems.length > 0 && (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
          {mediaItems.map((item) => {
            const isVideo = item.file?.type.startsWith('video/') || item.url?.match(/\.(mp4|webm|mov)$/i);
            return (
              <div key={item.id} className="space-y-2">
                <div className={`relative group aspect-square overflow-hidden border-2 transition-colors ${item.isFeatured ? 'border-[#E02424]' : 'border-white/10'}`}>
                  {isVideo ? (
                    <video src={item.url} className="h-full w-full object-cover" muted playsInline />
                  ) : (
                    <Image src={item.url!} alt={item.altText || "Preview"} fill className="object-cover" />
                  )}
                  
                  {/* Overlay Controls */}
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-between p-2">
                    <div className="flex justify-between">
                      <button
                        type="button"
                        onClick={() => setFeatured(item.id)}
                        className={`rounded-full p-1.5 transition-colors ${item.isFeatured ? 'bg-[#E02424] text-white' : 'bg-black/70 text-neutral-300 hover:bg-white/20 hover:text-white'}`}
                        title="Set as Featured"
                      >
                        <Star className={`w-4 h-4 ${item.isFeatured ? 'fill-current' : ''}`} />
                      </button>
                      <button
                        type="button"
                        onClick={() => removeMedia(item.id)}
                        className="rounded-full bg-black/70 p-1.5 text-white transition-colors hover:bg-red-500"
                        title="Remove"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                    {item.isFeatured && (
                      <span className="text-[10px] font-bold uppercase tracking-wider text-white text-center bg-[#E02424]/80 py-1 rounded">
                        Featured
                      </span>
                    )}
                  </div>
                </div>
                {!isVideo && (
                  <input
                    type="text"
                    placeholder="Alt text (describe image)"
                    value={item.altText || ''}
                    onChange={(e) => updateAltText(item.id, e.target.value)}
                    className="w-full border border-white/10 bg-black/20 p-1.5 text-[10px] text-white outline-none transition-colors focus:border-[#E02424] placeholder:text-neutral-500"
                  />
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
