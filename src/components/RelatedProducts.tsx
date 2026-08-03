import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import type { ProductDocument } from '@/types/catalog';

export function RelatedProducts({ products }: { products: ProductDocument[] }) {
  if (!products || products.length === 0) return null;

  return (
    <section aria-labelledby="related-products-heading" className="py-12 border-t border-neutral-200 dark:border-neutral-800">
      <h2 id="related-products-heading" className="text-2xl font-black uppercase tracking-tight text-neutral-900 dark:text-white mb-6">
        Related Products
      </h2>
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {products.map((product) => (
          <Link
            key={product._id.toString()}
            href={`/products/${product.slug}`}
            className="group block overflow-hidden bg-white shadow-sm transition-all hover:-translate-y-1 hover:shadow-md dark:bg-neutral-900"
          >
            <div className="relative aspect-square bg-neutral-100 dark:bg-neutral-800">
              <Image
                src={product.image || '/placeholder-image.png'}
                alt={product.imageAltText || product.name}
                fill
                sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                className="object-cover object-center transition-transform duration-500 group-hover:scale-105"
              />
            </div>
            <div className="p-4">
              <h3 className="font-bold uppercase tracking-wide text-neutral-900 dark:text-white">
                {product.name}
              </h3>
              <p className="mt-1 line-clamp-2 text-sm text-neutral-600 dark:text-neutral-400">
                {product.shortDescription}
              </p>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
