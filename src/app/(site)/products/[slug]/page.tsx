import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, BookOpen, Mail } from 'lucide-react';
import ProductFooter from '@/components/ProductFooter';
import ProductImageGallery from '@/components/ProductImageGallery';
import { getCachedProductBySlug, getCachedProducts, getCachedCategories, getCachedProductsByCategoryId, getCachedCategoryById } from '@/lib/data/cache';
import { SectionService } from '@/auth/services/section.service';
import { CatalogDocumentService } from '@/auth/services/catalog-document.service';
import { getEnv } from '@/auth/config/env';
import { buildProductSchema, buildBreadcrumbSchema, serializeJsonLd } from '@/lib/seo/schema-builders';
import { MissingContentPlaceholder } from '@/components/MissingContentPlaceholder';
import { FAQAccordion } from '@/components/FAQAccordion';
import { RelatedProducts } from '@/components/RelatedProducts';
import { ViewTracker } from '@/components/analytics/ViewTracker';

export const revalidate = 3600; // ISR baseline revalidation: 1 hour

type ProductDetailsPageProps = {
  params: Promise<{
    slug: string;
  }>;
};

export async function generateStaticParams() {
  const products = await getCachedProducts();
  return products.map((product) => ({
    slug: product.slug,
  }));
}

export async function generateMetadata({ params }: ProductDetailsPageProps): Promise<Metadata> {
  const { slug } = await params;
  const product = await getCachedProductBySlug(slug);

  if (!product) {
    return {
      title: 'Product Not Found | Cross Weave Sourcing',
    };
  }

  return {
    title: product.seoOverrides?.title || `${product.name} | Cross Weave Sourcing`,
    description: product.seoOverrides?.description || product.shortDescription,
    ...(product.seoOverrides?.noindex ? { robots: { index: false, follow: false } } : {}),
    ...(product.seoOverrides?.canonicalUrl ? { alternates: { canonical: product.seoOverrides.canonicalUrl } } : {})
  };
}

