import React from 'react';
import Link from 'next/link';
import type { Metadata } from 'next';
import { 
  BookOpen, 
  Layers, 
  ArrowRight, 
  GraduationCap, 
  Sparkles,
  Search,
  FileSpreadsheet,
  Award
} from 'lucide-react';
import { getMaterials } from '@/lib/db';
import { getCanonicalUrl, getBreadcrumbJsonLd, SITE_NAME } from '@/lib/seo';

export const revalidate = 3600; // ISR hourly revalidation

export const metadata: Metadata = {
  title: 'LPU Subjects Directory — Notes, Syllabus & Study Materials',
  description:
    'Browse subject-wise LPU notes, syllabus, study materials, and previous year question papers (PYQs) for Computer Science, Engineering, Mathematics, and Applied Sciences.',
  alternates: {
    canonical: getCanonicalUrl('/subjects'),
  },
  openGraph: {
    title: 'LPU Subjects Directory — Notes, Syllabus & Study Materials | CampusConnect LPU',
    description:
      'Browse subject-wise LPU notes, syllabus, study materials, and previous year question papers (PYQs) for Lovely Professional University students.',
    url: getCanonicalUrl('/subjects'),
  },
  twitter: {
    title: 'LPU Subjects Directory — Notes, Syllabus & Study Materials | CampusConnect LPU',
    description:
      'Browse subject-wise LPU notes, syllabus, study materials, and previous year question papers (PYQs) for Lovely Professional University students.',
  },
};

interface SubjectGroup {
  code: string;
  name: string;
  year: number;
  materialsCount: number;
  hasNotes: boolean;
  hasPyqs: boolean;
  hasMidTerm: boolean;
  hasEndTerm: boolean;
}

export default async function SubjectsPage() {
  const { materials } = await getMaterials({ limit: 2000 });

  // Group materials by clean subject code
  const subjectMap = new Map<string, SubjectGroup>();

  materials.forEach((m) => {
    if (!m.subject_code) return;
    const rawCodes = m.subject_code.split(/[,/]/).map((c) => c.trim().toUpperCase()).filter(Boolean);

    rawCodes.forEach((code) => {
      if (code.length < 3 || code.length > 12) return;
      const existing = subjectMap.get(code);
      const isNotes = m.material_type === 'Notes';
      const isPyq = m.material_type === 'PYQs';
      const isMid = m.material_type === 'Mid-Term';
      const isEnd = m.material_type === 'End-Term';

      if (!existing) {
        subjectMap.set(code, {
          code,
          name: m.subject || `${code} Academic Course`,
          year: m.year || 1,
          materialsCount: 1,
          hasNotes: isNotes,
          hasPyqs: isPyq,
          hasMidTerm: isMid,
          hasEndTerm: isEnd,
        });
      } else {
        existing.materialsCount++;
        if (isNotes) existing.hasNotes = true;
        if (isPyq) existing.hasPyqs = true;
        if (isMid) existing.hasMidTerm = true;
        if (isEnd) existing.hasEndTerm = true;
        if (!existing.name || existing.name.length < (m.subject?.length || 0)) {
          existing.name = m.subject || existing.name;
        }
      }
    });
  });

  const subjects = Array.from(subjectMap.values()).sort((a, b) => {
    if (a.year !== b.year) return a.year - b.year;
    return a.code.localeCompare(b.code);
  });

  const breadcrumbs = [
    { name: 'Home', path: '/' },
    { name: 'Subjects', path: '/subjects' },
  ];

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#0b1120] text-slate-900 dark:text-slate-100 transition-colors">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(getBreadcrumbJsonLd(breadcrumbs)),
        }}
      />

      {/* Hero Header */}
      <section className="relative overflow-hidden bg-gradient-to-b from-orange-50/70 via-white to-slate-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 pt-10 pb-16 border-b border-slate-200 dark:border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          {/* Breadcrumb Navigation */}
          <nav aria-label="Breadcrumb" className="mb-6 flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
            <Link href="/" className="hover:text-orange-600 dark:hover:text-orange-400 transition-colors">
              Home
            </Link>
            <span>/</span>
            <span className="font-semibold text-slate-900 dark:text-slate-200">
              Subjects
            </span>
          </nav>

          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-orange-100/80 dark:bg-orange-950/60 border border-orange-200 dark:border-orange-800 text-orange-700 dark:text-orange-300 text-xs font-bold mb-4">
              <Layers className="w-3.5 h-3.5 text-orange-600 dark:text-orange-400" />
              LPU Academic Course Directory
            </div>

            <h1 className="text-3xl sm:text-4xl md:text-5xl font-black text-slate-900 dark:text-white tracking-tight leading-tight">
              LPU Subjects & Study Material Portals
            </h1>

            <p className="mt-3 text-sm sm:text-base text-slate-600 dark:text-slate-300 leading-relaxed">
              Find organized lecture notes, chapter handouts, syllabus guides, solved mid-term papers, and previous year questions (PYQs) for all active Lovely Professional University engineering and applied courses.
            </p>
          </div>
        </div>
      </section>

      {/* Subjects Grid */}
      <section className="py-12 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between mb-8 pb-4 border-b border-slate-200 dark:border-slate-800">
          <div>
            <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
              Available Courses ({subjects.length})
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Select a subject to view all curated study notes and exam resources.
            </p>
          </div>

          <Link
            href="/library"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-orange-600 dark:text-orange-400 hover:underline"
          >
            Open All Files in Library <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
          {subjects.map((sub) => (
            <Link
              key={sub.code}
              href={`/subjects/${sub.code.toLowerCase()}`}
              className="group bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 hover:border-orange-400 dark:hover:border-orange-500/60 rounded-2xl p-5 shadow-xs hover:shadow-lg dark:hover:shadow-slate-950/60 hover:-translate-y-1 transition-all flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-3">
                  <span className="font-mono text-xs font-bold px-2.5 py-1 rounded-md bg-orange-50 dark:bg-orange-950/60 border border-orange-200 dark:border-orange-900/60 text-orange-700 dark:text-orange-300">
                    {sub.code}
                  </span>
                  <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded">
                    Year {sub.year}
                  </span>
                </div>

                <h3 className="font-bold text-base text-slate-900 dark:text-white group-hover:text-orange-600 dark:group-hover:text-orange-400 transition-colors line-clamp-2">
                  {sub.name}
                </h3>

                <div className="flex items-center gap-1.5 flex-wrap mt-3">
                  {sub.hasNotes && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-sky-50 dark:bg-sky-950/60 text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-sky-800/60">
                      Notes
                    </span>
                  )}
                  {sub.hasPyqs && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60">
                      PYQs
                    </span>
                  )}
                  {sub.hasMidTerm && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800/60">
                      Mid-Term
                    </span>
                  )}
                  {sub.hasEndTerm && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800/60">
                      End-Term
                    </span>
                  )}
                </div>
              </div>

              <div className="mt-5 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
                <span className="text-slate-500 dark:text-slate-400 font-medium">
                  {sub.materialsCount} {sub.materialsCount === 1 ? 'Resource' : 'Resources'}
                </span>
                <span className="text-orange-600 dark:text-orange-400 font-bold inline-flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
                  View Notes <ArrowRight className="w-3.5 h-3.5" />
                </span>
              </div>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
