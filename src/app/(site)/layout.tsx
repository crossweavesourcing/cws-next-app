import type { ReactNode } from 'react';
import Header from '@/components/Header';

export default function SiteLayout({
  children,
  modal,
}: {
  children: ReactNode;
  modal: ReactNode;
}) {
  return (
    <>
      <Header />
      {children}
      {modal}
    </>
  );
}
