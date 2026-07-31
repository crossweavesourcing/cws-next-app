import { notFound } from 'next/navigation';
import { CatalogDocumentService } from '@/auth/services/catalog-document.service';
import { CatalogWebView } from '@/components/catalog/CatalogWebView';
import { CatalogModal } from '@/components/catalog/CatalogModal';

export default async function CatalogModalPage({ params }: { params: Promise<{ slug: string }> }) {
  const catalog = await new CatalogDocumentService().getPublicBySlug((await params).slug); if (!catalog) notFound();
  return <CatalogModal title={catalog.title}><CatalogWebView catalog={catalog} /></CatalogModal>;
}
