"use client";

import { useState } from 'react';
import Image from 'next/image';
import { trackEvent } from '@/lib/analytics';

type ProductImageGalleryProps = {
  images: string[];
  imageAltTexts: string[];
  productName: string;
};

export default function ProductImageGallery({ images, imageAltTexts, productName }: ProductImageGalleryProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const activeImage = images[activeIndex] ?? images[0];
  const activeAltText = imageAltTexts[activeIndex] || `${productName} image ${activeIndex + 1}`;

  const updateActiveIndex = (newIndex: number) => {
    setActiveIndex(newIndex);
    trackEvent('interaction_gallery', {
      item_name: productName
    });
  };

  if (!activeImage) {
    return null;
  }

  return (
    <div className="space-y-4">
      <div id="main-product-image" aria-live="polite" className="relative min-h-[360px] lg:min-h-[560px] overflow-hidden bg-neutral-900">
        <Image
          key={activeImage}
          src={activeImage}
          alt={activeAltText}
          fill
          priority
          fetchPriority="high"
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
                onClick={() => updateActiveIndex(index)}
                className={`group relative aspect-[4/3] overflow-hidden border bg-neutral-900 transition-colors focus:outline-none focus:ring-2 focus:ring-[#E02424] focus:ring-offset-1 ${
                  isActive ? 'border-[#E02424]' : 'border-white/10 hover:border-white/45'
                }`}
                aria-label={`Show ${productName} image ${index + 1}`}
                aria-current={isActive ? "true" : undefined}
                aria-controls="main-product-image"
              >
                <Image
                  src={image}
                  alt={imageAltTexts[index] || `${productName} thumbnail ${index + 1}`}
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
