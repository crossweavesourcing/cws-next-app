import type { Metadata } from 'next';
import Image from 'next/image';
import ProductFooter from '@/components/ProductFooter';
import ProductsPortfolio from '@/components/ProductsPortfolio';
import { getCachedProducts, getCachedCategories } from '@/lib/data/cache';
import { SectionService } from '@/auth/services/section.service';

export const revalidate = 3600; // ISR baseline revalidation: 1 hour

export const metadata: Metadata = {
  title: 'Products | Cross Weave Sourcing',
  description: 'Explore the Cross Weave Sourcing manufacturing portfolio across knit, woven, sweater, bag, wallet and hat categories.',
};

export default async function ProductsPage() {
  const products = await getCachedProducts();
  const categories = await getCachedCategories();
  const sections = await new SectionService().getPublicSections();
  const heroSection = sections.find((section) => section.sectionId === 'products-hero');
  const portfolioSection = sections.find((section) => section.sectionId === 'products-portfolio');
  const heroCopy = (key: string, fallback: string) => typeof heroSection?.content?.[key] === 'string' ? heroSection.content[key] as string : fallback;
  const heroMedia = heroSection?.media?.background;
  const serializedPortfolioSection = portfolioSection ? {
    paused: portfolioSection.paused,
    content: portfolioSection.content ? { ...portfolioSection.content } : undefined,
  } : undefined;

  const serializedProducts = products.map(p => ({
    ...p,
    _id: p._id.toString(),
    categoryId: p.categoryId ? p.categoryId.toString() : null,
    createdAt: p.createdAt.toISOString(),
    updatedAt: p.updatedAt.toISOString(),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  })) as any[];

  const serializedCategories = categories.map(cat => ({
    ...cat,
    _id: cat._id.toString(),
    createdAt: cat.createdAt.toISOString(),
    updatedAt: cat.updatedAt.toISOString(),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  })) as any[];

  return (
    <main className="product-site-shell bg-white text-[#1E1E1E] min-h-screen font-sans antialiased selection:bg-[#E02424]/10 selection:text-[#E02424]">
      {/* <ProductHeader /> */}

      {!heroSection?.paused && <section className="relative h-[420px] sm:h-[520px] bg-[#070707] overflow-hidden flex items-end">
        <div className="absolute inset-0">
          {heroMedia?.kind === 'video' ? <video src={heroMedia.url} autoPlay loop muted playsInline className="h-full w-full object-cover opacity-55" /> : <Image
            src={heroMedia?.url || "/assets/images/service_knit_woven_sweater_production.jpg"}
            alt="Apparel manufacturing portfolio"
            fill
            priority
            sizes="100vw"
            className="object-cover opacity-55"
          />}
          <div className="absolute inset-0 bg-black/35" />
        </div>
        <div className="relative z-10 w-full max-w-7xl mx-auto px-6 md:px-12 pb-14 sm:pb-16">
          <div className="max-w-3xl space-y-5">
            <span className="block text-xs sm:text-sm font-sans font-bold text-[#E02424] uppercase tracking-[0.35em]">
              {heroCopy('eyebrow', 'Product Portfolio')}
            </span>
            <h1 className="text-4xl sm:text-5xl md:text-7xl font-sans font-black text-white uppercase tracking-tight leading-none">
              {heroCopy('heading', 'Manufacturing Capability')}
            </h1>
            <p className="text-sm sm:text-base leading-relaxed text-neutral-200 font-light max-w-2xl">
              {heroCopy('body', 'Explore representative knit, woven, sweater and accessory programs supported by development, sampling, private-label production, quality control and export coordination.')}
            </p>
          </div>
        </div>
      </section>}

      <ProductsPortfolio products={serializedProducts} categories={serializedCategories} section={serializedPortfolioSection} />
      <ProductFooter />
    </main>
  );
}
