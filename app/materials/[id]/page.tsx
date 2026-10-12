import React from 'react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { 
  BookOpen, 
  Layers, 
  ArrowRight, 
  Calendar, 
  HardDrive, 
  FileText, 
  Eye, 
  Download, 
  CheckCircle2, 
  Share2,
  ExternalLink,
  GraduationCap
} from 'lucide-react';
import { getMaterialById, getMaterials } from '@/lib/db';
import { 
  getCanonicalUrl, 
  getBreadcrumbJsonLd, 
  getMaterialJsonLd, 
  SITE_NAME 
} from '@/lib/seo';
import MaterialDetailView from '@/components/MaterialDetailView';
import { getMaterialFileFormat } from '@/lib/drive-service';

export const revalidate = 3600; // Hourly ISR

interface MaterialPageProps {
  params: {
    id: string;
  };
}

export async function generateStaticParams() {
  try {
    const { materials } = await getMaterials({ limit: 2000 });
    return materials.map((m) => ({ id: m.id }));
  } catch {
    return [];
  }
}

export async function generateMetadata({
  params,
}: MaterialPageProps): Promise<Metadata> {
  const material = await getMaterialById(params.id);

  if (!material) {
    return {
      title: 'Material Not Found | CampusConnect LPU',
      robots: { index: false },
    };
  }

  const subjectCode = material.subject_code?.trim().toUpperCase() || 'LPU';
  const title = `${material.title} — ${subjectCode} Notes & Study Material | CampusConnect LPU`;
  const description = `Access ${material.title} study material and notes for ${subjectCode} at LPU through CampusConnect.`;
  const canonicalUrl = getCanonicalUrl(`/materials/${material.id}`);

  return {
    title,
    description,
    keywords: [
      `${material.title}`,
      `${subjectCode} notes`,
      `${subjectCode} study material`,
      `${material.material_type} PDF`,
      'LPU study material',
      'Lovely Professional University',
      'CampusConnect LPU',
    ],
    alternates: {
      canonical: canonicalUrl,
    },
    openGraph: {
      title,
      description,
      url: canonicalUrl,
      type: 'article',
      siteName: SITE_NAME,
      publishedTime: material.created_at,
      modifiedTime: material.updated_at || material.created_at,
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
    },
  };
}

