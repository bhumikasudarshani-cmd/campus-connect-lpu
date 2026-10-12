import { MetadataRoute } from 'next';
import { getBaseUrl } from '@/lib/seo';
import { getMaterials } from '@/lib/db';

export const revalidate = 3600; // Revalidate sitemap every hour so newly added content is indexed automatically

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = getBaseUrl();
  const now = new Date();

  // Core static public pages
  const staticRoutes: MetadataRoute.Sitemap = [
    {
      url: `${baseUrl}`,
      lastModified: now,
      changeFrequency: 'daily',
      priority: 1.0,
    },
    {
      url: `${baseUrl}/library`,
      lastModified: now,
      changeFrequency: 'daily',
      priority: 0.9,
    },
    {
      url: `${baseUrl}/subjects`,
      lastModified: now,
      changeFrequency: 'daily',
      priority: 0.9,
    },
    {
      url: `${baseUrl}/community`,
      lastModified: now,
      changeFrequency: 'weekly',
      priority: 0.6,
    },
  ];

  try {
    const { materials } = await getMaterials({ limit: 2000 });

    // 1. Dynamic Subject Pages
    const subjectMap = new Map<string, { lastModified: Date; count: number }>();

    materials.forEach((m) => {
      if (!m.subject_code) return;
      // Handle comma-separated codes or slashes cleanly
      const rawCodes = m.subject_code.split(/[,/]/).map((c) => c.trim().toLowerCase()).filter(Boolean);
      const modDate = m.updated_at ? new Date(m.updated_at) : m.created_at ? new Date(m.created_at) : now;

      rawCodes.forEach((code) => {
        // Filter out non-code labels like 'syllabus' if length is too short or weird
        if (code.length < 3 || code.length > 12) return;
        const existing = subjectMap.get(code);
        if (!existing || modDate > existing.lastModified) {
          subjectMap.set(code, {
            lastModified: modDate,
            count: (existing?.count || 0) + 1,
          });
        }
      });
    });

    const subjectRoutes: MetadataRoute.Sitemap = Array.from(subjectMap.entries()).map(([code, data]) => ({
      url: `${baseUrl}/subjects/${encodeURIComponent(code)}`,
      lastModified: data.lastModified,
      changeFrequency: 'weekly',
      priority: 0.8,
    }));

    // 2. Dynamic Material Pages
    const materialRoutes: MetadataRoute.Sitemap = materials.map((m) => {
      const modDate = m.updated_at ? new Date(m.updated_at) : m.created_at ? new Date(m.created_at) : now;
      return {
        url: `${baseUrl}/materials/${m.id}`,
        lastModified: modDate,
        changeFrequency: 'weekly',
        priority: 0.7,
      };
    });

    return [...staticRoutes, ...subjectRoutes, ...materialRoutes];
  } catch (err) {
    console.warn('Could not generate dynamic sitemap entries:', err);
    return staticRoutes;
  }
}
