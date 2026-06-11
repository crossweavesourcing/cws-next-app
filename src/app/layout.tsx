import React from 'react';
import type { Metadata } from 'next';
import "./globals.css";

export const metadata: Metadata = {
  title: 'CWS International | Global Apparel Sourcing & Supply Chain Portal',
  description: 'A high-fidelity sustainable global apparel sourcing and supply chain portal, powered by the CWS brand and advanced fabric engineering catalog.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark scroll-smooth">
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
