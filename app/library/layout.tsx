import React from 'react';
import type { Metadata } from 'next';
import { getCanonicalUrl } from '@/lib/seo';

export const metadata: Metadata = {
  title: 'LPU Study Materials Library — Notes, PYQs & Question Papers',
  description:
    'Search and access verified LPU study materials, handwritten notes, mid-term papers, end-term solutions, and previous year questions (PYQs) organized year-wise for Lovely Professional University students.',
  alternates: {
    canonical: getCanonicalUrl('/library'),
  },
  openGraph: {
    title: 'LPU Study Materials Library — Notes, PYQs & Question Papers | CampusConnect LPU',
    description:
      'Search and access verified LPU study materials, handwritten notes, mid-term papers, end-term solutions, and previous year questions (PYQs) organized year-wise.',
    url: getCanonicalUrl('/library'),
  },
  twitter: {
    title: 'LPU Study Materials Library — Notes, PYQs & Question Papers | CampusConnect LPU',
    description:
      'Search and access verified LPU study materials, handwritten notes, mid-term papers, end-term solutions, and previous year questions (PYQs).',
  },
};

export default function LibraryLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