export default async function MaterialDetailPage({ params }: MaterialPageProps) {
  const material = await getMaterialById(params.id);

  if (!material) {
    notFound();
  }

  const primaryCode = material.subject_code?.split(/[,/]/)[0]?.trim().toUpperCase() || 'LPU';
  const cleanCodeSlug = primaryCode.toLowerCase();
  const fileFormat = getMaterialFileFormat(material);

  // Fetch related materials for this subject
  const { materials: allMaterials } = await getMaterials({ limit: 100 });
  const relatedMaterials = allMaterials
    .filter((m) => m.id !== material.id && m.subject_code?.toUpperCase().includes(primaryCode))
    .slice(0, 3);

  // Breadcrumbs
  const breadcrumbs = [
    { name: 'Home', path: '/' },
    { name: 'Subjects', path: '/subjects' },
    { name: primaryCode, path: `/subjects/${cleanCodeSlug}` },
    { name: material.title, path: `/materials/${material.id}` },
  ];

  const breadcrumbJsonLd = getBreadcrumbJsonLd(breadcrumbs);
  const materialJsonLd = getMaterialJsonLd(material);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#0b1120] text-slate-900 dark:text-slate-100 transition-colors">
      {/* Schema.org Structured Data */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(materialJsonLd) }}
      />

      {/* Header & Breadcrumb */}
      <div className="bg-gradient-to-b from-orange-50/70 via-white to-slate-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 border-b border-slate-200 dark:border-slate-800 pt-8 pb-10">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          
          {/* Breadcrumbs */}
          <nav aria-label="Breadcrumb" className="mb-6 flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 flex-wrap">
            <Link href="/" className="hover:text-orange-600 dark:hover:text-orange-400 transition-colors">
              Home
            </Link>
            <span>/</span>
            <Link href="/subjects" className="hover:text-orange-600 dark:hover:text-orange-400 transition-colors">
              Subjects
            </Link>
            <span>/</span>
            <Link href={`/subjects/${cleanCodeSlug}`} className="hover:text-orange-600 dark:hover:text-orange-400 transition-colors">
              {primaryCode}
            </Link>
            <span>/</span>
            <span className="font-semibold text-slate-900 dark:text-slate-200 line-clamp-1 max-w-[200px] sm:max-w-none">
              {material.title}
            </span>
          </nav>

          {/* Badges bar */}
          <div className="flex items-center gap-2 flex-wrap mb-4">
            <Link
              href={`/subjects/${cleanCodeSlug}`}
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-orange-100/80 dark:bg-orange-950/60 border border-orange-200 dark:border-orange-800 text-orange-700 dark:text-orange-300 text-xs font-bold hover:bg-orange-200 dark:hover:bg-orange-900 transition-colors"
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span>{primaryCode}</span>
            </Link>

            <span className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
              Year {material.year || 1}
            </span>

            <span className={`text-xs font-bold px-2.5 py-1 rounded-lg border ${fileFormat.badgeClass}`}>
              {fileFormat.label}
            </span>

            <span className="text-xs font-medium px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400">
              {material.material_type}
            </span>
          </div>

          {/* Main H1 */}
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-black text-slate-900 dark:text-white tracking-tight leading-snug">
            {material.title}
          </h1>

          {/* Subject Title */}
          {material.subject && (
            <p className="mt-2 text-sm sm:text-base font-semibold text-slate-600 dark:text-slate-400">
              Course: {material.subject} ({primaryCode})
            </p>
          )}

          {/* Quick Metrics */}
          <div className="flex items-center gap-4 text-xs text-slate-500 dark:text-slate-400 mt-4 pt-4 border-t border-slate-200 dark:border-slate-800">
            <span className="flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5" />
              {new Date(material.created_at).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
              })}
            </span>
            <span className="flex items-center gap-1">
              <HardDrive className="w-3.5 h-3.5" />
              {material.file_size || 'Document'}
            </span>
            <span className="flex items-center gap-1">
              <Eye className="w-3.5 h-3.5" />
              {material.download_count} Views
            </span>
          </div>
        </div>
      </div>

      {/* Main Container */}
      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-10">
        
        {/* Interactive Reader / Download Box */}
        <MaterialDetailView material={material} allowDownloads={false} />

        {/* Detailed Description */}
        <section className="bg-white dark:bg-slate-900 rounded-2xl p-6 sm:p-8 border border-slate-200 dark:border-slate-800 shadow-xs">
          <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-3">
            About This Academic Resource
          </h2>
          <div className="prose dark:prose-invert max-w-none text-sm text-slate-600 dark:text-slate-300 leading-relaxed space-y-3">
            <p>
              {material.description ||
                `This verified study material covers key topics, chapter notes, and problem-solving concepts for ${primaryCode} at Lovely Professional University. Students can review this document online or consult related course materials.`}
            </p>
            
            <div className="mt-6 pt-6 border-t border-slate-100 dark:border-slate-800 grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div>
                <span className="text-slate-400 block mb-0.5">Subject Code</span>
                <strong className="text-slate-800 dark:text-slate-200 font-mono text-sm">{primaryCode}</strong>
              </div>
              <div>
                <span className="text-slate-400 block mb-0.5">Subject Full Title</span>
                <strong className="text-slate-800 dark:text-slate-200 text-sm">{material.subject || primaryCode}</strong>
              </div>
              <div>
                <span className="text-slate-400 block mb-0.5">Academic Level</span>
                <span className="text-slate-800 dark:text-slate-200 font-medium">B.Tech / Undergraduate (Year {material.year || 1})</span>
              </div>
              <div>
                <span className="text-slate-400 block mb-0.5">Resource Classification</span>
                <span className="text-slate-800 dark:text-slate-200 font-medium">{material.material_type || 'Study Notes'}</span>
              </div>
            </div>
          </div>
        </section>

        {/* Related Materials Section */}
        {relatedMaterials.length > 0 && (
          <section className="pt-4">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h2 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white">
                  More Resources for {primaryCode}
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Continue learning with other chapter notes and exam papers for this course.
                </p>
              </div>

              <Link
                href={`/subjects/${cleanCodeSlug}`}
                className="text-xs font-bold text-orange-600 dark:text-orange-400 hover:underline inline-flex items-center gap-1"
              >
                View All {primaryCode} Notes <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {relatedMaterials.map((rel) => (
                <Link
                  key={rel.id}
                  href={`/materials/${rel.id}`}
                  className="group bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-orange-500 transition-all flex flex-col justify-between"
                >
                  <div>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                      {rel.material_type}
                    </span>
                    <h3 className="font-bold text-xs text-slate-900 dark:text-white mt-2 group-hover:text-orange-600 dark:group-hover:text-orange-400 line-clamp-2 transition-colors">
                      {rel.title}
                    </h3>
                  </div>
                  <div className="mt-3 pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px] text-slate-400">
                    <span>{rel.file_size || 'PDF'}</span>
                    <span className="text-orange-600 dark:text-orange-400 font-bold inline-flex items-center gap-0.5">
                      Open <ArrowRight className="w-3 h-3" />
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
