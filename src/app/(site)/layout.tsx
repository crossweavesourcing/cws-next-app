import type { ReactNode } from 'react';
import Header from '@/components/Header';
import { SectionService } from '@/auth/services/section.service';
import { getEnv } from '@/auth/config/env';
import { SeoService } from '@/auth/services/seo.service';
import { buildOrganizationSchema, buildWebSiteSchema, serializeJsonLd } from '@/lib/seo/schema-builders';

export default async function SiteLayout({
  children,
  modal,
}: {
  children: ReactNode;
  modal: ReactNode;
}) {
  const env = getEnv();
  const seoService = new SeoService();
  const globalSettings = await seoService.getGlobalSettings().catch(() => null);

  const orgSchema = buildOrganizationSchema(env.APP_URL, globalSettings);
  const siteSchema = buildWebSiteSchema(env.APP_URL, globalSettings);

  return (
    <>
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:z-[100] focus:top-4 focus:left-4 focus:bg-[#E02424] focus:text-white focus:px-4 focus:py-2 focus:rounded focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#E02424]"
      >
        Skip to main content
      </a>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeJsonLd([orgSchema, siteSchema]) }}
      />
      <Header />
      {children}
      {modal}
    </>
  );
}