export default async function ProductDetailsPage({ params }: ProductDetailsPageProps) {
  const { slug } = await params;
  const product = await getCachedProductBySlug(slug);

  if (!product) {
    notFound();
  }

  const category = product.categoryId ? await getCachedCategoryById(product.categoryId.toString()) : null;
  const categoryName = category?.name || 'Unknown Category';

  const allCategories = await getCachedCategories();
  const categoryMap = new Map(allCategories.map(c => [c._id.toString(), c]));

  let relatedProducts = [];
  if (product.relatedProducts && product.relatedProducts.length > 0) {
    const allProducts = await getCachedProducts();
    const relatedIds = product.relatedProducts.map(id => id.toString());
    relatedProducts = allProducts.filter(p => relatedIds.includes(p._id.toString()));
  } else if (product.categoryId) {
    relatedProducts = (await getCachedProductsByCategoryId(product.categoryId.toString()))
      .filter((p) => p._id.toString() !== product._id.toString())
      .slice(0, 3);
  } else {
    relatedProducts = (await getCachedProducts())
      .filter((p) => p._id.toString() !== product._id.toString())
      .slice(0, 3);
  }

  const env = getEnv();
  const breadcrumbItems = [
    { name: 'Home', url: `${env.APP_URL}` },
    { name: 'Products', url: `${env.APP_URL}/products` },
    { name: product.name, url: `${env.APP_URL}/products/${product.slug}` },
  ];
  const productSchema = buildProductSchema(product, categoryName, env.APP_URL);
  const breadcrumbSchema = buildBreadcrumbSchema(breadcrumbItems);
  const schemaJson = serializeJsonLd([productSchema, breadcrumbSchema]);

  const productImages = product.images.length > 0 ? product.images : [product.image];
  const productAltTexts = product.images.length > 0 ? (product.imagesAltText || []) : [product.imageAltText || product.name];
  const sections = await new SectionService().getPublicSections();
  const catalogs = await new CatalogDocumentService().listPublicByProduct(product._id.toString());
  const section = (id: string) => sections.find((item) => item.sectionId === id);
  const copy = (id: string, key: string, fallback: string) => {
    const value = section(id)?.content?.[key];
    return typeof value === 'string' ? value : fallback;
  };

  return (
    <main className="product-site-shell bg-white text-[#1E1E1E] min-h-screen font-sans antialiased selection:bg-[#E02424]/10 selection:text-[#E02424]">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: schemaJson }} />
      <ViewTracker
        eventName="view_item"
        params={{
          item_name: product.name,
          item_category: categoryName
        }}
      />

      {/* <ProductHeader /> */}

      {!section('detail-hero')?.paused && <section className="bg-[#101010] text-white">
        <div className="grid grid-cols-1 lg:grid-cols-2 min-h-[560px]">
          <div className="overflow-hidden">
            <ProductImageGallery images={productImages} imageAltTexts={productAltTexts} productName={product.name} />
          </div>
          <div className="p-8 sm:p-12 lg:p-16 flex flex-col justify-center">
            <div className="max-w-xl space-y-7">
              <nav aria-label="Breadcrumb" className="flex items-center space-x-2 text-[11px] font-bold uppercase tracking-[0.22em] text-neutral-400">
                <Link href="/" className="hover:text-white transition-colors">Home</Link>
                <span className="text-neutral-600">/</span>
                <Link href="/products" className="hover:text-white transition-colors">Products</Link>
                <span className="text-neutral-600">/</span>
                <span className="text-[#E02424]">{product.name}</span>
              </nav>

              <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
                <Link
                  href="/products"
                  className="inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.22em] text-neutral-400 transition-colors hover:text-[#E02424]"
                >
                  <ArrowLeft className="h-3.5 w-3.5" />
                  {copy('detail-hero', 'backLabel', 'Back to Portfolio')}
                </Link>
                <span className="hidden sm:inline-block text-neutral-700">|</span>
                <Link
                  href={`/?subject=${encodeURIComponent(`Inquiry about ${product.name}`)}#contracting`}
                  className="inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.22em] text-[#E02424] transition-colors hover:text-white"
                >
                  <Mail className="h-3.5 w-3.5" />
                  Request a Quote
                </Link>
              </div>
              <div className="space-y-4">
                <span className="block text-xs sm:text-sm font-sans font-bold text-[#E02424] uppercase tracking-[0.35em]">
                  {categoryName}
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
      </section>}

      {!section('detail-overview')?.paused && <section id="overview" className="py-16 md:py-24 bg-white">
        <div className="max-w-7xl mx-auto px-6 md:px-12 grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-16">
          <div className="lg:col-span-5 space-y-6">
            <span className="block text-xs sm:text-sm font-sans font-bold text-[#E02424] uppercase tracking-[0.3em]">
              {copy('detail-overview', 'eyebrow', 'Product Overview')}
            </span>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-sans font-bold text-neutral-900 tracking-tight uppercase leading-snug">
              {copy('detail-overview', 'heading', 'Built for Buyer Programs')}
            </h2>
            <div className="text-gray-700 text-sm sm:text-base leading-relaxed font-sans font-light space-y-4">
              <p>
                {product.shortDescription} {copy('detail-overview', 'supportingText', 'CWS positions this product as a manufacturing portfolio item, supported by sampling, commercial planning, quality checks and shipment coordination.')}
              </p>
              
              {product.longDescription ? (
                <div className="prose max-w-none text-gray-700 font-sans font-light" dangerouslySetInnerHTML={{ __html: product.longDescription }} />
              ) : (
                <MissingContentPlaceholder title="Long Description" description="A comprehensive description of the product." />
              )}
            </div>
          </div>

          <div className="lg:col-span-7 space-y-6">
            <h3 className="sr-only">Manufacturing Details</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 md:gap-6">
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

            {/* Extended Content Areas */}
            <div className="mt-8 space-y-8">
              {(product.materials || process.env.NODE_ENV !== 'production') && (
                <div>
                  <h3 className="text-xl font-bold uppercase tracking-wide text-neutral-900 mb-3">Materials</h3>
                  {product.materials ? <div className="prose max-w-none text-gray-700" dangerouslySetInnerHTML={{ __html: product.materials }} /> : <MissingContentPlaceholder title="Materials" />}
                </div>
              )}
              
              {(product.process || process.env.NODE_ENV !== 'production') && (
                <div>
                  <h3 className="text-xl font-bold uppercase tracking-wide text-neutral-900 mb-3">Process</h3>
                  {product.process ? <div className="prose max-w-none text-gray-700" dangerouslySetInnerHTML={{ __html: product.process }} /> : <MissingContentPlaceholder title="Process" />}
                </div>
              )}

              {(product.qualityControl || process.env.NODE_ENV !== 'production') && (
                <div>
                  <h3 className="text-xl font-bold uppercase tracking-wide text-neutral-900 mb-3">Quality Control</h3>
                  {product.qualityControl ? <div className="prose max-w-none text-gray-700" dangerouslySetInnerHTML={{ __html: product.qualityControl }} /> : <MissingContentPlaceholder title="Quality Control" />}
                </div>
              )}

              {(product.customization || process.env.NODE_ENV !== 'production') && (
                <div>
                  <h3 className="text-xl font-bold uppercase tracking-wide text-neutral-900 mb-3">Customization</h3>
                  {product.customization ? <div className="prose max-w-none text-gray-700" dangerouslySetInnerHTML={{ __html: product.customization }} /> : <MissingContentPlaceholder title="Customization" />}
                </div>
              )}

              {(product.applications || process.env.NODE_ENV !== 'production') && (
                <div>
                  <h3 className="text-xl font-bold uppercase tracking-wide text-neutral-900 mb-3">Applications</h3>
                  {product.applications ? <div className="prose max-w-none text-gray-700" dangerouslySetInnerHTML={{ __html: product.applications }} /> : <MissingContentPlaceholder title="Applications" />}
                </div>
              )}

              {(product.packaging || process.env.NODE_ENV !== 'production') && (
                <div>
                  <h3 className="text-xl font-bold uppercase tracking-wide text-neutral-900 mb-3">Packaging</h3>
                  {product.packaging ? <div className="prose max-w-none text-gray-700" dangerouslySetInnerHTML={{ __html: product.packaging }} /> : <MissingContentPlaceholder title="Packaging" />}
                </div>
              )}
            </div>

          </div>
        </div>
      </section>}

      {!section('detail-specs')?.paused && <section id="specifications" className="py-16 md:py-24 bg-[#EAEAEA] border-y border-gray-200">
        <div className="max-w-7xl mx-auto px-6 md:px-12 grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-16">
          <div className="bg-white border border-neutral-200 p-8 sm:p-10 space-y-6">
            <h2 className="text-xl md:text-2xl font-sans font-bold uppercase tracking-[0.2em] text-gray-950">
              {copy('detail-specs', 'specificationsHeading', 'Specifications')}
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
              {copy('detail-specs', 'featuresHeading', 'Features')}
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
      </section>}

      {!section('detail-gallery')?.paused && <section aria-labelledby="gallery-heading" className="w-full bg-white select-none border-b border-gray-100">
        <h2 id="gallery-heading" className="sr-only">{copy('detail-gallery', 'accessibleHeading', 'Product Gallery')}</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-0">
          {productImages.map((image, index) => (
            <div key={`${image}-${index}`} className="relative h-[340px] sm:h-[420px] overflow-hidden">
              <Image
                src={image}
                alt={productAltTexts[index] || `${product.name} gallery ${index + 1}`}
                fill
                sizes="(max-width: 768px) 100vw, 33vw"
                className="object-cover"
              />
              <div className="absolute inset-0 bg-black/5" />
            </div>
          ))}
        </div>
      </section>}

      {((product.faqs?.length ?? 0) > 0 || process.env.NODE_ENV !== 'production') && (
        <section className="py-16 md:py-24 bg-white border-b border-gray-200">
          <div className="max-w-4xl mx-auto px-6 md:px-12">
            <h2 className="text-3xl font-sans font-bold text-neutral-900 tracking-tight uppercase leading-snug mb-8 text-center">
              Frequently Asked Questions
            </h2>
            {product.faqs && product.faqs.length > 0 ? (
              <FAQAccordion faqs={product.faqs} />
            ) : (
              <MissingContentPlaceholder title="FAQs" description="Add frequently asked questions to help buyers." />
            )}
          </div>
        </section>
      )}

      {!section('detail-related')?.paused && <RelatedProducts products={relatedProducts} />}

      {catalogs.length > 0 && <section className="border-t border-neutral-200 bg-[#F7F7F7] py-12 sm:py-16"><div className="mx-auto max-w-7xl px-6 md:px-12"><span className="text-xs font-bold uppercase text-[#E02424]">Product documents</span><h2 className="mt-3 text-2xl font-black uppercase text-neutral-950 sm:text-3xl">Catalogs</h2><div className="mt-7 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{catalogs.map((catalog) => <Link key={catalog._id} href={`/catalogs/${catalog.slug}`} scroll={false} className="group flex items-center justify-between border border-neutral-200 bg-white p-5 transition-colors hover:border-[#E02424]"><div><h3 className="font-bold uppercase text-neutral-950">{catalog.title}</h3><p className="mt-1 text-xs text-neutral-500">{catalog.pages.length} pages · PDF catalog</p></div><BookOpen className="h-5 w-5 text-[#E02424]" /></Link>)}</div></div></section>}

      {!section('detail-cta')?.paused && <section id="contact" className="py-16 md:py-24 bg-[#101010] text-white">
        <div className="max-w-7xl mx-auto px-6 md:px-12 grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
          <div className="lg:col-span-8 space-y-4">
            <span className="block text-xs sm:text-sm font-sans font-bold text-[#E02424] uppercase tracking-[0.3em]">
              {copy('detail-cta', 'eyebrow', 'Contact CTA')}
            </span>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-sans font-bold uppercase tracking-tight leading-snug">
              {copy('detail-cta', 'headingTemplate', 'Discuss a {category} Program').replaceAll('{category}', categoryName)}
            </h2>
            <p className="text-sm sm:text-base leading-relaxed text-neutral-300 font-light max-w-3xl">
              {copy('detail-cta', 'body', 'Share target product type, expected volume, sampling needs and delivery market. The CWS team can support development, costing, production follow-up and export coordination.')}
            </p>
          </div>
          <div className="lg:col-span-4 lg:text-right">
            <Link
              href="/#contracting"
              className="inline-flex h-12 w-full sm:w-auto items-center justify-center gap-2 bg-[#E02424] px-7 text-xs font-bold uppercase tracking-[0.2em] text-white transition-colors hover:bg-white hover:text-neutral-950"
            >
              {copy('detail-cta', 'buttonLabel', 'Contact Us')}
              <Mail className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>}
      <ProductFooter />
    </main>
  );
}
