import React from 'react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { 
  BookOpen, 
  Layers, 
  ArrowRight, 
  GraduationCap, 
  FileText, 
  Sparkles, 
  Share2,
  Calendar,
  CheckCircle2,
  FolderOpen
} from 'lucide-react';
import { getMaterials } from '@/lib/db';
import { 
  getCanonicalUrl, 
  getBreadcrumbJsonLd, 
  getSubjectJsonLd, 
  SITE_NAME 
} from '@/lib/seo';
import SubjectMaterialsView from '@/components/SubjectMaterialsView';

export const revalidate = 3600; // Hourly ISR

interface SubjectPageProps {
  params: {
    code: string;
  };
}

export async function generateStaticParams() {
  try {
    const { materials } = await getMaterials({ limit: 2000 });
    const codes = new Set<string>();

    materials.forEach((m) => {
      if (!m.subject_code) return;
      m.subject_code
        .split(/[,/]/)
        .map((c) => c.trim().toLowerCase())
        .forEach((c) => {
          if (c.length >= 3 && c.length <= 12) codes.add(c);
        });
    });

    return Array.from(codes).map((code) => ({ code }));
  } catch {
    return [];
  }
}

export async function generateMetadata({
  params,
}: SubjectPageProps): Promise<Metadata> {
  const code = decodeURIComponent(params.code).trim().toUpperCase();
  const canonicalUrl = getCanonicalUrl(`/subjects/${params.code.toLowerCase()}`);
  const title = `${code} LPU Notes & Study Material | CampusConnect LPU`;
  const description = `Find ${code} notes, study materials and academic resources for LPU students on CampusConnect.`;

  return {
    title,
    description,
    keywords: [
      `${code} notes`,
      `${code} LPU notes`,
      `${code} study material`,
      `${code} study materials`,
      `${code} PYQ`,
      `${code} previous year question papers`,
      `${code} syllabus`,
      `${code} lecture notes`,
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
      type: 'website',
      siteName: SITE_NAME,
      locale: 'en_US',
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
    },
  };
}

