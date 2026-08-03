"use client";

import { useMemo, useState, useSyncExternalStore } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { ArrowUpRight, Search } from 'lucide-react';
import type { ProductDocument, CategoryDocument } from '@/types/catalog';
import type { SectionContent } from '@/lib/section-definitions';
import { trackEvent } from '@/lib/analytics';

type ProductsPortfolioProps = {
  initialCategory?: string;
  products: ProductDocument[];
  categories: CategoryDocument[];
  section?: { paused: boolean; content?: SectionContent };
};

function getCategoryFromLocation(categories: CategoryDocument[]): string | null {
  if (typeof window === 'undefined') {
    return null;
  }

  const requestedCategory = new URLSearchParams(window.location.search).get('category');
  return requestedCategory && categories.some(c => c.name === requestedCategory) || requestedCategory === 'All'
    ? requestedCategory
    : null;
}

function subscribeToCategoryChanges(callback: () => void) {
  window.addEventListener('popstate', callback);
  window.addEventListener('cws-products-category-change', callback);

  return () => {
    window.removeEventListener('popstate', callback);
    window.removeEventListener('cws-products-category-change', callback);
  };
}

export default function ProductsPortfolio({ initialCategory = 'All', products, categories, section }: ProductsPortfolioProps) {
  const copy = (key: string, fallback: string) => typeof section?.content?.[key] === 'string' ? section.content[key] as string : fallback;
  const [searchTerm, setSearchTerm] = useState('');
  
  const getLoc = () => getCategoryFromLocation(categories);
  const urlCategory = useSyncExternalStore(subscribeToCategoryChanges, getLoc, () => null);
  const activeCategoryName = urlCategory ?? initialCategory;

  const filteredProducts = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();

    return products.filter((product) => {
      const category = categories.find(c => c._id?.toString() === product.categoryId?.toString());
      const categoryName = category?.name || 'Unknown';
      const categoryMatches = activeCategoryName === 'All' || categoryName === activeCategoryName;
      
      const searchMatches =
        !normalizedSearch ||
        [product.name, categoryName, product.shortDescription].some((value) =>
          value?.toLowerCase().includes(normalizedSearch),
        );

      return categoryMatches && searchMatches;
    });
  }, [activeCategoryName, searchTerm, products, categories]);

  if (section?.paused) return null;

  return (
    <section className="py-16 md:py-24 bg-white border-t border-gray-100">
      <div className="max-w-7xl mx-auto px-6 md:px-12 space-y-10">
        <div id='products' className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-10 items-end">
          <div className="lg:col-span-5 space-y-3">
            <span className="block text-xs sm:text-sm font-sans font-bold text-[#E02424] uppercase tracking-[0.3em]">
              {copy('eyebrow', 'Manufacturing Portfolio')}
            </span>
            <h2  className="text-3xl sm:text-4xl md:text-5xl font-sans font-bold text-neutral-900 tracking-tight uppercase leading-snug">
              {copy('heading', 'All Products')}
            </h2>
          </div>
          <div className="lg:col-span-7 grid grid-cols-1 md:grid-cols-[1fr_auto] gap-4">
            <label htmlFor="products-search" className="relative block">
              <span className="sr-only">Search products</span>
              <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" aria-hidden="true" />
              <input
                id="products-search"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder={copy('searchPlaceholder', 'Search products')}
                className="h-12 w-full border border-neutral-200 bg-[#F9F9F9] pl-11 pr-4 text-sm text-neutral-900 outline-none transition-colors placeholder:text-neutral-400 focus:border-[#E02424] focus:bg-white"
              />
            </label>
            <span className="h-12 px-5 inline-flex items-center justify-center border border-neutral-200 bg-[#F9F9F9] text-[11px] font-bold uppercase tracking-[0.2em] text-neutral-500">
              {filteredProducts.length} {copy('itemLabel', 'Items')}
            </span>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => {
              window.history.replaceState(null, '', '/products');
              window.dispatchEvent(new Event('cws-products-category-change'));
            }}
            className={`h-10 border px-4 text-[11px] font-bold uppercase tracking-[0.18em] transition-colors focus:outline-none focus:ring-2 focus:ring-[#E02424] focus:ring-offset-1 ${
              activeCategoryName === 'All'
                ? 'border-[#E02424] bg-[#E02424] text-white'
                : 'border-neutral-200 bg-white text-neutral-700 hover:border-[#E02424]/50 hover:text-[#E02424]'
            }`}
            aria-pressed={activeCategoryName === 'All'}
          >
            All
          </button>
          {categories.map((category) => (
            <button
              key={category._id?.toString()}
              type="button"
              onClick={() => {
                const nextUrl = `/products?category=${encodeURIComponent(category.name)}`;
                window.history.replaceState(null, '', nextUrl);
                window.dispatchEvent(new Event('cws-products-category-change'));
              }}
              className={`h-10 border px-4 text-[11px] font-bold uppercase tracking-[0.18em] transition-colors focus:outline-none focus:ring-2 focus:ring-[#E02424] focus:ring-offset-1 ${
                activeCategoryName === category.name
                  ? 'border-[#E02424] bg-[#E02424] text-white'
                  : 'border-neutral-200 bg-white text-neutral-700 hover:border-[#E02424]/50 hover:text-[#E02424]'
              }`}
              aria-pressed={activeCategoryName === category.name}
            >
              {category.name}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5 md:gap-6">
          {filteredProducts.map((product) => {
            const category = categories.find(c => c._id?.toString() === product.categoryId?.toString());
            const categoryName = category?.name || 'Unknown';
            const images = product.images?.length ? product.images : (product.image ? [product.image] : []);
            const mainAlt = product.images?.length 
              ? (product.imagesAltText?.[0] || product.name)
              : (product.imageAltText || product.name);
            
            return (
              <Link
                key={product.slug}
                href={`/products/${product.slug}`}
                onClick={() => {
                  trackEvent('select_item', {
                    item_name: product.name,
                    item_category: categoryName
                  });
                }}
                className="group bg-[#F9F9F9] border border-neutral-100 transition-colors hover:border-[#E02424]/30 hover:bg-white"
              >
                <div className="relative h-72 overflow-hidden bg-neutral-200">
                  {images[0] && (
                    <Image
                      src={images[0]}
                      alt={mainAlt}
                      fill
                      sizes="(max-width: 768px) 100vw, (max-width: 1280px) 50vw, 33vw"
                      className="object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                  )}
                  <div className="absolute inset-0 bg-black/5 transition-colors group-hover:bg-black/0" />
                </div>
                <article className="p-6 sm:p-8 space-y-5">
                  <div className="flex items-center justify-between gap-4 border-b border-neutral-200 pb-4">
                    <span className="text-[10px] font-sans font-bold uppercase tracking-[0.24em] text-[#CC1E1E]">
                      {categoryName}
                    </span>
                    <ArrowUpRight className="h-4 w-4 text-neutral-400 transition-colors group-hover:text-[#E02424]" />
                  </div>
                  <div className="space-y-3">
                    <h3 className="text-base sm:text-lg font-sans font-bold uppercase tracking-[0.12em] text-neutral-950 leading-snug">
                      {product.name}
                    </h3>
                    <p className="text-sm sm:text-base leading-relaxed text-neutral-600 font-sans font-light">
                      {product.shortDescription}
                    </p>
                  </div>
                </article>
              </Link>
            );
          })}
        </div>

        {filteredProducts.length === 0 && (
          <div className="border border-neutral-200 bg-[#F9F9F9] p-8 text-center">
            <p className="text-sm text-neutral-600 font-light">
              {copy('emptyMessage', 'No products match the current search. Try another category or keyword.')}
            </p>
          </div>
        )}
      </div>
    </section>
  );
}
