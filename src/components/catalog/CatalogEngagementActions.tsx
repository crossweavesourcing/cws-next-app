'use client';

import { Download, ExternalLink } from 'lucide-react';
import { trackEvent } from '@/lib/analytics';

type CatalogEngagementActionsProps = {
  sourceUrl: string;
  catalogSlug: string;
  catalogTitle: string;
};

export function CatalogEngagementActions({ sourceUrl, catalogSlug, catalogTitle }: CatalogEngagementActionsProps) {
  const payload = {
    catalog_slug: catalogSlug,
    catalog_title: catalogTitle,
    page_path: typeof window !== 'undefined' ? window.location.pathname : undefined,
  };

  return (
    <div className="mx-auto flex max-w-6xl flex-wrap gap-3 px-4 pb-6 sm:px-6">
      <a
        href={sourceUrl}
        download
        onClick={() => trackEvent('catalog_download', { ...payload, event_id: `catalog-download-${catalogSlug}` })}
        className="inline-flex h-11 items-center gap-2 bg-[#E02424] px-4 text-xs font-bold uppercase tracking-[0.16em] text-white"
      >
        <Download className="h-4 w-4" /> Download
      </a>
      <a
        href={sourceUrl}
        target="_blank"
        rel="noopener noreferrer"
        onClick={() => trackEvent('catalog_external_open', { ...payload, event_id: `catalog-open-${catalogSlug}` })}
        className="inline-flex h-11 items-center gap-2 border border-neutral-300 px-4 text-xs font-bold uppercase tracking-[0.16em] text-neutral-700"
      >
        <ExternalLink className="h-4 w-4" /> Open PDF
      </a>
    </div>
  );
}
