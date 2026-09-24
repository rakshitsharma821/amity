import { MetadataRoute } from 'next';
import { siteConfig } from '@/site.config';

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = siteConfig.url.replace(/\/$/, '');
  const now = new Date();

  const publicRoutes = [
    { path: '', priority: 1.0, changeFrequency: 'weekly' as const },
    { path: '/features', priority: 0.9, changeFrequency: 'weekly' as const },
    { path: '/how-it-works', priority: 0.8, changeFrequency: 'monthly' as const },
    { path: '/pricing', priority: 0.8, changeFrequency: 'monthly' as const },
    { path: '/docs', priority: 0.8, changeFrequency: 'weekly' as const },
    { path: '/contact', priority: 0.7, changeFrequency: 'monthly' as const },
    { path: '/login', priority: 0.5, changeFrequency: 'monthly' as const },
    { path: '/signup', priority: 0.5, changeFrequency: 'monthly' as const },
    { path: '/privacy', priority: 0.4, changeFrequency: 'monthly' as const },
    { path: '/terms', priority: 0.4, changeFrequency: 'monthly' as const },
    { path: '/acceptable-use', priority: 0.4, changeFrequency: 'monthly' as const },
  ];

  return publicRoutes.map((route) => ({
    url: `${baseUrl}${route.path}`,
    lastModified: now,
    changeFrequency: route.changeFrequency,
    priority: route.priority,
  }));
}
