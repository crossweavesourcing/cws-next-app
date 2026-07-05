import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, Mail } from 'lucide-react';
import ProductFooter from '@/components/ProductFooter';
import ProductHeader from '@/components/ProductHeader';
import ProductImageGallery from '@/components/ProductImageGallery';
import { getProductBySlug, getRelatedProducts, products } from '@/lib/products';

type ProductDetailsPageProps = {
  params: Promise<{
    slug: string;
  }>;
};

export function generateStaticParams() {
  return products.map((product) => ({
    slug: product.slug,
  }));
}

export async function generateMetadata({ params }: ProductDetailsPageProps): Promise<Metadata> {
  const { slug } = await params;
  const product = getProductBySlug(slug);

  if (!product) {
    return {
      title: 'Product Not Found | Cross Weave Sourcing',
    };
  }

  return {
    title: `${product.name} | Cross Weave Sourcing`,
    description: product.shortDescription,
  };
}

export default async function ProductDetailsPage({ params }: ProductDetailsPageProps) {
  const { slug } = await params;
  const product = getProductBySlug(slug);

  if (!product) {
    notFound();
  }

  const relatedProducts = getRelatedProducts(product);
  const productImages = product.images.length > 0 ? product.images : [product.image];

  return (
    <main className="product-site-shell bg-white text-[#1E1E1E] min-h-screen font-sans antialiased selection:bg-[#E02424]/10 selection:text-[#E02424]">
      {/* <ProductHeader /> */}

      <section className="bg-[#101010] text-white">
        <div className="grid grid-cols-1 lg:grid-cols-2 min-h-[560px]">
          <div className="overflow-hidden">
            <ProductImageGallery images={productImages} productName={product.name} />
          </div>
          <div className="p-8 sm:p-12 lg:p-16 flex flex-col justify-center">
            <div className="max-w-xl space-y-7">
              <Link
                href="/products"
                className="inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.22em] text-neutral-400 transition-colors hover:text-[#E02424]"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                Back to Portfolio
              </Link>
              <div className="space-y-4">
                <span className="block text-xs sm:text-sm font-sans font-bold text-[#E02424] uppercase tracking-[0.35em]">
                  {product.category}
                </span>
                <h1 className="text-4xl sm:text-5xl md:text-6xl font-sans font-black uppercase tracking-tight leading-none">
                  {product.name}
                </h1>
                <p className="text-sm sm:text-base leading-relaxed text-neutral-300 font-light">
                  {product.overview}
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="py-16 md:py-24 bg-white">
        <div className="max-w-7xl mx-auto px-6 md:px-12 grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-16">
          <div className="lg:col-span-5 space-y-6">
            <span className="block text-xs sm:text-sm font-sans font-bold text-[#E02424] uppercase tracking-[0.3em]">
              Product Overview
            </span>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-sans font-bold text-neutral-900 tracking-tight uppercase leading-snug">
              Built for Buyer Programs
            </h2>
            <p className="text-gray-700 text-sm sm:text-base leading-relaxed font-sans font-light">
              {product.shortDescription} CWS positions this product as a manufacturing portfolio item, supported by sampling, commercial planning, quality checks and shipment coordination.
            </p>
          </div>

          <div className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-2 gap-5 md:gap-6">
            {product.manufacturing.map((item, index) => (
              <article key={item} className="bg-[#F9F9F9] border border-neutral-100 p-6 sm:p-8 min-h-44">
                <div className="space-y-5">
                  <div className="flex items-center justify-between gap-4 border-b border-neutral-200 pb-4">
                    <span className="text-[10px] font-sans font-bold uppercase tracking-[0.24em] text-[#E02424]">
                      Manufacturing
                    </span>
                    <span className="text-xs font-sans font-bold text-neutral-400 tabular-nums">
                      {String(index + 1).padStart(2, '0')}
                    </span>
                  </div>
                  <p className="text-sm sm:text-base leading-relaxed text-neutral-700 font-sans font-light">
                    {item}
                  </p>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="py-16 md:py-24 bg-[#EAEAEA] border-y border-gray-200">
        <div className="max-w-7xl mx-auto px-6 md:px-12 grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-16">
          <div className="bg-white border border-neutral-200 p-8 sm:p-10 space-y-6">
            <h2 className="text-xl md:text-2xl font-sans font-bold uppercase tracking-[0.2em] text-gray-950">
              Specifications
            </h2>
            <div className="divide-y divide-neutral-200">
              {Object.entries(product.specifications).map(([label, value]) => (
                <div key={label} className="grid grid-cols-1 sm:grid-cols-[160px_1fr] gap-2 py-4">
                  <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#E02424]">
                    {label.replace(/([A-Z])/g, ' $1')}
                  </span>
                  <span className="text-sm leading-relaxed text-neutral-700 font-light">
                    {value}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-[#101010] text-white p-8 sm:p-10 space-y-6">
            <h2 className="text-xl md:text-2xl font-sans font-bold uppercase tracking-[0.2em] text-white">
              Features
            </h2>
            <ul className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {product.features.map((feature) => (
                <li key={feature} className="flex items-start gap-3 border-t border-white/10 pt-4">
                  <span className="mt-1 h-1.5 w-1.5 shrink-0 bg-[#E02424]" />
                  <span className="text-sm leading-relaxed text-neutral-300 font-light">
                    {feature}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <section className="w-full bg-white select-none border-b border-gray-100">
        <h2 className="sr-only">Product Gallery</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-0">
          {productImages.map((image, index) => (
            <div key={`${image}-${index}`} className="relative h-[340px] sm:h-[420px] overflow-hidden">
              <Image
                src={image}
                alt={`${product.name} gallery ${index + 1}`}
                fill
                sizes="(max-width: 768px) 100vw, 33vw"
                className="object-cover"
              />
              <div className="absolute inset-0 bg-black/5" />
            </div>
          ))}
        </div>
      </section>

      <section className="py-16 md:py-24 bg-white">
        <div className="max-w-7xl mx-auto px-6 md:px-12 space-y-10">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-end">
            <div className="lg:col-span-5 space-y-3">
              <span className="block text-xs sm:text-sm font-sans font-bold text-[#E02424] uppercase tracking-[0.3em]">
                Related Products
              </span>
              <h2 className="text-3xl sm:text-4xl md:text-5xl font-sans font-bold text-neutral-900 tracking-tight uppercase leading-snug">
                Explore More
              </h2>
            </div>
            <p className="lg:col-span-7 text-gray-700 text-sm sm:text-base leading-relaxed font-sans font-light max-w-3xl lg:ml-auto">
              Representative portfolio items across CWS production categories, shown as manufacturing capabilities rather than retail SKUs.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 md:gap-6">
            {relatedProducts.map((relatedProduct) => (
              <Link
                key={relatedProduct.slug}
                href={`/products/${relatedProduct.slug}`}
                className="group bg-[#F9F9F9] border border-neutral-100 transition-colors hover:border-[#E02424]/30 hover:bg-white"
              >
                <div className="relative h-64 overflow-hidden bg-neutral-200">
                  <Image
                    src={relatedProduct.images[0] ?? relatedProduct.image}
                    alt={relatedProduct.name}
                    fill
                    sizes="(max-width: 768px) 100vw, 33vw"
                    className="object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                </div>
                <article className="p-6 space-y-4">
                  <span className="block text-[10px] font-sans font-bold uppercase tracking-[0.24em] text-[#E02424]">
                    {relatedProduct.category}
                  </span>
                  <h3 className="text-base font-sans font-bold uppercase tracking-[0.12em] text-neutral-950 leading-snug">
                    {relatedProduct.name}
                  </h3>
                </article>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="py-16 md:py-24 bg-[#101010] text-white">
        <div className="max-w-7xl mx-auto px-6 md:px-12 grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
          <div className="lg:col-span-8 space-y-4">
            <span className="block text-xs sm:text-sm font-sans font-bold text-[#E02424] uppercase tracking-[0.3em]">
              Contact CTA
            </span>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-sans font-bold uppercase tracking-tight leading-snug">
              Discuss a {product.category} Program
            </h2>
            <p className="text-sm sm:text-base leading-relaxed text-neutral-300 font-light max-w-3xl">
              Share target product type, expected volume, sampling needs and delivery market. The CWS team can support development, costing, production follow-up and export coordination.
            </p>
          </div>
          <div className="lg:col-span-4 lg:text-right">
            <Link
              href="/#contracting"
              className="inline-flex h-12 w-full sm:w-auto items-center justify-center gap-2 bg-[#E02424] px-7 text-xs font-bold uppercase tracking-[0.2em] text-white transition-colors hover:bg-white hover:text-neutral-950"
            >
              Contact Us
              <Mail className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>
      <ProductFooter />
    </main>
  );
}
