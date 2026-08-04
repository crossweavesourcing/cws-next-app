import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowUpRight } from 'lucide-react';
import ProductFooter from '@/components/ProductFooter';
import { CategoryRepository } from '@/auth/repositories/category.repository';
import { ProductRepository } from '@/auth/repositories/product.repository';
import { SeoService } from '@/auth/services/seo.service';
import { getEnv } from '@/auth/config/env';
import { constructMetadata } from '@/lib/seo/metadata';
import { buildBreadcrumbSchema, buildCategoryCollectionSchema, serializeJsonLd } from '@/lib/seo/schema-builders';

export const revalidate = 3600;

type CategoryPageProps = { params: Promise<{ slug: string }> };

async function getPublicCategory(slug: string) {
  const category = await new CategoryRepository().findBySlug(slug);
  if (!category || !category.visible) return null;
  return category;
}

export async function generateMetadata({ params }: CategoryPageProps): Promise<Metadata> {
  const category = await getPublicCategory((await params).slug);
  const globalSettings = await new SeoService().getGlobalSettings().catch(() => null);

  if (!category) {
    return constructMetadata(globalSettings, { title: 'Category Not Found', noindex: true });
  }

  return constructMetadata(globalSettings, {
    title: category.seoOverrides?.title || category.name,
    description: category.seoOverrides?.description || category.description,
    canonicalUrl: category.seoOverrides?.canonicalUrl || `/categories/${category.slug}`,
    noindex: category.seoOverrides?.noindex,
    nofollow: category.seoOverrides?.nofollow,
    image: category.image,
    socialTitle: category.seoOverrides?.socialTitle,
    socialDescription: category.seoOverrides?.socialDescription,
    socialImage: category.seoOverrides?.socialImage,
  });
}

export default async function CategoryPage({ params }: CategoryPageProps) {
  const category = await getPublicCategory((await params).slug);
  if (!category) notFound();

  const products = (await new ProductRepository().findByCategoryId(category._id)).filter((product) => product.visible);
  const env = getEnv();
  const categoryUrl = `${env.APP_URL}/categories/${category.slug}`;
  const breadcrumbItems = [
    { name: 'Home', url: env.APP_URL },
    { name: 'Products', url: `${env.APP_URL}/products` },
    { name: category.seoOverrides?.breadcrumbLabel || category.name, url: categoryUrl },
  ];
  const schemas = [
    buildBreadcrumbSchema(breadcrumbItems),
    buildCategoryCollectionSchema(category, products, env.APP_URL),
  ];

  return (
    <main className="product-site-shell min-h-screen bg-white text-[#1E1E1E] font-sans antialiased selection:bg-[#E02424]/10 selection:text-[#E02424]">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd(schemas) }} />
      <section className="relative flex min-h-[440px] items-end overflow-hidden bg-[#070707]">
        <Image
          src={category.image}
          alt={`${category.name} category`}
          fill
          priority
          sizes="100vw"
          className="object-cover opacity-55"
        />
        <div className="absolute inset-0 bg-black/40" />
        <div className="relative z-10 mx-auto w-full max-w-7xl px-6 pb-14 md:px-12">
          <nav aria-label="Breadcrumb" className="mb-6 text-xs font-bold uppercase tracking-[0.2em] text-neutral-300">
            <Link href="/" className="hover:text-white">Home</Link>
            <span className="mx-2">/</span>
            <Link href="/products" className="hover:text-white">Products</Link>
            <span className="mx-2">/</span>
            <span className="text-white">{category.seoOverrides?.breadcrumbLabel || category.name}</span>
          </nav>
          <div className="max-w-3xl space-y-5">
            <span className="block text-xs font-bold uppercase tracking-[0.35em] text-[#E02424]">Category</span>
            <h1 className="text-4xl font-black uppercase leading-none tracking-tight text-white sm:text-5xl md:text-7xl">
              {category.name}
            </h1>
            <p className="max-w-2xl text-sm font-light leading-relaxed text-neutral-200 sm:text-base">
              {category.description}
            </p>
          </div>
        </div>
      </section>

      <section className="border-t border-gray-100 bg-white py-16 md:py-24">
        <div className="mx-auto max-w-7xl space-y-10 px-6 md:px-12">
          <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div>
              <span className="block text-xs font-bold uppercase tracking-[0.3em] text-[#E02424]">Manufacturing Portfolio</span>
              <h2 className="mt-3 text-3xl font-bold uppercase tracking-tight text-neutral-900 sm:text-4xl">Products in {category.name}</h2>
            </div>
            <Link href="/products" className="inline-flex h-11 items-center gap-2 border border-neutral-200 px-4 text-[11px] font-bold uppercase tracking-[0.18em] text-neutral-700 hover:border-[#E02424]/50 hover:text-[#E02424]">
              All Products <ArrowUpRight className="h-4 w-4" />
            </Link>
          </div>

          {products.length > 0 ? (
            <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
              {products.map((product) => {
                const image = product.images?.[0] || product.image;
                const alt = product.imagesAltText?.[0] || product.imageAltText || product.name;
                return (
                  <Link key={product.slug} href={`/products/${product.slug}`} className="group border border-neutral-100 bg-[#F9F9F9] transition-colors hover:border-[#E02424]/30 hover:bg-white">
                    <div className="relative h-72 overflow-hidden bg-neutral-200">
                      {image && <Image src={image} alt={alt} fill sizes="(max-width: 768px) 100vw, (max-width: 1280px) 50vw, 33vw" className="object-cover transition-transform duration-500 group-hover:scale-105" />}
                    </div>
                    <article className="space-y-4 p-6">
                      <h3 className="text-base font-bold uppercase tracking-[0.12em] text-neutral-950">{product.name}</h3>
                      <p className="text-sm font-light leading-relaxed text-neutral-600">{product.shortDescription}</p>
                    </article>
                  </Link>
                );
              })}
            </div>
          ) : (
            <div className="border border-neutral-200 bg-[#F9F9F9] p-8 text-center">
              <p className="text-sm font-light text-neutral-600">No published products are currently assigned to this category.</p>
            </div>
          )}
        </div>
      </section>
      <ProductFooter />
    </main>
  );
}
