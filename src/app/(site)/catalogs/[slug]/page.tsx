import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { CatalogDocumentService } from '@/auth/services/catalog-document.service';
import { CatalogWebView } from '@/components/catalog/CatalogWebView';
import { ViewTracker } from '@/components/analytics/ViewTracker';

export const revalidate = 3600; // ISR baseline revalidation: 1 hour

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const catalog = await new CatalogDocumentService().getPublicBySlug((await params).slug);
  return catalog ? { title: `${catalog.title} | Cross Weave Sourcing`, description: catalog.description, alternates: { canonical: `/catalogs/${catalog.slug}` } } : { title: 'Catalog Not Found' };
}
export default async function CatalogPage({ params }: { params: Promise<{ slug: string }> }) {
  const catalog = await new CatalogDocumentService().getPublicBySlug((await params).slug); if (!catalog) notFound();
  return (
    <main className="min-h-screen bg-neutral-200 pt-6 sm:pt-10">
      <ViewTracker 
        eventName="view_catalog" 
        params={{ 
          catalog_title: catalog.title, 
          page_count: catalog.pages.length 
        }} 
      />
      <div className="mx-auto max-w-6xl px-4 pb-6 sm:px-6">
        <p className="text-xs font-bold uppercase text-[#E02424]">PDF Catalog</p>
        <h1 className="mt-2 text-2xl font-black uppercase text-neutral-950 sm:text-4xl">{catalog.title}</h1>
        {catalog.description && <p className="mt-3 max-w-3xl text-sm text-neutral-600">{catalog.description}</p>}
      </div>
      <CatalogWebView catalog={catalog} sourceUrl={`/catalogs/${catalog.slug}/source/`} />
    </main>
  );
}
