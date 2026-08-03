import Link from 'next/link';
import Image from 'next/image';
import { ArrowUpRight } from 'lucide-react';
import type { CategoryDocument } from '@/types/catalog';
import { SectionItem, contentValue } from './SectionHelpers';

export default function ProductsSection({ section, categories }: { section?: SectionItem, categories: CategoryDocument[] }) {
  if (section?.paused) return null;

  return (
    <section id="products" className="py-16 md:py-24 bg-white border-t border-gray-100">
      <div className="max-w-7xl mx-auto px-6 md:px-12 space-y-12">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-end">
          <div className="lg:col-span-5 space-y-3">
            <span className="block text-xs sm:text-sm font-sans font-bold text-[#E02424] uppercase tracking-[0.3em]">
              {contentValue(section, 'eyebrow', 'Product Portfolio')}
            </span>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-sans font-bold text-neutral-900 tracking-tight uppercase leading-snug">
              {contentValue(section, 'heading', 'Products')}
            </h2>
          </div>
          <p className="lg:col-span-7 text-gray-700 text-sm sm:text-base leading-relaxed font-sans font-light max-w-3xl lg:ml-auto">
            {contentValue(section, 'body', 'Explore representative manufacturing categories supported by product development, private-label production, quality control and export coordination for global apparel programs.')}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5 md:gap-6">
          {categories.map((category) => (
            <Link
              key={category._id?.toString()}
              href={`/products?category=${encodeURIComponent(category.name)}`}
              className="group bg-[#F9F9F9] border border-neutral-100 transition-colors hover:border-[#E02424]/30 hover:bg-white"
            >
              <div className="relative h-72 overflow-hidden bg-neutral-200">
                <Image
                  src={category.image}
                  alt={`${category.name} product category`}
                  fill
                  sizes="(max-width: 768px) 100vw, (max-width: 1280px) 50vw, 33vw"
                  className="object-cover transition-transform duration-500 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-black/10 transition-colors group-hover:bg-black/0" />
              </div>
              <article className="p-6 sm:p-8 space-y-5">
                <div className="flex items-center justify-between gap-4 border-b border-neutral-200 pb-4">
                  <span className="text-[10px] font-sans font-bold uppercase tracking-[0.24em] text-[#CC1E1E]">
                    Category
                  </span>
                  <ArrowUpRight className="h-4 w-4 text-neutral-400 transition-colors group-hover:text-[#E02424]" />
                </div>
                <div className="space-y-3">
                  <h3 className="text-base sm:text-lg font-sans font-bold uppercase tracking-[0.12em] text-neutral-950 leading-snug">
                    {category.name}
                  </h3>
                  <p className="text-sm sm:text-base leading-relaxed text-neutral-600 font-sans font-light">
                    {category.description}
                  </p>
                </div>
              </article>
            </Link>
          ))}
        </div>

        <div className="text-center">
          <Link
            href="/products"
            className="inline-flex h-12 w-full sm:w-auto items-center justify-center gap-2 bg-[#E02424] px-7 text-xs font-bold uppercase tracking-[0.2em] text-white transition-colors hover:bg-black"
          >
            {contentValue(section, 'ctaLabel', 'View All Products')}
            <ArrowUpRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </section>
  );
}
