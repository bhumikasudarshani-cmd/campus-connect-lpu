'use client';

import React, { useState } from 'react';
import { 
  Download, 
  FileText, 
  Eye, 
  Calendar, 
  HardDrive, 
  CheckCircle2, 
  BookOpen, 
  FileSpreadsheet, 
  HelpCircle, 
  Award, 
  Layers, 
  Bookmark, 
  FileArchive, 
  Presentation,
  ExternalLink 
} from 'lucide-react';
import { Material } from '@/lib/db/types';
import { isMaterialPreviewable, getMaterialCategory, isGoogleDriveFolder } from '@/lib/drive-service';

export function getMaterialFileFormat(material: {
  file_name?: string | null;
  file_url?: string;
  mime_type?: string | null;
  title?: string;
  file_size?: string | null;
  material_type?: string;
}) {
  const category = getMaterialCategory(material);
  if (category === 'ARCHIVE') {
    return { type: 'zip' as const, label: 'ZIP Archive', badgeClass: 'bg-purple-50 dark:bg-purple-950/50 text-purple-700 dark:text-purple-300 border-purple-200/90 dark:border-purple-800/80', icon: FileArchive, ext: '.zip' };
  }
  if (category === 'PPT') {
    const name = (material.file_name || material.title || '').toLowerCase();
    return { type: 'ppt' as const, label: 'PPT Slides', badgeClass: 'bg-amber-50 dark:bg-amber-950/50 text-amber-800 dark:text-amber-300 border-amber-200/90 dark:border-amber-800/80', icon: Presentation, ext: name.endsWith('.ppt') ? '.ppt' : '.pptx' };
  }
  if (category === 'IMAGE') {
    return { type: 'image' as const, label: 'Images', badgeClass: 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border-emerald-200/90 dark:border-emerald-800/80', icon: FileText, ext: '.jpg' };
  }
  if (category === 'EXTERNAL_LINK') {
    const isFolder = isGoogleDriveFolder(material.file_url);
    return { type: 'doc' as const, label: isFolder ? 'Drive Folder' : 'Resource Link', badgeClass: 'bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 border-amber-200/90 dark:border-amber-800/80', icon: ExternalLink, ext: '' };
  }
  const name = (material.file_name || material.title || '').toLowerCase();
  if (name.endsWith('.docx') || name.endsWith('.doc') || (material.mime_type || '').includes('word')) {
    return { type: 'doc' as const, label: 'Word Doc', badgeClass: 'bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 border-blue-200/90 dark:border-blue-800/80', icon: FileText, ext: '.docx' };
  }
  return { type: 'pdf' as const, label: 'PDF', badgeClass: 'bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300 border-rose-200/90 dark:border-rose-800/80', icon: FileText, ext: '.pdf' };
}

interface MaterialCardProps {
  material: Material;
  onPreview?: (mat: Material) => void;
  onDownloadComplete?: (mat: Material) => void;
  allowDownloads?: boolean;
  isAdmin?: boolean;
  isSaved?: boolean;
  onToggleSave?: (mat: Material) => void;
}

export function formatYearName(year: number): string {
  switch (year) {
    case 1:
      return '1st Year';
    case 2:
      return '2nd Year';
    case 3:
      return '3rd Year';
    case 4:
      return '4th Year';
    default:
      return `Year ${year}`;
  }
}

export default function MaterialCard({ 
  material, 
  onPreview, 
  onDownloadComplete,
  allowDownloads = true,
  isAdmin = false,
  isSaved = false,
  onToggleSave
}: MaterialCardProps) {
  const [downloading, setDownloading] = useState(false);
  const [downloadCount, setDownloadCount] = useState(material.download_count);
  const [downloadSuccess, setDownloadSuccess] = useState(false);

  const isDriveFolder = isGoogleDriveFolder(material.file_url);
  const category = getMaterialCategory(material);
  const fileFormat = getMaterialFileFormat(material);
  const isExternalLink = category === 'EXTERNAL_LINK';
  const isPreviewableFormat = category === 'PDF' || category === 'IMAGE' || category === 'PPT';
  const canDownload = Boolean(allowDownloads || isAdmin);

  const handleDownload = async (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!canDownload) {
      if (onPreview) onPreview(material);
      return;
    }
    if (downloading) return;

    setDownloading(true);
    try {
      const downloadEndpoint = `/api/materials/${material.id}/download`;
      
      const link = document.createElement('a');
      link.href = downloadEndpoint;
      const cleanTitle = material.title.replace(/[^a-zA-Z0-9_.-]/g, '_').slice(0, 30);
      link.setAttribute('download', `${material.subject_code}_${cleanTitle}${fileFormat.ext}`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      setDownloadCount((prev) => prev + 1);
      setDownloadSuccess(true);
      setTimeout(() => setDownloadSuccess(false), 3000);

      if (onDownloadComplete) {
        onDownloadComplete({ ...material, download_count: downloadCount + 1 });
      }
    } catch (err) {
      console.error('Download failed', err);
    } finally {
      setDownloading(false);
    }
  };

  const getTypeBadge = () => {
    switch (material.material_type) {
      case 'Notes':
        return {
          icon: BookOpen,
          classes: 'bg-sky-50 dark:bg-sky-950/50 text-sky-700 dark:text-sky-300 border-sky-200/90 dark:border-sky-800/80',
          dot: 'bg-sky-500',
        };
      case 'Mid-Term':
        return {
          icon: FileSpreadsheet,
          classes: 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border-emerald-200/90 dark:border-emerald-800/80',
          dot: 'bg-emerald-500',
        };
      case 'End-Term':
        return {
          icon: Award,
          classes: 'bg-purple-50 dark:bg-purple-950/50 text-purple-700 dark:text-purple-300 border-purple-200/90 dark:border-purple-800/80',
          dot: 'bg-purple-500',
        };
      case 'PYQs':
        return {
          icon: HelpCircle,
          classes: 'bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 border-amber-200/90 dark:border-amber-800/80',
          dot: 'bg-amber-500',
        };
      default:
        return {
          icon: FileText,
          classes: 'bg-slate-50 dark:bg-slate-800/60 text-slate-700 dark:text-slate-300 border-slate-200/90 dark:border-slate-700/80',
          dot: 'bg-slate-500',
        };
    }
  };


  const handleOpenDirectLink = (url: string) => {
    window.open(url, '_blank', 'noopener,noreferrer');
    fetch('/api/materials/history', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ materialId: material.id }),
    }).catch(() => {});
  };

  const badge = getTypeBadge();
  const BadgeIcon = badge.icon;
  const FormatIcon = fileFormat.icon;

  return (
    <div className="group bg-white dark:bg-slate-900/90 rounded-2xl border border-slate-200/90 dark:border-slate-800 hover:border-lpu-300/90 dark:hover:border-orange-500/50 p-5 shadow-xs hover:shadow-lg dark:hover:shadow-slate-950/60 hover:-translate-y-1 transition-all duration-200 flex flex-col justify-between overflow-hidden min-w-0">
      <div className="min-w-0">
        {/* Top Badges: Material Type + File Format + Year Badge + Subject Code + Bookmark */}
        <div className="flex items-start justify-between gap-2 mb-3">
          <div className="flex items-center gap-1.5 flex-wrap flex-1 min-w-0">
            <span className={`inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.8 rounded-full border shadow-2xs shrink-0 ${badge.classes}`}>
              <BadgeIcon className="w-3.5 h-3.5" />
              {material.material_type}
            </span>
            <span className={`inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.8 rounded-md border shadow-2xs shrink-0 ${fileFormat.badgeClass}`}>
              <FormatIcon className="w-3.5 h-3.5" />
              {fileFormat.label}
            </span>
            <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-2 py-0.8 rounded-md shadow-2xs shrink-0">
              {formatYearName(material.year)}
            </span>
            {material.file_url?.startsWith('[') && (() => {
              try {
                const arr = JSON.parse(material.file_url);
                if (Array.isArray(arr) && arr.length > 1) {
                  return (
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/50 border border-amber-200/90 dark:border-amber-800/80 px-2 py-0.8 rounded-md shrink-0">
                      <Layers className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                      {arr.length} PDFs
                    </span>
                  );
                }
              } catch {}
              return null;
            })()}
          </div>

          <div className="flex items-center gap-1.5 shrink-0 max-w-[45%]">
            <span 
              className="text-[11px] font-mono font-bold text-slate-800 dark:text-orange-300 bg-orange-50 dark:bg-orange-950/50 border border-orange-200/70 dark:border-orange-900/60 px-2 py-0.5 rounded truncate max-w-[140px]"
              title={material.subject_code}
            >
              {material.subject_code}
            </span>
            {onToggleSave && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleSave(material);
                }}
                className={`p-1 rounded-lg transition-colors shrink-0 ${
                  isSaved
                    ? 'text-amber-500 bg-amber-50 dark:bg-amber-950/50 hover:bg-amber-100 dark:hover:bg-amber-900/50'
                    : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
                title={isSaved ? 'Remove from Saved' : 'Save Material'}
                aria-label={isSaved ? 'Remove from Saved' : 'Save Material'}
              >
                <Bookmark className={`w-3.5 h-3.5 ${isSaved ? 'fill-amber-500' : ''}`} />
              </button>
            )}
          </div>
        </div>

        {/* Title */}
        <h3 
          className="font-bold text-slate-900 dark:text-slate-100 text-base leading-snug group-hover:text-lpu-600 dark:group-hover:text-orange-400 transition-colors line-clamp-2 break-words"
          title={material.title}
        >
          {material.title}
        </h3>

        {/* Subject */}
        <p 
          className="text-xs font-semibold text-slate-600 dark:text-slate-300 mt-1 line-clamp-1 break-words"
          title={material.subject}
        >
          {material.subject}
        </p>

        {/* Description */}
        {material.description && (
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 line-clamp-2 leading-relaxed break-words">
            {material.description}
          </p>
        )}
      </div>

      {/* Metadata & Actions */}
      <div className="mt-5 pt-4 border-t border-slate-100 dark:border-slate-800">
        <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 mb-3.5">
          <span className="flex items-center gap-1 font-medium">
            <HardDrive className="w-3.5 h-3.5 text-slate-400" />
            {material.file_size}
          </span>
          <span className="flex items-center gap-1 font-medium">
            <Download className="w-3.5 h-3.5 text-slate-400" />
            {downloadCount} downloads
          </span>
          <span className="flex items-center gap-1">
            <Calendar className="w-3.5 h-3.5 text-slate-400" />
            {new Date(material.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-2">
          {isExternalLink ? (
            <button
              onClick={() => handleOpenDirectLink(material.file_url)}
              type="button"
              className="btn col-span-2 w-full py-2.5 px-3 rounded-xl text-xs font-bold shadow-xs cursor-pointer"
            >
              <ExternalLink className="sparkle w-3.5 h-3.5 text-amber-500" />
              <span className="text">{isDriveFolder ? 'Open in Google Drive' : 'Open in New Tab'}</span>
            </button>
          ) : isPreviewableFormat ? (
            canDownload ? (
              <>
                <button
                  onClick={() => onPreview && onPreview(material)}
                  type="button"
                  className="btn w-full py-2 px-3 rounded-xl text-xs font-semibold shadow-2xs cursor-pointer"
                >
                  <Eye className="sparkle w-3.5 h-3.5" />
                  <span className="text">{material.file_url?.startsWith('[') ? 'View Parts' : 'Preview'}</span>
                </button>
                <button
                  onClick={handleDownload}
                  disabled={downloading}
                  type="button"
                  className="btn w-full py-2 px-3 rounded-xl text-xs font-bold shadow-xs cursor-pointer disabled:opacity-50"
                >
                  {downloadSuccess ? (
                    <>
                      <CheckCircle2 className="sparkle w-3.5 h-3.5 text-emerald-400" />
                      <span className="text">Downloaded!</span>
                    </>
                  ) : downloading ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span className="text">Preparing...</span>
                    </>
                  ) : (
                    <>
                      <Download className="sparkle w-3.5 h-3.5" />
                      <span className="text">Download</span>
                    </>
                  )}
                </button>
              </>
            ) : (
              <button
                onClick={() => onPreview && onPreview(material)}
                type="button"
                className="btn col-span-2 w-full py-2 px-3 rounded-xl text-xs font-bold shadow-xs cursor-pointer"
              >
                <Eye className="sparkle w-3.5 h-3.5 text-amber-500" />
                <span className="text">{material.file_url?.startsWith('[') ? 'View Parts' : 'Preview Document'}</span>
              </button>
            )
          ) : canDownload ? (
            <button
              onClick={handleDownload}
              disabled={downloading}
              type="button"
              className="btn col-span-2 w-full py-2 px-3 rounded-xl text-xs font-bold shadow-xs cursor-pointer disabled:opacity-50"
            >
              {downloadSuccess ? (
                <>
                  <CheckCircle2 className="sparkle w-3.5 h-3.5 text-emerald-400" />
                  <span className="text">Downloaded!</span>
                </>
              ) : downloading ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span className="text">Preparing...</span>
                </>
              ) : (
                <>
                  <Download className="sparkle w-3.5 h-3.5" />
                  <span className="text">Download</span>
                </>
              )}
            </button>
          ) : (
            <button
              onClick={() => onPreview && onPreview(material)}
              type="button"
              className="btn col-span-2 w-full py-2 px-3 rounded-xl text-xs font-bold shadow-xs cursor-pointer"
            >
              <Eye className="sparkle w-3.5 h-3.5 text-amber-500" />
              <span className="text">Preview</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
