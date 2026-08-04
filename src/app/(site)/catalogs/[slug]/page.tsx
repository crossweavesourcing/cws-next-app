import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { CatalogDocumentService } from '@/auth/services/catalog-document.service';
import { SeoService } from '@/auth/services/seo.service';
import { constructMetadata } from '@/lib/seo/metadata';
import { getEnv } from '@/auth/config/env';
import { buildBreadcrumbSchema, serializeJsonLd } from '@/lib/seo/schema-builders';
import { CatalogWebView } from '@/components/catalog/CatalogWebView';
import { ViewTracker } from '@/components/analytics/ViewTracker';
import { CatalogEngagementActions } from '@/components/catalog/CatalogEngagementActions';

export const revalidate = 3600; // ISR baseline revalidation: 1 hour

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const catalog = await new CatalogDocumentService().getPublicBySlug((await params).slug);
  const seoService = new SeoService();
  const globalSettings = await seoService.getGlobalSettings().catch(() => null);

  if (!catalog) {
    return constructMetadata(globalSettings, {
      title: 'Catalog Not Found',
      noindex: true,
    });
  }

  return constructMetadata(globalSettings, {
    title: catalog.seoOverrides?.title || catalog.title,
    description: catalog.seoOverrides?.description || catalog.description || `Catalog: ${catalog.title}`,
    canonicalUrl: catalog.seoOverrides?.canonicalUrl || `/catalogs/${catalog.slug}`,
    noindex: catalog.seoOverrides?.noindex,
    nofollow: catalog.seoOverrides?.nofollow,
    socialTitle: catalog.seoOverrides?.socialTitle,
    socialDescription: catalog.seoOverrides?.socialDescription,
    socialImage: catalog.seoOverrides?.socialImage,
  });
}
export default async function CatalogPage({ params }: { params: Promise<{ slug: string }> }) {
  const catalog = await new CatalogDocumentService().getPublicBySlug((await params).slug); if (!catalog) notFound();

  const env = getEnv();
  const breadcrumbItems = [
    { name: 'Home', url: `${env.APP_URL}` },
    { name: 'Catalogs', url: `${env.APP_URL}/catalogs` }, // Assuming this exists or acts as a logical parent
    { name: catalog.title, url: `${env.APP_URL}/catalogs/${catalog.slug}` },
  ];
  const breadcrumbSchema = buildBreadcrumbSchema(breadcrumbItems);

  return (
    <main className="min-h-screen bg-neutral-200 pt-6 sm:pt-10">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd(breadcrumbSchema) }} />
      <ViewTracker
        eventName="catalog_view"
        params={{
          event_id: `catalog-view-${catalog.slug}`,
          catalog_slug: catalog.slug,
          catalog_title: catalog.title,
          page_count: catalog.pages.length,
          page_path: `/catalogs/${catalog.slug}`,
        }}
      />
      <div className="mx-auto max-w-6xl px-4 pb-6 sm:px-6">
        <p className="text-xs font-bold uppercase text-[#E02424]">PDF Catalog</p>
        <h1 className="mt-2 text-2xl font-black uppercase text-neutral-950 sm:text-4xl">{catalog.title}</h1>
        {catalog.description && <p className="mt-3 max-w-3xl text-sm text-neutral-600">{catalog.description}</p>}
      </div>
      <CatalogEngagementActions sourceUrl={`/catalogs/${catalog.slug}/source/`} catalogSlug={catalog.slug} catalogTitle={catalog.title} />
      <CatalogWebView catalog={catalog} sourceUrl={`/catalogs/${catalog.slug}/source/`} />
    </main>
  );
}
