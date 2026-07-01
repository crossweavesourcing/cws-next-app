import React from 'react';
import type { Metadata } from 'next';
import "./globals.css";

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
    <html lang="en" className="dark scroll-smooth" data-scroll-behavior="smooth">
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
