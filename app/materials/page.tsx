import { redirect } from 'next/navigation';
import type { Metadata } from 'next';
import { getCanonicalUrl } from '@/lib/seo';

export const metadata: Metadata = {
  title: 'LPU Study Materials & Notes Library | CampusConnect LPU',
  description:
    'Browse organized Lovely Professional University (LPU) study materials, lecture notes, syllabus, and previous year question papers.',
  alternates: {
    canonical: getCanonicalUrl('/library'),
  },
};

export default function MaterialsPage() {
  redirect('/library');
}
