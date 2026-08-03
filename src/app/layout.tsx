import React from 'react';
import type { Metadata } from 'next';
import "./globals.css";

import { GoogleTagManager } from '@next/third-parties/google';

export const metadata: Metadata = {
  title: 'Cross Weave Sourcing | Export-Oriented Garments Manufacturer & Buyer Agent',
  description: 'Cross Weave Sourcing (CWS) is an export-oriented garments manufacturer and global sourcing partner for knit, woven and sweater products, supporting brands with development, sampling, bulk production and shipment.',
  verification: {
    google: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION,
    other: {
      'msvalidate.01': process.env.NEXT_PUBLIC_BING_SITE_VERIFICATION ? [process.env.NEXT_PUBLIC_BING_SITE_VERIFICATION] : [],
    },
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const gtmId = process.env.NEXT_PUBLIC_GTM_ID;
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
        {gtmId && <GoogleTagManager gtmId={gtmId} />}
      </body>
    </html>
  );
}
