import { MetadataRoute } from 'next';
import { getEnv } from '@/auth/config/env';

export default function robots(): MetadataRoute.Robots {
  const env = getEnv();

  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: [
        '/dashboard/',          // Private admin dashboard
        '/api/',                // API routes
        '/catalogs/*/source',   // Source PDF endpoints
        '/*?*',                 // Exclude all URLs with query parameters (search/filters)
      ],
    },
    sitemap: `${env.APP_URL}/sitemap.xml`,
  };
}
