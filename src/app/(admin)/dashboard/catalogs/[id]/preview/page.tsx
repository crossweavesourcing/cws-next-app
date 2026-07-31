import { notFound } from 'next/navigation';
import { requireActiveSession, getEffectivePermissions } from '@/auth/dal';
import { CatalogDocumentService } from '@/auth/services/catalog-document.service';
import { CatalogWebView } from '@/components/catalog/CatalogWebView';

export default async function CatalogPreviewPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await requireActiveSession(); const effective = await getEffectivePermissions(session.userId);
  const catalog = await new CatalogDocumentService().getManaged({ userId: session.userId, sessionId: session._id, permissions: effective.permissions, source: 'web' }, (await params).id);
  if (!catalog) notFound();
  return <main className="min-h-screen bg-neutral-200 p-4 sm:p-8"><div className="mx-auto mb-5 max-w-5xl"><span className="text-[10px] font-bold uppercase text-[#E02424]">Dashboard preview · {catalog.status}</span><h1 className="mt-2 text-2xl font-black uppercase text-neutral-950">{catalog.title}</h1></div><CatalogWebView catalog={catalog} sourceUrl={`/dashboard/catalogs/${catalog._id}/preview/source/`} /></main>;
}
