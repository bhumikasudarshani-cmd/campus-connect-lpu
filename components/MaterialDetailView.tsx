'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { 
  Eye, 
  Download, 
  ExternalLink, 
  BookOpen, 
  Layers, 
  CheckCircle2, 
  ShieldAlert, 
  Sparkles,
  ArrowRight
} from 'lucide-react';
import { Material } from '@/lib/db/types';
import DocumentViewerModal from '@/components/DocumentViewerModal';
import { getMaterialFileFormat } from '@/components/MaterialCard';

interface MaterialDetailViewProps {
  material: Material;
  allowDownloads?: boolean;
}

export default function MaterialDetailView({
  material,
  allowDownloads = false,
}: MaterialDetailViewProps) {
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const fileFormat = getMaterialFileFormat(material);

  const handleDownload = () => {
    if (!allowDownloads) {
      alert('Document downloads are currently disabled. You can view this document online via the Previewer.');
      return;
    }
    const dlEndpoint = `/api/materials/${material.id}/download`;
    const link = document.createElement('a');
    link.href = dlEndpoint;
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    setTimeout(() => {
      if (document.body.contains(link)) document.body.removeChild(link);
    }, 200);
  };

  return (
    <div className="space-y-6">
      {/* Primary Call to Action Box */}
      <div className="bg-gradient-to-r from-orange-500/10 via-amber-500/10 to-orange-500/5 dark:from-orange-950/40 dark:via-slate-900 dark:to-orange-950/20 rounded-2xl p-6 border border-orange-200 dark:border-orange-800/60 shadow-xs">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 text-xs font-bold text-orange-700 dark:text-orange-400 mb-1">
              <Sparkles className="w-3.5 h-3.5" />
              Verified Academic Resource
            </div>
            <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
              Ready to study this material?
            </h3>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 mt-0.5">
              Access the high-resolution online viewer with dark mode, zoom, and multi-page layout.
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <button
              onClick={() => setIsPreviewOpen(true)}
              className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs shadow-md shadow-orange-600/20 cursor-pointer hover:scale-[1.02] active:scale-[0.98] transition-all"
            >
              <Eye className="w-4 h-4" />
              <span>Read Online Now</span>
            </button>

            <button
              onClick={handleDownload}
              className="inline-flex items-center justify-center gap-1.5 px-4 py-3 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-semibold text-xs border border-slate-200 dark:border-slate-700 cursor-pointer transition-all"
              title={allowDownloads ? 'Download File' : 'Downloads are disabled by administration'}
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download</span>
            </button>
          </div>
        </div>
      </div>

      {/* Document Viewer Modal */}
      <DocumentViewerModal
        material={isPreviewOpen ? material : null}
        allowDownloads={allowDownloads}
        isAdminOrOwner={false}
        onClose={() => setIsPreviewOpen(false)}
        onDownload={handleDownload}
      />
    </div>
  );
}