export default async function SubjectDetailPage({ params }: SubjectPageProps) {
  const rawCode = decodeURIComponent(params.code).trim();
  const targetCode = rawCode.toUpperCase();

  const { materials: allMaterials } = await getMaterials({ limit: 2000 });

  // Filter materials that match this subject code
  const subjectMaterials = allMaterials.filter((m) => {
    if (!m.subject_code) return false;
    const codes = m.subject_code
      .split(/[,/]/)
      .map((c) => c.trim().toUpperCase());
    return codes.includes(targetCode);
  });

  if (subjectMaterials.length === 0) {
    notFound();
  }

  // Derive course details
  const primaryMaterial = subjectMaterials[0];
  const subjectName = primaryMaterial.subject || `${targetCode} Course`;
  const year = primaryMaterial.year || 1;

  // Breakdown of available resource types
  const hasNotes = subjectMaterials.some((m) => m.material_type === 'Notes');
  const hasPyqs = subjectMaterials.some((m) => m.material_type === 'PYQs');
  const hasMidTerm = subjectMaterials.some((m) => m.material_type === 'Mid-Term');
  const hasEndTerm = subjectMaterials.some((m) => m.material_type === 'End-Term');

  // Breadcrumbs
  const breadcrumbs = [
    { name: 'Home', path: '/' },
    { name: 'Subjects', path: '/subjects' },
    { name: targetCode, path: `/subjects/${params.code.toLowerCase()}` },
  ];

  // Schema.org structured data
  const breadcrumbJsonLd = getBreadcrumbJsonLd(breadcrumbs);
  const subjectJsonLd = getSubjectJsonLd({
    code: targetCode,
    name: subjectName,
    year,
    materialsCount: subjectMaterials.length,
    description: `Access curated ${targetCode} (${subjectName}) lecture notes, previous year question papers (PYQs), mid-term and end-term academic materials at Lovely Professional University.`,
  });

  // Find related subjects for internal linking
  const relatedCodes = new Set<string>();
  allMaterials.forEach((m) => {
    if (!m.subject_code) return;
    const codes = m.subject_code.split(/[,/]/).map((c) => c.trim().toUpperCase());
    codes.forEach((c) => {
      if (c !== targetCode && c.length >= 3 && c.length <= 12) {
        if (m.year === year || relatedCodes.size < 6) {
          relatedCodes.add(c);
        }
      }
    });
  });
  const relatedList = Array.from(relatedCodes).slice(0, 6);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#0b1120] text-slate-900 dark:text-slate-100 transition-colors">
      {/* Schema.org Structured Data */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(subjectJsonLd) }}
      />

      {/* Hero Header */}
      <section className="relative overflow-hidden bg-gradient-to-b from-orange-50/70 via-white to-slate-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 pt-8 pb-12 border-b border-slate-200 dark:border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          {/* Breadcrumb Navigation */}
          <nav aria-label="Breadcrumb" className="mb-6 flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
            <Link href="/" className="hover:text-orange-600 dark:hover:text-orange-400 transition-colors">
              Home
            </Link>
            <span>/</span>
            <Link href="/subjects" className="hover:text-orange-600 dark:hover:text-orange-400 transition-colors">
              Subjects
            </Link>
            <span>/</span>
            <span className="font-semibold text-slate-900 dark:text-slate-200">
              {targetCode}
            </span>
          </nav>

          <div className="max-w-3xl">
            {/* Subject Code Badge */}
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-orange-100/80 dark:bg-orange-950/60 border border-orange-200 dark:border-orange-800 text-orange-700 dark:text-orange-300 text-xs font-bold mb-3">
              <BookOpen className="w-3.5 h-3.5 text-orange-600 dark:text-orange-400" />
              <span>LPU Academic Subject • Year {year}</span>
            </div>

            {/* Main H1 */}
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-black text-slate-900 dark:text-white tracking-tight leading-tight">
              {targetCode} Notes, PYQs & Study Material
            </h1>

            {/* Course Title */}
            <p className="mt-2 text-lg sm:text-xl font-bold text-slate-700 dark:text-slate-300">
              {subjectName}
            </p>

            <p className="mt-3 text-sm sm:text-base text-slate-600 dark:text-slate-400 leading-relaxed">
              Find complete and organized study resources for <strong className="text-slate-900 dark:text-white">{targetCode}</strong> at Lovely Professional University. Download lecture notes, review previous year exam questions (PYQs), and access mid-term & end-term practice papers.
            </p>

            {/* Available Formats Badges */}
            <div className="flex items-center gap-2 flex-wrap mt-5">
              <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
                Included in this course:
              </span>
              {hasNotes && (
                <span className="text-xs font-bold px-2.5 py-1 rounded-lg bg-sky-50 dark:bg-sky-950/60 text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-sky-800/60">
                  Lecture Notes
                </span>
              )}
              {hasPyqs && (
                <span className="text-xs font-bold px-2.5 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60">
                  Solved PYQs
                </span>
              )}
              {hasMidTerm && (
                <span className="text-xs font-bold px-2.5 py-1 rounded-lg bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800/60">
                  Mid-Term Papers
                </span>
              )}
              {hasEndTerm && (
                <span className="text-xs font-bold px-2.5 py-1 rounded-lg bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800/60">
                  End-Term Revision
                </span>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Main Content Area */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="flex items-center justify-between mb-6 pb-3 border-b border-slate-200 dark:border-slate-800">
          <div>
            <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
              Course Resources ({subjectMaterials.length})
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Instant online document previewing and verified academic downloads.
            </p>
          </div>

          <Link
            href={`/library?search=${targetCode}`}
            className="text-xs font-bold text-orange-600 dark:text-orange-400 hover:underline inline-flex items-center gap-1"
          >
            Open in Full Library <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {/* Interactive Client View with Modal Preview */}
        <SubjectMaterialsView
          materials={subjectMaterials}
          subjectCode={targetCode}
          subjectName={subjectName}
          allowDownloads={false}
        />

        {/* Crawler-Friendly Semantic Listing (Always rendered for search engines) */}
        <div className="sr-only" aria-hidden="true">
          <h2>All Available {targetCode} Study Resources</h2>
          <ul>
            {subjectMaterials.map((mat) => (
              <li key={mat.id}>
                <a href={`/materials/${mat.id}`}>
                  {mat.title} — {mat.material_type} ({mat.file_size})
                </a>
                <p>{mat.description}</p>
              </li>
            ))}
          </ul>
        </div>

        {/* Related Subjects Section */}
        {relatedList.length > 0 && (
          <section className="mt-16 pt-8 border-t border-slate-200 dark:border-slate-800">
            <h2 className="text-lg font-black text-slate-900 dark:text-white mb-1">
              Explore More LPU Academic Subjects
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-5">
              Related course modules and notes for Lovely Professional University students.
            </p>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
              {relatedList.map((relCode) => (
                <Link
                  key={relCode}
                  href={`/subjects/${relCode.toLowerCase()}`}
                  className="bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-orange-500 text-center text-xs font-bold text-slate-800 dark:text-slate-200 hover:text-orange-600 dark:hover:text-orange-400 transition-colors shadow-2xs"
                >
                  <span className="block font-mono text-xs">{relCode}</span>
                  <span className="text-[10px] text-slate-400 font-normal">View Notes</span>
                </Link>
              ))}
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
