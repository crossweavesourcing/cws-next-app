import React from 'react';
import type { Metadata } from 'next';
import "./globals.css";

import { GoogleTagManager } from '@next/third-parties/google';

import { SeoService } from '@/auth/services/seo.service';
import { getEnv } from '@/auth/config/env';
import { constructMetadata } from '@/lib/seo/metadata';

export async function generateMetadata(): Promise<Metadata> {
  const seoService = new SeoService();
  const globalSettings = await seoService.getGlobalSettings().catch(() => null);

  return constructMetadata(globalSettings);
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const env = getEnv();
  const siteEnv = env.NEXT_PUBLIC_SITE_ENV ?? process.env.VERCEL_ENV ?? 'development';
  const analyticsEnabled = siteEnv === 'production' && Boolean(env.NEXT_PUBLIC_GTM_ID);
  return (
    <html lang="en" className="dark scroll-smooth tko-page  tko-page-light" data-scroll-behavior="smooth">
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              window.dataLayer = window.dataLayer || [];
              function gtag(){dataLayer.push(arguments);}
              gtag('consent', 'default', {
                'analytics_storage': 'denied',
                'ad_storage': 'denied',
                'ad_user_data': 'denied',
                'ad_personalization': 'denied'
              });
            `,
          }}
        />
      </head>
      <body className="antialiased">
        {children}
        {analyticsEnabled && env.NEXT_PUBLIC_GTM_ID && <GoogleTagManager gtmId={env.NEXT_PUBLIC_GTM_ID} />}
      </body>
    </html>
  );
}
