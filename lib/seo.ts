/**
 * CampusConnect LPU — Centralized SEO & Metadata Engine
 * Handles canonical URLs, Open Graph, Twitter cards, and Schema.org JSON-LD structured data.
 * Configured dynamically via environment variables (SITE_URL / NEXT_PUBLIC_APP_URL / VERCEL_URL).
 */

import { Material } from './db/types';

export const SITE_NAME = 'CampusConnect LPU';
export const DEFAULT_TITLE = 'CampusConnect LPU — LPU Study Materials, Notes & Academic Resources';
export const DEFAULT_DESCRIPTION =
  'CampusConnect LPU helps students find organized LPU study materials, notes, subject resources and academic content in one place.';

export const PRIMARY_KEYWORDS = [
  'LPU study material',
  'LPU notes',
  'LPU study materials',
  'LPU academic resources',
  'LPU student resources',
  'LPU CSE notes',
  'LPU subject notes',
  'LPU notes PDF',
  'LPU study material PDF',
  'LPU previous year papers',
  'LPU PYQ',
  'Lovely Professional University notes',
  'Lovely Professional University study material',
  'LPU CSE202 notes',
  'LPU INT108 notes',
  'LPU CSE205 notes',
  'LPU PHY110 notes',
  'LPU PHY109 notes',
  'CampusConnect LPU',
  'Campus Connect LPU',
];

/**
 * Returns the canonical base URL for the production website.
 * Priority:
 * 1. SITE_URL (user configurable custom domain e.g. https://campusconnectlpu.eu.org)
 * 2. NEXT_PUBLIC_APP_URL (if not localhost)
 * 3. VERCEL_PROJECT_PRODUCTION_URL (automatic Vercel production alias)
 * 4. VERCEL_URL (deployment alias)
 * 5. Production fallback URL
 */
export function getBaseUrl(): string {
  if (process.env.SITE_URL) {
    return process.env.SITE_URL.trim().replace(/\/+$/, '');
  }
  if (process.env.NEXT_PUBLIC_APP_URL && !process.env.NEXT_PUBLIC_APP_URL.includes('localhost')) {
    return process.env.NEXT_PUBLIC_APP_URL.trim().replace(/\/+$/, '');
  }
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) {
    return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL.trim().replace(/\/+$/, '')}`;
  }
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL.trim().replace(/\/+$/, '')}`;
  }
  // If in local development, use localhost
  if (process.env.NODE_ENV === 'development' && process.env.NEXT_PUBLIC_APP_URL) {
    return process.env.NEXT_PUBLIC_APP_URL.trim().replace(/\/+$/, '');
  }
  // Production fallback domain
  return 'https://campus-connect-lpu-raj-dev-vs-projects.vercel.app';
}

/**
 * Builds an absolute canonical URL from a relative path.
 */
export function getCanonicalUrl(path: string = ''): string {
  const base = getBaseUrl();
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  // Strip trailing slashes except for root
  const normalized = cleanPath === '/' ? '/' : cleanPath.replace(/\/+$/, '');
  return `${base}${normalized}`;
}

/**
 * Generates Schema.org WebSite JSON-LD for the homepage with SearchAction.
 */
export function getWebsiteJsonLd() {
  const base = getBaseUrl();
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: SITE_NAME,
    alternateName: ['Campus Connect LPU', 'LPU Study Hub'],
    url: base,
    description: DEFAULT_DESCRIPTION,
    inLanguage: 'en-US',
    potentialAction: {
      '@type': 'SearchAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: `${base}/library?search={search_term_string}`,
      },
      'query-input': 'required name=search_term_string',
    },
  };
}

/**
 * Generates Schema.org EducationalOrganization JSON-LD.
 * Accurately describes platform as a student-focused academic repository.
 */
export function getOrganizationJsonLd() {
  const base = getBaseUrl();
  return {
    '@context': 'https://schema.org',
    '@type': 'EducationalOrganization',
    name: SITE_NAME,
    url: base,
    logo: `${base}/icons/icon-512.png`,
    description:
      'Student-focused academic resource platform organizing study materials, subject notes, and question papers for Lovely Professional University students.',
    sameAs: [],
  };
}

/**
 * Generates Schema.org BreadcrumbList JSON-LD.
 */
export function getBreadcrumbJsonLd(items: { name: string; path: string }[]) {
  const base = getBaseUrl();
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: item.path.startsWith('http') ? item.path : `${base}${item.path.startsWith('/') ? item.path : `/${item.path}`}`,
    })),
  };
}

/**
 * Generates Schema.org CollectionPage / Course JSON-LD for a subject page.
 */
export function getSubjectJsonLd(subject: {
  code: string;
  name?: string;
  description?: string;
  year?: number;
  materialsCount?: number;
}) {
  const base = getBaseUrl();
  const url = `${base}/subjects/${subject.code.toLowerCase()}`;
  return {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: `${subject.code.toUpperCase()} LPU Notes & Study Material`,
    headline: `${subject.code.toUpperCase()} — ${subject.name || 'Subject Notes & Resources'}`,
    description:
      subject.description ||
      `Find ${subject.code.toUpperCase()} notes, study materials and academic resources for LPU students on CampusConnect.`,
    url,
    inLanguage: 'en-US',
    isPartOf: {
      '@type': 'WebSite',
      name: SITE_NAME,
      url: base,
    },
    about: {
      '@type': 'Course',
      courseCode: subject.code.toUpperCase(),
      name: subject.name || `${subject.code.toUpperCase()} Course`,
      description: `Course study resources, lecture notes, solved papers, and syllabus for ${subject.code.toUpperCase()} at Lovely Professional University.`,
      provider: {
        '@type': 'Organization',
        name: SITE_NAME,
      },
    },
  };
}

/**
 * Generates Schema.org LearningResource / DigitalDocument JSON-LD for individual material.
 */
export function getMaterialJsonLd(material: Material) {
  const base = getBaseUrl();
  const url = `${base}/materials/${material.id}`;
  return {
    '@context': 'https://schema.org',
    '@type': 'LearningResource',
    name: material.title,
    headline: `${material.title} — ${material.subject_code} Notes & Study Material`,
    description:
      material.description ||
      `Access ${material.title} study material and notes for ${material.subject_code} at LPU through CampusConnect.`,
    url,
    inLanguage: 'en-US',
    learningResourceType: material.material_type || 'Study Notes',
    educationalLevel: material.year ? `Year ${material.year}` : 'Undergraduate',
    isPartOf: {
      '@type': 'CollectionPage',
      name: `${material.subject_code} Study Materials`,
      url: `${base}/subjects/${material.subject_code.toLowerCase()}`,
    },
    datePublished: material.created_at,
    dateModified: material.updated_at || material.created_at,
  };
}
