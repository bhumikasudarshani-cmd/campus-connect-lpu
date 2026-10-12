import { MetadataRoute } from 'next';
import { getBaseUrl } from '@/lib/seo';

export default function robots(): MetadataRoute.Robots {
  const baseUrl = getBaseUrl();

  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/admin',
          '/admin/',
          '/api/',
          '/dashboard',
          '/dashboard/',
          '/auth/',
          '/login',
          '/maintenance',
          '/preview-test',
        ],
      },
      {
        userAgent: 'Googlebot',
        allow: '/',
        disallow: [
          '/admin',
          '/admin/',
          '/api/',
          '/dashboard',
          '/dashboard/',
          '/auth/',
          '/login',
          '/maintenance',
          '/preview-test',
        ],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
