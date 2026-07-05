import React from 'react';
import type { Metadata } from 'next';
import "./globals.css";
import Header from '@/components/Header';

export const metadata: Metadata = {
  title: 'Cross Weave Sourcing | Export-Oriented Garments Manufacturer & Buyer Agent',
  description: 'Cross Weave Sourcing (CWS) is an export-oriented garments manufacturer and global sourcing partner for knit, woven and sweater products, supporting brands with development, sampling, bulk production and shipment.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark scroll-smooth tko-page  tko-page-light" data-scroll-behavior="smooth">
      <body className="antialiased">
        <Header/>
        {children}
      </body>
    </html>
  );
}
