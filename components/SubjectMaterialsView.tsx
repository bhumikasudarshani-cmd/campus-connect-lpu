'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { 
  FileText, 
  Eye, 
  ExternalLink, 
  Search, 
  BookOpen, 
  Layers, 
  Download, 
  Calendar,
  Sparkles,
  ArrowRight
} from 'lucide-react';
import { Material, MaterialType } from '@/lib/db/types';
import DocumentViewerModal from '@/components/DocumentViewerModal';
import MaterialCard from '@/components/MaterialCard';

interface SubjectMaterialsViewProps {
  materials: Material[];
  subjectCode: string;
  subjectName: string;
  allowDownloads?: boolean;
}

export default function SubjectMaterialsView({
  materials,
  subjectCode,
  subjectName,
  allowDownloads = false,
}: SubjectMaterialsViewProps) {
  const [activeType, setActiveType] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [previewMaterial, setPreviewMaterial] = useState<Material | null>(null);

  const availableTypes = useMemo(() => {
    const types = new Set<string>();
    materials.forEach((m) => {
      if (m.material_type) types.add(m.material_type);
    });
    return ['All', ...Array.from(types)];
  }, [materials]);

  const filteredMaterials = useMemo(() => {
    return materials.filter((m) => {
      const matchesType = activeType === 'All' || m.material_type === activeType;
      const matchesSearch =
        searchQuery.trim() === '' ||
        m.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (m.description && m.description.toLowerCase().includes(searchQuery.toLowerCase()));
      return matchesType && matchesSearch;
    });
  }, [materials, activeType, searchQuery]);

  return (
    <div className="space-y-6">
      {/* Search & Filter Controls */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white dark:bg-slate-900/80 p-3 sm:p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
        {/* Type Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
          {availableTypes.map((type) => {
            const count =
              type === 'All'
                ? materials.length
                : materials.filter((m) => m.material_type === type).length;
            const isActive = activeType === type;
            return (
              <button
                key={type}
                onClick={() => setActiveType(type)}
                className={`text-xs font-bold px-3 py-1.5 rounded-xl transition-all whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
                  isActive
                    ? 'bg-orange-600 text-white shadow-xs shadow-orange-500/20'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                <span>{type}</span>
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                    isActive
                      ? 'bg-orange-700 text-orange-100'
                      : 'bg-slate-200 dark:bg-slate-700 text-slate-500 dark:text-slate-400'
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Local Search input */}
        <div className="relative min-w-[200px] sm:w-64">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={`Search ${subjectCode} materials...`}
            className="w-full text-xs pl-8 pr-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800/80 border border-transparent focus:border-orange-500 focus:bg-white dark:focus:bg-slate-900 outline-hidden transition-all text-slate-900 dark:text-slate-100 placeholder:text-slate-400"
          />
        </div>
      </div>

      {/* Materials Grid */}
      {filteredMaterials.length === 0 ? (
        <div className="text-center py-12 bg-white dark:bg-slate-900/60 rounded-2xl border border-slate-200 dark:border-slate-800 p-8">
          <BookOpen className="w-10 h-10 text-slate-400 mx-auto mb-3 opacity-60" />
          <h3 className="text-base font-bold text-slate-800 dark:text-slate-200">
            No materials found
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm mx-auto">
            Try adjusting your search query or selecting a different material category tab.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredMaterials.map((mat) => (
            <div key={mat.id} className="flex flex-col">
              <MaterialCard
                material={mat}
                allowDownloads={allowDownloads}
                onPreview={(m) => setPreviewMaterial(m)}
              />
              <div className="mt-1.5 px-2 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
                <Link
                  href={`/materials/${mat.id}`}
                  className="inline-flex items-center gap-1 hover:text-orange-600 dark:hover:text-orange-400 hover:underline"
                >
                  SEO Page & Full Details <ArrowRight className="w-3 h-3" />
                </Link>
                <span>{mat.download_count} views</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Document Viewer Modal for instant reading */}
      <DocumentViewerModal
        material={previewMaterial}
        allowDownloads={allowDownloads}
        isAdminOrOwner={false}
        onClose={() => setPreviewMaterial(null)}
        onDownload={(mat) => {
          if (!allowDownloads) {
            alert('Document downloads are currently disabled. You can view this document in Preview mode.');
            return;
          }
          const dlEndpoint = `/api/materials/${mat.id}/download`;
          const link = document.createElement('a');
          link.href = dlEndpoint;
          link.target = '_blank';
          document.body.appendChild(link);
          link.click();
          setTimeout(() => {
            if (document.body.contains(link)) document.body.removeChild(link);
          }, 200);
        }}
      />
    </div>
  );
}
