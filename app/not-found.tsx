import React from 'react';
import Link from 'next/link';
import type { Metadata } from 'next';
import { Home, BookOpen, Layers, ArrowLeft } from 'lucide-react';

export const metadata: Metadata = {
  title: '404: Page Not Found | CampusConnect LPU',
  description: 'The requested study resource or page could not be found on CampusConnect LPU.',
  robots: {
    index: false,
    follow: true,
  },
};

export default function NotFound() {
  return (
    <div className="min-h-[75vh] flex items-center justify-center px-4 py-16 bg-slate-50 dark:bg-[#0b1120] transition-colors">
      <div className="max-w-md w-full text-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-8 sm:p-10 shadow-xl">
        <div className="w-16 h-16 rounded-2xl bg-orange-500/10 dark:bg-orange-950/40 border border-orange-500/30 text-orange-500 flex items-center justify-center mx-auto mb-6 shadow-lg shadow-orange-500/10">
          <span className="text-2xl font-black">404</span>
        </div>

        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight mb-2">
          Page Not Found
        </h1>

        <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 mb-8 leading-relaxed">
          The study material, subject link, or resource you are looking for does not exist or may have been moved.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link
            href="/library"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl font-bold text-xs text-white bg-gradient-to-r from-lpu-600 to-amber-500 hover:from-lpu-700 hover:to-amber-600 shadow-md shadow-orange-500/20 transition-all cursor-pointer"
          >
            <BookOpen className="w-4 h-4" />
            Browse Study Library
          </Link>

          <Link
            href="/subjects"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl font-bold text-xs text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-300 dark:border-slate-700 transition-colors cursor-pointer"
          >
            <Layers className="w-4 h-4 text-orange-500" />
            All Subjects
          </Link>
        </div>

        <div className="mt-6 pt-6 border-t border-slate-100 dark:border-slate-800">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Back to Homepage
          </Link>
        </div>
      </div>
    </div>
  );
}
