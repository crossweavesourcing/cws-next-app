import { requireCmsPermission } from '@/auth/dal';
import { SeoService } from '@/auth/services/seo.service';
import { GlobalSettingsForm } from './_components/GlobalSettingsForm';
import { RedirectsManager } from './_components/RedirectsManager';

export default async function SeoRoute() {
  await requireCmsPermission('seo');

  const service = new SeoService();
  const [settings, redirects] = await Promise.all([
    service.getGlobalSettings(),
    service.getAllRedirects(),
  ]);

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
  }));

  return (
    <div className="space-y-6">
      <GlobalSettingsForm settings={serializedSettings} />
      <RedirectsManager redirects={serializedRedirects} />
    </div>
  );
}
