import { Metadata } from 'next';

import { SeoService } from '@/auth/services/seo.service';
import { constructMetadata } from '@/lib/seo/metadata';

export async function generateMetadata(): Promise<Metadata> {
  const seoService = new SeoService();
  const globalSettings = await seoService.getGlobalSettings().catch(() => null);
  const pageSeo = await seoService.getPageSeoByPath('/legal/terms').catch(() => null);

  return constructMetadata(globalSettings, {
    title: pageSeo?.title || 'Terms of Service',
    description: pageSeo?.description,
    canonicalUrl: pageSeo?.canonicalUrl,
    noindex: pageSeo?.noindex ?? true,
  });
}

export default function TermsOfServicePage() {
  return (
    <main className="py-24 bg-white text-neutral-900 min-h-screen">
      <div className="max-w-3xl mx-auto px-6 md:px-12 space-y-8">
        <h1 className="text-4xl font-black uppercase tracking-tight">Terms of Service</h1>
        <div className="prose max-w-none text-neutral-700 space-y-6">
          <p className="font-bold text-[#E02424] uppercase tracking-widest text-xs">
            [PLACEHOLDER FOR LEGAL REVIEW]
          </p>
          <p>
            This is a placeholder for the Terms of Service. 
            Before publishing the site for production use, this page must be reviewed and 
            updated by qualified legal counsel.
          </p>
          <h2>Acceptance of Terms</h2>
          <p>[Legal content goes here]</p>
          
          <h2>Use of the Website</h2>
          <p>[Legal content goes here]</p>
        </div>
      </div>
    </main>
  );
}
