import type { Metadata } from 'next';
import type { GlobalSettingsDocument } from '@/types/seo';
import { getEnv } from '@/auth/config/env';

type MetadataOverrides = Omit<Metadata, 'title' | 'description'> & {
  title?: string;
  description?: string;
  image?: string;
  canonicalUrl?: string;
  noindex?: boolean;
  nofollow?: boolean;
  socialTitle?: string;
  socialDescription?: string;
  socialImage?: string;
};

export function constructMetadata(
  globalSettings: GlobalSettingsDocument | null,
  overrides: MetadataOverrides = {}
): Metadata {
  const env = getEnv();
  const metadataBase = new URL(env.APP_URL);
  
  const siteName = globalSettings?.siteName || globalSettings?.brandName || 'Cross Weave Sourcing';
  const defaultTitle = globalSettings?.defaultSeoTitle || `${siteName} | Export-Oriented Garments Manufacturer`;
  const defaultDescription = globalSettings?.defaultSeoDescription || 'Cross Weave Sourcing (CWS) is an export-oriented garments manufacturer and global sourcing partner for knit, woven and sweater products.';
  const defaultImage = globalSettings?.defaultSocialImage || '/og-image.jpg';

  const title = overrides.title || defaultTitle;
  const description = overrides.description || defaultDescription;
  const image = overrides.image || defaultImage;
  const socialTitle = overrides.socialTitle || title;
  const socialDescription = overrides.socialDescription || description;
  const socialImage = overrides.socialImage || image;

  const robots = overrides.noindex
    ? { index: false, follow: false }
    : overrides.nofollow
      ? { index: true, follow: false }
      : overrides.robots || { index: true, follow: true };

  const alternates = overrides.canonicalUrl
    ? { canonical: overrides.canonicalUrl }
    : overrides.alternates;

  let verification: Metadata['verification'] = undefined;
  if (globalSettings?.googleSiteVerification || globalSettings?.bingSiteVerification) {
    verification = {};
    if (globalSettings?.googleSiteVerification) {
      verification.google = globalSettings.googleSiteVerification;
    }
    if (globalSettings?.bingSiteVerification) {
      verification.other = {
        'msvalidate.01': [globalSettings.bingSiteVerification],
      };
    }
  }

  return {
    metadataBase,
    title: overrides.title ? title : {
      default: title,
      template: `%s | ${siteName}`,
    },
    description,
    applicationName: siteName,
    robots,
    alternates,
    openGraph: {
      title: socialTitle,
      description: socialDescription,
      siteName,
      images: [{ url: socialImage }],
      type: 'website',
      ...overrides.openGraph,
    },
    twitter: {
      card: 'summary_large_image',
      title: socialTitle,
      description: socialDescription,
      images: [socialImage],
      ...overrides.twitter,
    },
    verification,
    ...overrides,
  };
}
