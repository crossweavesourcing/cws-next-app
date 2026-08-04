import { requireCmsPermission } from '@/auth/dal';
import { SeoService } from '@/auth/services/seo.service';
import { GlobalSettingsForm } from './_components/GlobalSettingsForm';
import { RedirectsManager } from './_components/RedirectsManager';
import { PageSeoManager } from './_components/PageSeoManager';
import { SeoHealthPanel } from './_components/SeoHealthPanel';
import { ProductRepository } from '@/auth/repositories/product.repository';
import { CategoryRepository } from '@/auth/repositories/category.repository';
import { CatalogDocumentRepository } from '@/auth/repositories/catalog-document.repository';
import { buildSeoHealthFindings, seoHealthScore } from '@/lib/seo/health';

export default async function SeoRoute() {
  await requireCmsPermission('seo');

  const service = new SeoService();
  const [settings, redirects, pageSeos, products, categories, catalogs] = await Promise.all([
    service.getGlobalSettings(),
    service.getAllRedirects(),
    service.getAllPageSeos(),
    new ProductRepository().findAll(),
    new CategoryRepository().findAll(),
    new CatalogDocumentRepository().findAll(),
  ]);
  const seoFindings = buildSeoHealthFindings({ settings, pageSeos, redirects, products, categories, catalogs });

  // Serialize ObjectId and Date fields for Client Components
  const serializedSettings = {
    ...settings,
    _id: settings._id.toString(),
    updatedAt: settings.updatedAt?.toISOString() ?? null,
    updatedBy: settings.updatedBy?.toString() ?? null,
  };

  const serializedRedirects = redirects.map((r) => ({
    ...r,
    _id: r._id.toString(),
    createdAt: r.createdAt.toISOString(),
    createdBy: r.createdBy?.toString() ?? null,
    updatedAt: r.updatedAt.toISOString(),
    updatedBy: r.updatedBy?.toString() ?? null,
    startsAt: r.startsAt?.toISOString() ?? null,
    endsAt: r.endsAt?.toISOString() ?? null,
  }));

  const serializedPageSeos = pageSeos.map((p) => ({
    ...p,
    _id: p._id.toString(),
    createdAt: p.createdAt.toISOString(),
    createdBy: p.createdBy?.toString() ?? null,
    updatedAt: p.updatedAt.toISOString(),
    updatedBy: p.updatedBy?.toString() ?? null,
  }));

  return (
    <div className="space-y-6">
      <SeoHealthPanel findings={seoFindings} score={seoHealthScore(seoFindings)} />
      <GlobalSettingsForm settings={serializedSettings} />
      <PageSeoManager pageSeos={serializedPageSeos} />
      <RedirectsManager redirects={serializedRedirects} />
    </div>
  );
}
