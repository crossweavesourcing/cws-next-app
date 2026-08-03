import { notFound, redirect, permanentRedirect } from 'next/navigation';
import { SeoService } from '@/auth/services/seo.service';

interface Props {
  params: Promise<{
    catchAll: string[];
  }>;
}

export default async function CatchAllPage({ params }: Props) {
  const { catchAll } = await params;
  
  const path = '/' + catchAll.join('/');
  
  const service = new SeoService();
  const redirectDoc = await service.getActiveRedirectBySource(path);
  
  if (redirectDoc) {
    if (redirectDoc.statusCode === 301 || redirectDoc.statusCode === 308) {
      permanentRedirect(redirectDoc.destination);
    } else {
      redirect(redirectDoc.destination);
    }
  }
  
  notFound();
}
