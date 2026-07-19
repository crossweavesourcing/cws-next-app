'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Search, Pencil } from 'lucide-react';
import type { ProductDocument, CategoryDocument } from '@/types/catalog';
import { Panel } from '../_components/DashboardComponents';

export function ProductManagerClient({ 
  products, 
  categories 
}: { 
  products: ProductDocument[],
  categories: CategoryDocument[] 
}) {
  const [activeCategory, setActiveCategory] = useState<string>('All');
  const [searchTerm, setSearchTerm] = useState('');

  // Filter products
  const normalizedSearch = searchTerm.trim().toLowerCase();
  const filteredProducts = products.filter((product) => {
    const categoryMatches = activeCategory === 'All' || product.categoryId?.toString() === activeCategory;
    const searchMatches = !normalizedSearch || 
      [product.name, product.slug, product.shortDescription].some((val) => val?.toLowerCase().includes(normalizedSearch));
    return categoryMatches && searchMatches;
  });

  return (
    <Panel eyebrow="Product Manager" title="Products, Descriptions And Media">
      <div className="mb-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <Link
          href="/dashboard/products/new"
          scroll={false}
          prefetch={true}
          className="inline-block bg-[#E02424] text-white px-4 py-2 text-xs font-bold uppercase tracking-wider"
        >
          + Add New Product
        </Link>
        
        <label className="relative block w-full sm:w-64">
          <span className="sr-only">Search product records</span>
          <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
          <input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search products"
            className="h-10 w-full border border-neutral-200 bg-[#F9F9F9] pl-11 pr-4 text-sm text-neutral-900 outline-none transition-colors placeholder:text-neutral-400 focus:border-[#E02424] focus:bg-white"
          />
        </label>
      </div>

      <div className="mb-6 flex flex-wrap gap-2">
        <button
          onClick={() => setActiveCategory('All')}
          className={`min-h-9 border px-3 py-2 text-center text-[10px] font-bold uppercase tracking-[0.12em] transition-colors ${
            activeCategory === 'All'
              ? 'border-[#E02424] bg-[#E02424] text-white'
              : 'border-neutral-200 bg-white text-neutral-700 hover:border-[#E02424]/50 hover:text-[#E02424]'
          }`}
        >
          All
        </button>
        {categories.map((category) => (
          <button
            key={category._id?.toString()}
            onClick={() => setActiveCategory(category._id?.toString() || '')}
            className={`min-h-9 border px-3 py-2 text-center text-[10px] font-bold uppercase tracking-[0.12em] transition-colors ${
              activeCategory === category._id?.toString()
                ? 'border-[#E02424] bg-[#E02424] text-white'
                : 'border-neutral-200 bg-white text-neutral-700 hover:border-[#E02424]/50 hover:text-[#E02424]'
            }`}
          >
            {category.name}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {filteredProducts.map((product) => {
          const category = categories.find(c => c._id?.toString() === product.categoryId?.toString());
          
          return (
            <article
              key={product._id?.toString()}
              className="flex flex-col border bg-white transition-colors border-neutral-200 hover:border-neutral-300"
            >
              <div className="relative h-48 w-full overflow-hidden bg-neutral-200">
                {product.image && (
                  <Image
                    src={product.image}
                    alt={product.name}
                    fill
                    sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                    className="object-cover"
                  />
                )}
                <div className="absolute top-2 right-2 flex gap-2">
                  <Link
                    href={`/dashboard/products/${product._id}/edit`}
                    scroll={false}
                    prefetch={true}
                    className="bg-white/90 p-2 shadow hover:bg-[#E02424] hover:text-white transition-colors"
                  >
                    <Pencil className="w-4 h-4" />
                  </Link>
                </div>
                {!product.visible && (
                  <div className="absolute top-2 left-2 bg-neutral-900/80 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-white">
                    Hidden
                  </div>
                )}
              </div>
              <div className="flex flex-1 flex-col p-4">
                <span className="mb-1 block text-[10px] font-bold uppercase tracking-[0.14em] text-[#E02424]">
                  {category?.name || 'No Category'}
                </span>
                <h3 className="mb-2 text-sm font-bold uppercase tracking-[0.08em] text-neutral-950">
                  {product.name}
                </h3>
                <p className="mb-4 text-xs leading-relaxed text-neutral-500 line-clamp-3">
                  {product.shortDescription}
                </p>
              </div>
            </article>
          );
        })}
      </div>
    </Panel>
  );
}
