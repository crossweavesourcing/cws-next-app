"use client";

import { useState } from 'react';
import Image from 'next/image';

type ProductImageGalleryProps = {
  images: string[];
  productName: string;
};

export default function ProductImageGallery({ images, productName }: ProductImageGalleryProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const activeImage = images[activeIndex] ?? images[0];

  if (!activeImage) {
    return null;
  }

  return (
    <div className="space-y-4">
      <div className="relative min-h-[360px] lg:min-h-[560px] overflow-hidden bg-neutral-900">
        <Image
          key={activeImage}
          src={activeImage}
          alt={`${productName} primary image ${activeIndex + 1}`}
          fill
          loading="eager"
          sizes="(max-width: 1024px) 100vw, 50vw"
          className="object-cover opacity-85 transition-opacity duration-500"
        />
        <div className="absolute inset-0 bg-black/20" />
      </div>

      {images.length > 1 && (
        <div className="grid grid-cols-4 sm:grid-cols-5 lg:grid-cols-4 gap-3 px-4 pb-4 sm:px-0 sm:pb-0">
          {images.map((image, index) => {
            const isActive = index === activeIndex;

            return (
              <button
                key={`${image}-${index}`}
                type="button"
                onClick={() => setActiveIndex(index)}
                className={`group relative aspect-[4/3] overflow-hidden border bg-neutral-900 transition-colors ${
                  isActive ? 'border-[#E02424]' : 'border-white/10 hover:border-white/45'
                }`}
                aria-label={`Show ${productName} image ${index + 1}`}
                aria-pressed={isActive}
              >
                <Image
                  src={image}
                  alt={`${productName} thumbnail ${index + 1}`}
                  fill
                  sizes="(max-width: 640px) 25vw, 120px"
                  className={`object-cover transition-all duration-300 ${
                    isActive ? 'opacity-100' : 'opacity-65 group-hover:opacity-100'
                  }`}
                />
                <span className={`absolute inset-0 ${isActive ? 'bg-[#E02424]/10' : 'bg-black/10'}`} />
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
