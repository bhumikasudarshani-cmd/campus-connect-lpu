'use client';

import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { 
  X, 
  Download, 
  ZoomIn, 
  ZoomOut, 
  RotateCw, 
  Maximize, 
  Minimize, 
  ChevronLeft, 
  ChevronRight,
  ShieldAlert,
  HardDrive,
  BookOpen,
  AlertTriangle,
  Layers,
  FileText,
  ExternalLink,
  Globe,
  Sun,
  Moon,
  Eye,
  FileArchive,
  Presentation,
  Maximize2,
  Minimize2
} from 'lucide-react';
import { Material } from '@/lib/db/types';
import { 
  isMaterialPreviewable, 
  parseFileSizeToMb, 
  getMaterialCategory, 
  getDrivePreviewUrl,
  isGoogleDriveFolder,
  MaterialCategory 
} from '@/lib/drive-service';
import { getMaterialFileFormat } from '@/components/MaterialCard';

interface DocumentViewerModalProps {
  material: Material | null;
  allowDownloads: boolean;
  isAdminOrOwner: boolean;
  onClose: () => void;
  onDownload?: (material: Material) => void;
}

/**
 * Individual PDF Page renderer
 * Renders on a canvas when intersecting (near the viewport),
 * or displays a lightweight placeholder with exact dimensions when far away.
 */
interface PdfPageItemProps {
  pageNumber: number;
  pdfDoc: any;
  scale: number;
  rotation: number;
  baseWidth: number;
  baseHeight: number;
  readingFilterStyle: string;
  isIntersecting: boolean;
}

const PdfPageItem = React.memo(function PdfPageItem({
  pageNumber,
  pdfDoc,
  scale,
  rotation,
  baseWidth,
  baseHeight,
  readingFilterStyle,
  isIntersecting,
}: PdfPageItemProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const renderTaskRef = useRef<any>(null);
  const [isRendered, setIsRendered] = useState<boolean>(false);

  // When rotation is 90 or 270, width and height swap
  const isRotated = rotation === 90 || rotation === 270;
  const unscaledW = isRotated ? baseHeight : baseWidth;
  const unscaledH = isRotated ? baseWidth : baseHeight;
  const pageWidth = Math.max(100, Math.floor(unscaledW * scale));
  const pageHeight = Math.max(100, Math.floor(unscaledH * scale));

  useEffect(() => {
    if (!isIntersecting || !pdfDoc) return;
    let isCancelled = false;

    const renderPage = async () => {
      try {
        if (renderTaskRef.current) {
          renderTaskRef.current.cancel();
        }

        const page = await pdfDoc.getPage(pageNumber);
        if (isCancelled) return;

        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const viewport = page.getViewport({ scale, rotation });
        const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);

        canvas.width = Math.floor(viewport.width * pixelRatio);
        canvas.height = Math.floor(viewport.height * pixelRatio);
        canvas.style.width = `${Math.floor(viewport.width)}px`;
        canvas.style.height = `${Math.floor(viewport.height)}px`;

        ctx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);

        const task = page.render({
          canvasContext: ctx,
          viewport: viewport,
        });

        renderTaskRef.current = task;
        await task.promise;
        if (!isCancelled) {
          setIsRendered(true);
        }
      } catch (err: any) {
        if (err?.name === 'RenderingCancelledException') return;
        console.warn(`Render notice on page ${pageNumber}:`, err);
      }
    };

    renderPage();

    return () => {
      isCancelled = true;
      if (renderTaskRef.current) {
        renderTaskRef.current.cancel();
      }
    };
  }, [isIntersecting, pdfDoc, pageNumber, scale, rotation]);

  return (
    <div
      id={`pdf-page-${pageNumber}`}
      data-page-number={pageNumber}
      className="relative bg-white shadow-2xl rounded-sm sm:rounded-md transition-shadow shrink-0 select-none mx-auto overflow-hidden border border-slate-700/30"
      style={{
        width: `${pageWidth}px`,
        height: `${pageHeight}px`,
        filter: readingFilterStyle,
      }}
    >
      {isIntersecting ? (
        <>
          <canvas
            ref={canvasRef}
            className={`w-full h-full block transition-opacity duration-150 ${
              isRendered ? 'opacity-100' : 'opacity-0'
            }`}
          />
          {!isRendered && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-900/5 text-slate-400">
              <div className="w-6 h-6 border-2 border-lpu-500 border-t-transparent rounded-full animate-spin mb-2" />
              <span className="text-[11px] font-mono text-slate-500 font-semibold">Page {pageNumber}</span>
            </div>
          )}
        </>
      ) : (
        <div className="w-full h-full flex flex-col items-center justify-center bg-slate-900/5 text-slate-400">
          <span className="text-xs font-mono text-slate-400 font-semibold">Page {pageNumber}</span>
        </div>
      )}
    </div>
  );
});

// ==========================================
// High-Performance PDF.js Module Singleton
// Loads local /pdf.min.js and /pdf.worker.min.js immediately with zero CDN latency
// ==========================================
let pdfjsPromise: Promise<any> | null = null;

function getOrLoadPdfJs(): Promise<any> {
  if (typeof window === 'undefined') {
    return Promise.reject(new Error('Window undefined'));
  }

  // Already loaded and attached to window?
  if ((window as any).pdfjsLib) {
    const lib = (window as any).pdfjsLib;
    if (lib.GlobalWorkerOptions && !lib.GlobalWorkerOptions.workerSrc) {
      lib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.js';
    }
    return Promise.resolve(lib);
  }

  if (pdfjsPromise) {
    return pdfjsPromise;
  }

  pdfjsPromise = new Promise((resolve, reject) => {
    const setupWorkerAndResolve = (lib: any) => {
      try {
        if (lib && lib.GlobalWorkerOptions) {
          lib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.js';
        }
      } catch (e) {
        console.warn('Worker configuration notice:', e);
      }
      resolve(lib);
    };

    if ((window as any).pdfjsLib) {
      return setupWorkerAndResolve((window as any).pdfjsLib);
    }

    const existing = document.getElementById('pdfjs-dist-script') as HTMLScriptElement;
    if (existing) {
      let attempts = 0;
      const interval = setInterval(() => {
        attempts++;
        if ((window as any).pdfjsLib) {
          clearInterval(interval);
          setupWorkerAndResolve((window as any).pdfjsLib);
        } else if (attempts > 50) {
          clearInterval(interval);
          reject(new Error('Timeout waiting for pdfjsLib'));
        }
      }, 50);
      return;
    }

    // Try same-origin local script first: fastest load, zero DNS/TLS roundtrip
    const script = document.createElement('script');
    script.id = 'pdfjs-dist-script';
    script.src = '/pdf.min.js';
    script.async = true;

    script.onload = () => {
      const lib = (window as any).pdfjsLib;
      if (lib) {
        setupWorkerAndResolve(lib);
      } else {
        reject(new Error('pdfjsLib not defined after local script load'));
      }
    };

    script.onerror = () => {
      console.warn('Local pdf.min.js failed to load, falling back to CDN');
      const cdnScript = document.createElement('script');
      cdnScript.id = 'pdfjs-cdn-script';
      cdnScript.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
      cdnScript.async = true;
      cdnScript.onload = () => {
        const lib = (window as any).pdfjsLib;
        if (lib) {
          if (lib.GlobalWorkerOptions) {
            lib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
          }
          resolve(lib);
        } else {
          reject(new Error('pdfjsLib not defined after CDN fallback'));
        }
      };
      cdnScript.onerror = reject;
      document.head.appendChild(cdnScript);
    };

    document.head.appendChild(script);
  });

  return pdfjsPromise;
}

// Warm up PDF.js in the background on browser idle so it is already parsed before user opens a document
if (typeof window !== 'undefined') {
  if ('requestIdleCallback' in window) {
    (window as any).requestIdleCallback(() => {
      getOrLoadPdfJs().catch(() => {});
    });
  } else {
    setTimeout(() => {
      getOrLoadPdfJs().catch(() => {});
    }, 200);
  }
}

// ==========================================
// In-Memory Document Buffer Cache
// Stores recently downloaded ArrayBuffers to eliminate duplicate fetches
// ==========================================
interface CachedDoc {
  buffer: ArrayBuffer;
  contentType: string;
}

const documentCache = new Map<string, CachedDoc>();
const MAX_CACHED_DOCS = 6;

function getCachedDoc(key: string): CachedDoc | null {
  return documentCache.get(key) || null;
}

function setCachedDoc(key: string, data: CachedDoc): void {
  if (documentCache.size >= MAX_CACHED_DOCS) {
    const firstKey = documentCache.keys().next().value;
    if (firstKey) documentCache.delete(firstKey);
  }
  documentCache.set(key, data);
}

export default function DocumentViewerModal({
  material,
  allowDownloads,
  isAdminOrOwner,
  onClose,
  onDownload,
}: DocumentViewerModalProps) {
  // Zoom & Display Controls
  const [zoomLevel, setZoomLevel] = useState<number>(100);
  const [debouncedZoom, setDebouncedZoom] = useState<number>(100);
  const [rotation, setRotation] = useState<number>(0);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [isFocusMode, setIsFocusMode] = useState<boolean>(false);
  const [isPinching, setIsPinching] = useState<boolean>(false);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [pageInputValue, setPageInputValue] = useState<string>('1');
  const [readingMode, setReadingMode] = useState<'normal' | 'dark' | 'sepia'>('normal');
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // PDF Document & Page Dimensions
  const [pdfDoc, setPdfDoc] = useState<any>(null);
  const [basePageDims, setBasePageDims] = useState<{ width: number; height: number } | null>(null);
  const [visiblePages, setVisiblePages] = useState<Set<number>>(new Set([1]));

  // Non-PDF / Fallback Previews
  const [previewBlobUrl, setPreviewBlobUrl] = useState<string | null>(null);
  const [driveEmbedUrl, setDriveEmbedUrl] = useState<string | null>(null);
  const [isImageType, setIsImageType] = useState<boolean>(false);
  const [isArchiveType, setIsArchiveType] = useState<boolean>(false);
  const [externalLinkUrl, setExternalLinkUrl] = useState<string | null>(null);
  const [isDriveResource, setIsDriveResource] = useState<boolean>(false);
  const [activeFileIndex, setActiveFileIndex] = useState<number>(0);

  // References
  const viewerContainerRef = useRef<HTMLDivElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);
  const currentPageRef = useRef<number>(currentPage);
  const totalPagesRef = useRef<number>(totalPages);
  const zoomLevelRef = useRef<number>(zoomLevel);
  const prevZoomRef = useRef<number>(zoomLevel);
  const initialTouchDistRef = useRef<number>(0);
  const initialTouchZoomRef = useRef<number>(100);
  const isPinchingRef = useRef<boolean>(false);
  const lastLoadedKeyRef = useRef<string>('');

  useEffect(() => {
    currentPageRef.current = currentPage;
    setPageInputValue(currentPage.toString());
  }, [currentPage]);

  useEffect(() => {
    totalPagesRef.current = totalPages;
  }, [totalPages]);

  useEffect(() => {
    zoomLevelRef.current = zoomLevel;
  }, [zoomLevel]);

  // Debounce zoom level for PDF.js vector re-rendering (smooth 60fps pinch, sharp final render)
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedZoom(zoomLevel);
    }, 150);
    return () => clearTimeout(handler);
  }, [zoomLevel]);

  // Reading modes (Normal, Dark Invert, Sepia)
  const cycleReadingMode = () => {
    setReadingMode((prev) => (prev === 'normal' ? 'dark' : prev === 'dark' ? 'sepia' : 'normal'));
  };

  const readingFilterStyle = readingMode === 'dark'
    ? 'invert(90%) hue-rotate(180deg) contrast(110%) brightness(95%)'
    : readingMode === 'sepia'
      ? 'sepia(45%) contrast(98%) brightness(96%)'
      : 'none';

  // Multi-PDF / Multi-part files bundle support
  const multiFiles: { title?: string; name?: string; url: string; size?: string; drive_file_id?: string }[] = useMemo(() => {
    if (!material?.file_url?.startsWith('[')) return [];
    try {
      const parsed = JSON.parse(material.file_url);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }, [material?.file_url]);

  useEffect(() => {
    setActiveFileIndex(0);
    setReadingMode('normal');
    if (material?.id) {
      // Record open event in user material open history
      fetch('/api/materials/history', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ materialId: material.id }),
      }).catch((err) => {
        console.warn('Could not record material open history:', err);
      });
    }
  }, [material?.id]);

  // Prevent background scroll and mobile viewport shifting when modal is open
  useEffect(() => {
    if (!material) return;

    const scrollY = window.scrollY;
    const originalOverflow = document.body.style.overflow;
    const originalPosition = document.body.style.position;
    const originalTop = document.body.style.top;
    const originalWidth = document.body.style.width;

    document.body.style.overflow = 'hidden';
    document.body.style.position = 'fixed';
    document.body.style.top = `-${scrollY}px`;
    document.body.style.width = '100%';

    return () => {
      document.body.style.overflow = originalOverflow;
      document.body.style.position = originalPosition;
      document.body.style.top = originalTop;
      document.body.style.width = originalWidth;
      window.scrollTo(0, scrollY);
    };
  }, [material]);

  // Global access control settings
  const [serverAllowDownloads, setServerAllowDownloads] = useState<boolean | null>(() => {
    if (typeof window !== 'undefined' && document.cookie) {
      if (document.cookie.includes('cc_allow_dl=false')) return false;
      if (document.cookie.includes('cc_allow_dl=true')) return true;
    }
    return null;
  });

  useEffect(() => {
    let isMounted = true;
    async function syncGlobalSettings() {
      try {
        const res = await fetch('/api/admin/settings', { cache: 'no-store' });
        if (res.ok) {
          const data = await res.json();
          if (isMounted && data.settings && typeof data.settings.allow_user_downloads === 'boolean') {
            setServerAllowDownloads(data.settings.allow_user_downloads);
          }
        }
      } catch (err) {
        console.warn('Could not sync global download setting:', err);
      }
    }
    syncGlobalSettings();
    return () => {
      isMounted = false;
    };
  }, [material?.id]);

  // Active file details
  const activeFile = multiFiles[activeFileIndex] || null;
  const activeFileName = activeFile?.title || activeFile?.name || material?.file_name || material?.title || '';
  const activeFileUrl = activeFile?.url || material?.file_url || '';
  const activeFileSizeStr = activeFile?.size || material?.file_size || '';

  // Helper to extract Google Drive file or folder IDs
  const extractDriveId = useCallback((url: string | null | undefined): string | null => {
    if (!url || typeof url !== 'string') return null;
    const clean = url.trim();
    if (activeFile?.drive_file_id) return activeFile.drive_file_id;
    const m1 = clean.match(/[?&]id=([a-zA-Z0-9_-]{25,})/);
    if (m1) return m1[1];
    const m2 = clean.match(/\/file\/d\/([a-zA-Z0-9_-]{25,})/);
    if (m2) return m2[1];
    const m3 = clean.match(/\/d\/([a-zA-Z0-9_-]{25,})/);
    if (m3) return m3[1];
    const m4 = clean.match(/\/folders\/([a-zA-Z0-9_-]{25,})/);
    if (m4) return m4[1];
    if (/^[a-zA-Z0-9_-]{28,45}$/.test(clean)) return clean;
    return null;
  }, [activeFile?.drive_file_id]);

  const isPreviewable = useMemo(() => {
    if (!material) return true;
    if (isArchiveType) return false;
    const cat = getMaterialCategory({
      file_name: activeFileName,
      file_url: activeFileUrl,
      title: material.title,
      mime_type: material.mime_type,
      material_type: material.material_type,
      file_size: activeFileSizeStr,
    });
    if (cat === 'PDF' || cat === 'IMAGE') return true;
    if (cat === 'PPT') {
      const driveId = activeFile?.drive_file_id || extractDriveId(activeFileUrl || material.file_url);
      return Boolean(driveId || driveEmbedUrl);
    }
    return false;
  }, [material, isArchiveType, activeFileName, activeFileUrl, activeFileSizeStr, activeFile?.drive_file_id, extractDriveId, driveEmbedUrl]);

  const fileFormat = useMemo(() => {
    return material ? getMaterialFileFormat({
      file_name: activeFileName,
      file_url: activeFileUrl,
      mime_type: material.mime_type
    }) : { type: 'pdf' as const, label: 'PDF', ext: '.pdf', icon: FileText, badgeClass: '' };
  }, [material, activeFileName, activeFileUrl]);

  const isGlobalDownloadsEnabled = serverAllowDownloads !== null 
    ? serverAllowDownloads 
    : (allowDownloads === false ? false : Boolean(allowDownloads));

  // STRICT ACCESS CONTROL: When downloads are globally off, NO download is allowed and NO download button is rendered for students. Admins/owners retain full access.
  const canDownload = Boolean(isAdminOrOwner || isGlobalDownloadsEnabled);

  // Robust, authorized download handler strictly routed through server-side access control
  const handleDownloadActiveFile = useCallback((e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation();
      e.preventDefault();
    }
    if (!material) return;
    if (!canDownload && isPreviewable) return;

    if (onDownload) {
      try {
        onDownload(material);
      } catch (err) {
        console.warn('onDownload callback error:', err);
      }
    }

    const currentUrl = activeFileUrl || material.file_url || '';

    // If external link resource, open in new tab
    const category = getMaterialCategory({
      file_url: currentUrl,
      file_name: activeFileName,
      title: material.title,
      mime_type: material.mime_type,
      material_type: material.material_type,
      file_size: activeFileSizeStr,
    });

    if (category === 'EXTERNAL_LINK') {
      window.open(currentUrl, '_blank', 'noopener,noreferrer');
      fetch(`/api/materials/${material.id}/download?fileIndex=${activeFileIndex}&json=true`).catch(() => {});
      return;
    }

    // All uploaded materials MUST go through server-side authorized download endpoint
    const dlQuery = multiFiles.length > 0 ? `?fileIndex=${activeFileIndex}` : '';
    const downloadEndpoint = `/api/materials/${material.id}/download${dlQuery}`;

    const link = document.createElement('a');
    link.href = downloadEndpoint;
    const cleanTitle = (activeFileName || material.title || 'document').replace(/[^a-zA-Z0-9_.-]/g, '_').slice(0, 40);
    link.setAttribute('download', `${material.subject_code || 'study'}_${cleanTitle}`);
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    document.body.appendChild(link);
    link.click();
    setTimeout(() => {
      if (document.body.contains(link)) {
        document.body.removeChild(link);
      }
    }, 250);
  }, [material, canDownload, onDownload, activeFileUrl, activeFileName, activeFileSizeStr, multiFiles.length, activeFileIndex]);

  const handleOpenSourceLink = useCallback((e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation();
      e.preventDefault();
    }
    if (externalLinkUrl && externalLinkUrl.startsWith('http')) {
      window.open(externalLinkUrl, '_blank', 'noopener,noreferrer');
    }
  }, [externalLinkUrl]);

  // Fullscreen support
  useEffect(() => {
    const handleFullscreenChange = () => {
      const isFull = Boolean(document.fullscreenElement);
      setIsFullscreen(isFull);
      if (!isFull) {
        setIsFocusMode(false);
      }
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, []);

  const toggleViewerFullscreen = () => {
    setIsFocusMode((prev) => !prev);
    if (!viewerContainerRef.current) return;

    if (!document.fullscreenElement) {
      viewerContainerRef.current.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  };

  // Zoom handlers
  const handleZoomIn = () => {
    setZoomLevel((prev) => Math.min(prev + 25, 350));
  };

  const handleZoomOut = () => {
    setZoomLevel((prev) => Math.max(prev - 25, 50));
  };

  const handleResetZoom = () => {
    setZoomLevel(100);
  };

  const handleRotate = () => {
    setRotation((prev) => (prev + 90) % 360);
  };

  // Smooth scroll to a specific page
  const scrollToPage = useCallback((pageNum: number) => {
    const targetNum = Math.min(Math.max(pageNum, 1), totalPagesRef.current);
    const el = document.getElementById(`pdf-page-${targetNum}`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, []);

  const handlePrevPage = () => {
    scrollToPage(currentPage - 1);
  };

  const handleNextPage = () => {
    scrollToPage(currentPage + 1);
  };

  // Fit to Width calculation
  const handleFitWidth = () => {
    if (!basePageDims || !viewportRef.current) return;
    const containerW = viewportRef.current.clientWidth;
    const isMobile = typeof window !== 'undefined' && window.innerWidth < 640;
    const targetW = containerW - (isMobile ? 16 : 48);
    const isRot = rotation === 90 || rotation === 270;
    const pageW = isRot ? basePageDims.height : basePageDims.width;
    const baseW = isMobile ? Math.max(300, Math.min(containerW - 16, 750)) : Math.max(500, Math.min(containerW - 48, 850));
    const baseScale = baseW / pageW;
    const neededScale = targetW / pageW;
    const calculatedZoom = Math.round((neededScale / baseScale) * 100);
    setZoomLevel(Math.min(Math.max(calculatedZoom, 50), 350));
  };

  // Fit to Page calculation
  const handleFitPage = () => {
    if (!basePageDims || !viewportRef.current) return;
    const containerW = viewportRef.current.clientWidth;
    const containerH = viewportRef.current.clientHeight;
    const isMobile = typeof window !== 'undefined' && window.innerWidth < 640;
    const targetW = containerW - (isMobile ? 16 : 48);
    const targetH = containerH - 64;
    const isRot = rotation === 90 || rotation === 270;
    const pageW = isRot ? basePageDims.height : basePageDims.width;
    const pageH = isRot ? basePageDims.width : basePageDims.height;
    const baseW = isMobile ? Math.max(300, Math.min(containerW - 16, 750)) : Math.max(500, Math.min(containerW - 48, 850));
    const baseScale = baseW / pageW;
    const scaleW = targetW / pageW;
    const scaleH = targetH / pageH;
    const neededScale = Math.min(scaleW, scaleH);
    const calculatedZoom = Math.round((neededScale / baseScale) * 100);
    setZoomLevel(Math.min(Math.max(calculatedZoom, 50), 350));
  };

  // Preserve reading position on zoom changes (keeps the visible page centered, never jumps to page 1)
  useEffect(() => {
    const container = viewportRef.current;
    if (!container || prevZoomRef.current === zoomLevel) return;

    const prevScrollTop = container.scrollTop;
    const prevScrollHeight = container.scrollHeight;
    const scrollRatio = prevScrollHeight > 0 
      ? (prevScrollTop + container.clientHeight / 2) / prevScrollHeight 
      : 0;

    prevZoomRef.current = zoomLevel;

    requestAnimationFrame(() => {
      if (container && container.scrollHeight > 0) {
        container.scrollTop = scrollRatio * container.scrollHeight - container.clientHeight / 2;
      }
    });
  }, [zoomLevel]);

  // Keyboard navigation shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target?.tagName === 'INPUT' || target?.tagName === 'TEXTAREA') return;

      if ((e.ctrlKey || e.metaKey) && (e.key.toLowerCase() === 's' || e.key.toLowerCase() === 'p') && !canDownload) {
        e.preventDefault();
        return;
      }

      if (e.key === 'Escape') {
        if (document.fullscreenElement) {
          document.exitFullscreen().catch(() => {});
        } else {
          onClose();
        }
      } else if (e.key === 'ArrowRight' || e.key === 'PageDown' || e.key.toLowerCase() === 'k') {
        e.preventDefault();
        scrollToPage(currentPageRef.current + 1);
      } else if (e.key === 'ArrowLeft' || e.key === 'PageUp' || e.key.toLowerCase() === 'j') {
        e.preventDefault();
        scrollToPage(currentPageRef.current - 1);
      } else if (e.key === '+' || e.key === '=') {
        e.preventDefault();
        handleZoomIn();
      } else if (e.key === '-' || e.key === '_') {
        e.preventDefault();
        handleZoomOut();
      } else if (e.key === '0') {
        e.preventDefault();
        handleResetZoom();
      } else if (e.key.toLowerCase() === 'f') {
        e.preventDefault();
        toggleViewerFullscreen();
      } else if (e.key.toLowerCase() === 'r') {
        e.preventDefault();
        handleRotate();
      } else if (e.key.toLowerCase() === 'd') {
        e.preventDefault();
        cycleReadingMode();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose, scrollToPage]);

  // Load document binary stream into PDF.js or image viewer
  useEffect(() => {
    if (!material) return;

    const currentDocKey = `${material.id}_${activeFileIndex}_${activeFileUrl}`;

    // Prevent redundant reload if this exact document part is already active and loaded
    if (lastLoadedKeyRef.current === currentDocKey && (pdfDoc || driveEmbedUrl || externalLinkUrl || previewBlobUrl)) {
      return;
    }

    let isCancelled = false;
    let localBlobUrl: string | null = null;
    const abortController = new AbortController();

    // 15-second safety timeout to prevent getting stuck indefinitely on an infinite spinner
    const timeoutId = setTimeout(() => {
      abortController.abort();
    }, 15000);

    setLoading(true);
    setError(null);
    setPdfDoc(null);
    setBasePageDims(null);
    setDriveEmbedUrl(null);
    setExternalLinkUrl(null);
    setIsDriveResource(false);
    setIsArchiveType(false);
    setIsImageType(false);
    setCurrentPage(1);
    setTotalPages(1);

    const loadDocument = async () => {
      try {
        const targetUrl = activeFileUrl || material.file_url || '';
        const driveId = activeFile?.drive_file_id || extractDriveId(targetUrl);

        const category = getMaterialCategory({
          file_url: targetUrl,
          file_name: activeFileName,
          title: material.title,
          mime_type: material.mime_type,
          material_type: material.material_type,
          file_size: activeFileSizeStr,
        });

        // 1. External Links: YouTube, GfG, Google Drive folders, Resource Links
        if (category === 'EXTERNAL_LINK') {
          clearTimeout(timeoutId);
          setExternalLinkUrl(targetUrl);
          if (isGoogleDriveFolder(targetUrl)) {
            setIsDriveResource(true);
          }
          lastLoadedKeyRef.current = currentDocKey;
          setLoading(false);
          return;
        }

        // 2. PPT / PPTX: Presentation slides
        if (category === 'PPT') {
          clearTimeout(timeoutId);
          if (driveId) {
            setDriveEmbedUrl(getDrivePreviewUrl(driveId));
          }
          lastLoadedKeyRef.current = currentDocKey;
          setLoading(false);
          return;
        }

        // 3. Non-Previewables: ZIP, RAR, 7Z, and unsupported documents
        // Instantly unblock viewer with native clean card (0ms, zero network delay)
        if (category === 'ARCHIVE' || category === 'OTHER') {
          clearTimeout(timeoutId);
          if (category === 'ARCHIVE') setIsArchiveType(true);
          lastLoadedKeyRef.current = currentDocKey;
          setLoading(false);
          return;
        }

        // 4. Images: Render in image viewer
        if (category === 'IMAGE') {
          clearTimeout(timeoutId);
          setIsImageType(true);
          const previewQuery = multiFiles.length > 0 
            ? `?fileIndex=${activeFileIndex}&stream=true` 
            : '?stream=true';
          setPreviewBlobUrl(`/api/materials/${material.id}/preview${previewQuery}`);
          lastLoadedKeyRef.current = currentDocKey;
          setLoading(false);
          return;
        }

        // 4. PDFs: Stream and render via PDF.js Canvas
        const cached = getCachedDoc(currentDocKey);
        let arrayBuffer: ArrayBuffer;
        let contentType = '';

        // Concurrent initialization of PDF.js
        const pdfInitPromise = getOrLoadPdfJs();

        if (cached) {
          clearTimeout(timeoutId);
          arrayBuffer = cached.buffer;
          contentType = cached.contentType;
        } else {
          const previewQuery = multiFiles.length > 0 
            ? `?fileIndex=${activeFileIndex}&stream=true` 
            : '?stream=true';

          const response = await fetch(`/api/materials/${material.id}/preview${previewQuery}`, {
            credentials: 'include',
            signal: abortController.signal,
          });

          clearTimeout(timeoutId);
          if (isCancelled) return;

          if (!response.ok) {
            throw new Error(`Failed to load document: HTTP ${response.status}`);
          }

          contentType = response.headers.get('content-type') || '';
          arrayBuffer = await response.arrayBuffer();
          if (isCancelled) return;

          setCachedDoc(currentDocKey, { buffer: arrayBuffer, contentType });
        }

        // Inspect magic bytes: detect if file is actually an archive or container
        const uint8 = new Uint8Array(arrayBuffer.slice(0, 8));
        const isPdfMagic = uint8[0] === 0x25 && uint8[1] === 0x50 && uint8[2] === 0x44 && uint8[3] === 0x46; // %PDF
        const isZipMagic = uint8[0] === 0x50 && uint8[1] === 0x4B; // PK (ZIP / Office)
        const isRarMagic = uint8[0] === 0x52 && uint8[1] === 0x61 && uint8[2] === 0x72; // Rar!
        const is7zMagic = uint8[0] === 0x37 && uint8[1] === 0x7A && uint8[2] === 0xBC; // 7z

        if (isZipMagic || isRarMagic || is7zMagic || (!isPdfMagic && !contentType.includes('pdf'))) {
          setIsArchiveType(true);
          lastLoadedKeyRef.current = currentDocKey;
          setLoading(false);
          return;
        }

        // Decode PDF with PDF.js
        try {
          const pdfjsLib = await pdfInitPromise;
          if (isCancelled) return;

          const loadingTask = pdfjsLib.getDocument({
            data: new Uint8Array(arrayBuffer),
            cMapUrl: 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/cmaps/',
            cMapPacked: true,
            standardFontDataUrl: 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/standard_fonts/',
          });

          const doc = await loadingTask.promise;
          if (isCancelled) return;

          // Unblock viewer immediately! First page renders ASAP!
          lastLoadedKeyRef.current = currentDocKey;
          setPdfDoc(doc);
          setTotalPages(doc.numPages || 1);
          setLoading(false);

          doc.getPage(1).then((firstPage: any) => {
            if (!isCancelled) {
              const initialViewport = firstPage.getViewport({ scale: 1, rotation: 0 });
              setBasePageDims({
                width: initialViewport.width || 595.28,
                height: initialViewport.height || 841.89,
              });
            }
          }).catch((dimErr: any) => {
            console.warn('Page 1 dimension extraction notice:', dimErr);
          });

          return;
        } catch (pdfErr) {
          console.warn('PDF.js binary decode notice:', pdfErr);
          setError('Could not decode document preview.');
          setLoading(false);
          return;
        }
      } catch (err: any) {
        clearTimeout(timeoutId);
        if (isCancelled) return;

        console.error('Error loading document preview:', err);
        const isTimeout = err?.name === 'AbortError';
        setError(
          isTimeout
            ? 'Document loading timed out. Please try again.'
            : 'Failed to load document preview. Please try again.'
        );
        setLoading(false);
      }
    };

    loadDocument();

    return () => {
      isCancelled = true;
      clearTimeout(timeoutId);
      abortController.abort();
      if (localBlobUrl) {
        URL.revokeObjectURL(localBlobUrl);
      }
    };
  }, [material?.id, activeFileIndex, activeFileUrl]);

  // Automatic Current Page Detection on Scroll
  const handleViewportScroll = useCallback(() => {
    const container = viewportRef.current;
    if (!container || totalPagesRef.current <= 1) return;

    const targetY = container.scrollTop + container.clientHeight * 0.35;
    const pageElements = container.querySelectorAll('[data-page-number]');
    let bestPage = currentPageRef.current;
    let minDistance = Infinity;

    pageElements.forEach((el) => {
      const pageNum = parseInt(el.getAttribute('data-page-number') || '1', 10);
      const htmlEl = el as HTMLElement;
      const top = htmlEl.offsetTop;
      const bottom = top + htmlEl.offsetHeight;

      if (targetY >= top && targetY <= bottom) {
        bestPage = pageNum;
        minDistance = 0;
      } else {
        const dist = Math.min(Math.abs(top - targetY), Math.abs(bottom - targetY));
        if (dist < minDistance) {
          minDistance = dist;
          bestPage = pageNum;
        }
      }
    });

    if (bestPage !== currentPageRef.current) {
      currentPageRef.current = bestPage;
      setCurrentPage(bestPage);
      setPageInputValue(bestPage.toString());
    }
  }, []);

  // IntersectionObserver for Virtualized Lazy Page Rendering
  // Preloads pages within 800px margin (approx 1-2 pages ahead) and unmounts distant pages to conserve GPU memory
  useEffect(() => {
    const container = viewportRef.current;
    if (!container || !pdfDoc) return;

    const observer = new IntersectionObserver(
      (entries) => {
        setVisiblePages((prev) => {
          const next = new Set(prev);
          entries.forEach((entry) => {
            const pageNum = parseInt(entry.target.getAttribute('data-page-number') || '1', 10);
            if (entry.isIntersecting) {
              next.add(pageNum);
            } else {
              next.delete(pageNum);
            }
          });
          return next;
        });
      },
      {
        root: container,
        rootMargin: '800px 0px 800px 0px',
        threshold: 0,
      }
    );

    const pageElements = container.querySelectorAll('[data-page-number]');
    pageElements.forEach((el) => observer.observe(el));

    return () => {
      observer.disconnect();
    };
  }, [pdfDoc, totalPages, debouncedZoom, rotation]);

  // Touch & Gesture Interaction (1-Finger Scroll, 2-Finger Pinch Zoom, Alt+Wheel Zoom)
  useEffect(() => {
    if (!material) return;
    const container = viewerContainerRef.current;
    const viewport = viewportRef.current;
    if (!container || !viewport) return;

    // Alt + Mouse Wheel Zoom
    const handleWheel = (e: WheelEvent) => {
      if (e.altKey) {
        e.preventDefault();
        const zoomDelta = -e.deltaY * 0.45;
        setZoomLevel((prev) => {
          const next = Math.round(prev + zoomDelta);
          return Math.min(Math.max(next, 50), 350);
        });
      }
    };

    // Safari / iOS Trackpad Gestures
    let gestureStartZoom = 100;
    const handleGestureStart = (e: any) => {
      e.preventDefault();
      gestureStartZoom = zoomLevelRef.current;
    };
    const handleGestureChange = (e: any) => {
      e.preventDefault();
      if (e.scale) {
        const next = Math.round(gestureStartZoom * e.scale);
        setZoomLevel(Math.min(Math.max(next, 50), 350));
      }
    };

    // Mobile Touch: 2-Finger Pinch Zoom (Continuous & Natural) and Double-Tap Zoom
    let lastTapTime = 0;
    let singleTouchStart: { x: number; y: number; time: number } | null = null;

    const handleTouchStart = (e: TouchEvent) => {
      if (e.touches.length >= 2) {
        isPinchingRef.current = true;
        setIsPinching(true);
        singleTouchStart = null;
        initialTouchDistRef.current = Math.hypot(
          e.touches[0].clientX - e.touches[1].clientX,
          e.touches[0].clientY - e.touches[1].clientY
        );
        initialTouchZoomRef.current = zoomLevelRef.current;
      } else if (e.touches.length === 1) {
        isPinchingRef.current = false;
        setIsPinching(false);
        initialTouchDistRef.current = 0;
        singleTouchStart = {
          x: e.touches[0].clientX,
          y: e.touches[0].clientY,
          time: Date.now(),
        };
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (e.touches.length >= 2) {
        // Prevent browser viewport scaling or page bouncing
        if (e.cancelable) e.preventDefault();
        const currentDist = Math.hypot(
          e.touches[0].clientX - e.touches[1].clientX,
          e.touches[0].clientY - e.touches[1].clientY
        );
        if (initialTouchDistRef.current <= 0) {
          initialTouchDistRef.current = currentDist;
          initialTouchZoomRef.current = zoomLevelRef.current;
          setIsPinching(true);
        } else if (currentDist > 0) {
          const factor = currentDist / initialTouchDistRef.current;
          const rawZoom = Math.round(initialTouchZoomRef.current * factor);
          const nextZoom = Math.min(Math.max(rawZoom, 50), 350);
          setZoomLevel(nextZoom);
        }
      }
    };

    const handleTouchEnd = (e: TouchEvent) => {
      if (e.touches.length < 2) {
        isPinchingRef.current = false;
        setIsPinching(false);
        initialTouchDistRef.current = 0;
      }

      // Quick double tap to toggle zoom between 100% and 175%
      if (singleTouchStart && e.changedTouches.length > 0 && e.touches.length === 0) {
        const touch = e.changedTouches[0];
        const dx = touch.clientX - singleTouchStart.x;
        const dy = touch.clientY - singleTouchStart.y;
        const duration = Date.now() - singleTouchStart.time;
        singleTouchStart = null;

        const now = Date.now();
        if (Math.abs(dx) < 15 && Math.abs(dy) < 15 && duration < 300) {
          if (now - lastTapTime < 350) {
            setZoomLevel((prev) => (prev > 100 ? 100 : 175));
            lastTapTime = 0;
          } else {
            lastTapTime = now;
          }
        }
      }
    };

    viewport.addEventListener('wheel', handleWheel, { passive: false });
    viewport.addEventListener('gesturestart', handleGestureStart as any, { passive: false } as any);
    viewport.addEventListener('gesturechange', handleGestureChange as any, { passive: false } as any);
    viewport.addEventListener('touchstart', handleTouchStart, { passive: true });
    window.addEventListener('touchmove', handleTouchMove, { passive: false });
    window.addEventListener('touchend', handleTouchEnd, { passive: true });

    return () => {
      viewport.removeEventListener('wheel', handleWheel);
      viewport.removeEventListener('gesturestart', handleGestureStart as any);
      viewport.removeEventListener('gesturechange', handleGestureChange as any);
      viewport.removeEventListener('touchstart', handleTouchStart);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleTouchEnd);
    };
  }, [material]);

  // Responsive scale calculations for continuous PDF pages
  const effectiveScale = useMemo(() => {
    const isMobile = typeof window !== 'undefined' && window.innerWidth < 640;
    const windowW = typeof window !== 'undefined' ? window.innerWidth : 800;
    const containerW = viewportRef.current?.clientWidth || windowW;
    const isRot = rotation === 90 || rotation === 270;
    const rawPageWidth = isRot 
      ? (basePageDims?.height || 841.89) 
      : (basePageDims?.width || 595.28);

    // Calculate base width that comfortably fills the container at 100% zoom
    const horizontalPadding = isMobile ? 16 : 48;
    const baseTargetWidth = isMobile
      ? Math.max(280, containerW - horizontalPadding)
      : Math.max(500, Math.min(containerW - horizontalPadding, 850));

    const baseScale = baseTargetWidth / rawPageWidth;
    return baseScale * (debouncedZoom / 100);
  }, [basePageDims, debouncedZoom, rotation]);

  if (!material) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-0 sm:p-4 md:p-6 bg-slate-950/95 backdrop-blur-xs overscroll-contain animate-in fade-in duration-200">
      
      {/* Document Viewer Container (Mobile edge-to-edge full screen, Desktop centered card) */}
      <div 
        ref={viewerContainerRef}
        className={`bg-slate-900 w-full max-w-full flex flex-col shadow-2xl overflow-hidden transition-all ${
          isFullscreen || isFocusMode
            ? 'h-full w-full rounded-none border-0' 
            : 'h-full sm:h-[94vh] sm:max-w-5xl rounded-none sm:rounded-2xl border-0 sm:border border-slate-800'
        }`}
      >
        
        {/* Top Control Header */}
        <div className={`px-2.5 sm:px-6 ${isFocusMode ? 'py-1.5 sm:py-2.5' : 'py-2 sm:py-3.5'} bg-slate-950 text-white flex items-center justify-between gap-1.5 sm:gap-2 border-b border-slate-800 shrink-0 transition-all`}>
          
          {/* Material Identity */}
          <div className="flex items-center gap-2 sm:gap-3 truncate min-w-0 max-w-[140px] xs:max-w-[200px] sm:max-w-md">
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-orange-500/20 text-orange-400 flex items-center justify-center shrink-0">
              <BookOpen className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </div>
            <div className="truncate min-w-0">
              <h3 className="font-bold text-xs sm:text-sm text-white truncate leading-tight">
                {material.title}
              </h3>
              <p className="text-[10px] sm:text-[11px] text-slate-400 truncate">
                {material.subject_code} • Year {material.year}
              </p>
            </div>
          </div>

          {/* Controls Bar */}
          <div className="flex items-center gap-1 sm:gap-2 shrink-0">
            {isPreviewable && (
              <>
                {/* Page Navigation Shortcut & Direct Page Jumper */}
                {totalPages > 1 && (
                  <div className="flex items-center bg-slate-800/80 rounded-xl px-1 py-0.5 border border-slate-700/60 text-xs">
                    <button
                      onClick={handlePrevPage}
                      disabled={currentPage <= 1}
                      className="p-1 text-slate-300 hover:text-white disabled:opacity-30 transition-colors"
                      title="Previous Page (Jump upward)"
                    >
                      <ChevronLeft className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                    </button>
                    <div className="flex items-center px-0.5 sm:px-1">
                      <input
                        type="number"
                        min={1}
                        max={totalPages}
                        value={pageInputValue}
                        onChange={(e) => setPageInputValue(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            const p = parseInt(pageInputValue, 10);
                            if (!isNaN(p) && p >= 1 && p <= totalPages) {
                              scrollToPage(p);
                              (e.target as HTMLInputElement).blur();
                            } else {
                              setPageInputValue(currentPage.toString());
                            }
                          }
                        }}
                        onBlur={() => {
                          const p = parseInt(pageInputValue, 10);
                          if (!isNaN(p) && p >= 1 && p <= totalPages) {
                            scrollToPage(p);
                          } else {
                            setPageInputValue(currentPage.toString());
                          }
                        }}
                        className="w-7 sm:w-9 py-0.5 text-center text-[10px] sm:text-[11px] font-mono font-bold bg-slate-900 border border-slate-700/80 rounded text-amber-400 focus:outline-none focus:border-amber-500 shadow-2xs"
                        title="Direct page jump: type number & press Enter"
                      />
                      <span className="pl-1 text-[10px] sm:text-[11px] font-mono text-slate-400 select-none">
                        /{totalPages}
                      </span>
                    </div>
                    <button
                      onClick={handleNextPage}
                      disabled={currentPage >= totalPages}
                      className="p-1 text-slate-300 hover:text-white disabled:opacity-30 transition-colors"
                      title="Next Page (Jump downward)"
                    >
                      <ChevronRight className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                    </button>
                  </div>
                )}

                {/* Zoom Controls */}
                <div className="flex items-center bg-slate-800/80 rounded-xl p-0.5 border border-slate-700/60 text-xs">
                  <button
                    onClick={handleZoomOut}
                    disabled={zoomLevel <= 50}
                    className="p-1 sm:p-1.5 text-slate-300 hover:text-white hover:bg-slate-700/80 rounded-lg disabled:opacity-40 transition-colors"
                    title="Zoom Out (-25%)"
                  >
                    <ZoomOut className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                  </button>
                  <button
                    onClick={handleResetZoom}
                    className="px-1.5 sm:px-2 py-0.5 sm:py-1 text-[10px] sm:text-[11px] font-mono text-slate-200 hover:text-white cursor-pointer select-none font-bold"
                    title="Click to reset zoom (100%)"
                  >
                    {zoomLevel}%
                  </button>
                  <button
                    onClick={handleZoomIn}
                    disabled={zoomLevel >= 350}
                    className="p-1 sm:p-1.5 text-slate-300 hover:text-white hover:bg-slate-700/80 rounded-lg disabled:opacity-40 transition-colors"
                    title="Zoom In (+25%)"
                  >
                    <ZoomIn className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                  </button>
                </div>

                {/* Fit to Width & Fit to Page Buttons (Desktop & Tablet) */}
                {pdfDoc && (
                  <div className="hidden lg:flex items-center bg-slate-800/80 rounded-xl p-0.5 border border-slate-700/60 text-xs gap-0.5">
                    <button
                      onClick={handleFitWidth}
                      className="px-2 py-1 text-[10px] font-bold text-slate-300 hover:text-white hover:bg-slate-700/80 rounded-lg transition-colors flex items-center gap-1"
                      title="Fit to Width"
                    >
                      <Maximize2 className="w-3 h-3 text-amber-400" />
                      <span>Fit Width</span>
                    </button>
                    <button
                      onClick={handleFitPage}
                      className="px-2 py-1 text-[10px] font-bold text-slate-300 hover:text-white hover:bg-slate-700/80 rounded-lg transition-colors flex items-center gap-1"
                      title="Fit to Page"
                    >
                      <Minimize2 className="w-3 h-3 text-amber-400" />
                      <span>Fit Page</span>
                    </button>
                  </div>
                )}

                {/* Reading Comfort Mode (Eye Care / Dark Invert / Warm Sepia) */}
                <button
                  onClick={cycleReadingMode}
                  className={`p-1.5 sm:p-2 rounded-xl border transition-all flex items-center gap-1 select-none ${
                    readingMode === 'dark'
                      ? 'bg-indigo-950/90 text-indigo-300 border-indigo-700/80 shadow-xs'
                      : readingMode === 'sepia'
                        ? 'bg-amber-950/90 text-amber-300 border-amber-700/80 shadow-xs'
                        : 'bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white border-slate-700/60'
                  }`}
                  title={`Reading Mode: ${readingMode.toUpperCase()} (Click or press 'D' to cycle Normal / Dark Invert / Sepia)`}
                >
                  {readingMode === 'dark' ? (
                    <Moon className="w-3.5 h-3.5 text-indigo-400" />
                  ) : readingMode === 'sepia' ? (
                    <Eye className="w-3.5 h-3.5 text-amber-400" />
                  ) : (
                    <Sun className="w-3.5 h-3.5 text-slate-300" />
                  )}
                  <span className="hidden xl:inline text-[10px] font-bold tracking-tight">
                    {readingMode === 'dark' ? 'Dark' : readingMode === 'sepia' ? 'Sepia' : 'Normal'}
                  </span>
                </button>

                {/* Rotation Control */}
                <button
                  onClick={handleRotate}
                  className="p-1.5 sm:p-2 bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl border border-slate-700/60 transition-colors"
                  title="Rotate 90 degrees (Press R)"
                >
                  <RotateCw className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                </button>

                {/* Document Viewer Fullscreen / Stretch Focus Mode */}
                <button
                  onClick={toggleViewerFullscreen}
                  className="p-1.5 sm:p-2 bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl border border-slate-700/60 transition-colors inline-flex items-center gap-1 select-none"
                  title={isFullscreen || isFocusMode ? 'Exit Full Screen' : 'Full Screen / Stretch Document'}
                  aria-label={isFullscreen || isFocusMode ? 'Exit Full Screen' : 'Full Screen'}
                >
                  {isFullscreen || isFocusMode ? (
                    <Minimize className="w-3.5 h-3.5 text-amber-400" />
                  ) : (
                    <Maximize className="w-3.5 h-3.5" />
                  )}
                  <span className="text-[10px] font-bold text-amber-400 hidden xs:inline sm:hidden">
                    {isFullscreen || isFocusMode ? 'Exit' : 'Stretch'}
                  </span>
                </button>
              </>
            )}

            {/* Download Button */}
            {canDownload ? (
              <button
                onClick={handleDownloadActiveFile}
                className="btn flex items-center gap-1 sm:gap-1.5 p-1.5 sm:px-3 sm:py-1.5 rounded-full text-xs font-bold shadow-xs cursor-pointer group"
                title="Download this document"
              >
                <Download className="sparkle w-3.5 h-3.5 text-orange-400" />
                <span className="text hidden sm:inline">Download</span>
              </button>
            ) : null}

            {/* Close Button */}
            <button
              onClick={onClose}
              className="p-2 sm:p-1.5 rounded-xl text-slate-300 sm:text-slate-400 hover:text-white hover:bg-slate-800 transition-colors ml-0.5 sm:ml-1 touch-manipulation"
              aria-label="Close Preview"
            >
              <X className="w-5 h-5" />
            </button>

          </div>
        </div>

        {/* Multi-Part / Multi-PDF Switcher Strip */}
        {multiFiles.length > 1 && (
          <div className="px-3 sm:px-6 py-2 bg-slate-950 border-b border-slate-800 flex items-center gap-2 overflow-x-auto scrollbar-none shrink-0">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 shrink-0 flex items-center gap-1.5 mr-1">
              <Layers className="w-3.5 h-3.5 text-amber-500" />
              Parts ({multiFiles.length}):
            </span>
            {multiFiles.map((file, idx) => (
              <button
                key={idx}
                onClick={() => {
                  if (activeFileIndex !== idx) {
                    setActiveFileIndex(idx);
                    setCurrentPage(1);
                    setLoading(true);
                    setError(null);
                  }
                  const isPartLink = file.url && (
                    file.size === 'Google Drive' || 
                    file.size === 'Resource Link' || 
                    file.url.includes('/folders/')
                  );
                  if (isPartLink && canDownload) {
                    window.open(file.url, '_blank', 'noopener,noreferrer');
                  }
                }}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 select-none ${
                  activeFileIndex === idx
                    ? 'bg-gradient-to-r from-lpu-600 to-amber-500 text-white shadow-md shadow-orange-500/20'
                    : 'bg-slate-800/80 text-slate-300 hover:bg-slate-700 hover:text-white border border-slate-700/60'
                }`}
              >
                <FileText className="w-3.5 h-3.5" />
                <span className="truncate max-w-[150px] sm:max-w-[220px]">
                  {file.title || file.name || `File ${idx + 1}`}
                </span>
                {file.size && (
                  <span className="text-[10px] opacity-75 font-mono">
                    ({file.size})
                  </span>
                )}
              </button>
            ))}
          </div>
        )}

        {/* Embedded Document Viewport: Primary Continuous Vertical Scroll Mode */}
        <div 
          ref={viewportRef}
          onScroll={handleViewportScroll}
          className="flex-1 bg-slate-900/90 relative overflow-y-auto overflow-x-auto select-none p-2 sm:p-4 md:p-6"
          style={{
            touchAction: isPinching ? 'none' : 'pan-x pan-y',
            WebkitOverflowScrolling: 'touch',
          }}
        >
          {loading ? (
            <div className="flex flex-col items-center justify-center min-h-[60vh] text-slate-400">
              <div className="w-10 h-10 border-4 border-lpu-500 border-t-transparent rounded-full animate-spin mb-3" />
              <p className="text-xs font-semibold">Loading document inside viewer...</p>
            </div>
          ) : !isPreviewable ? (
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 sm:p-12 max-w-lg text-center mx-auto my-auto shadow-2xl animate-in zoom-in-95 duration-200">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-amber-500/20 to-orange-500/20 border border-amber-500/30 text-amber-400 flex items-center justify-center mx-auto mb-5 shadow-lg shadow-orange-500/10">
                {fileFormat.type === 'zip' ? (
                  <FileArchive className="w-8 h-8 text-purple-400" />
                ) : fileFormat.type === 'ppt' ? (
                  <Presentation className="w-8 h-8 text-amber-400" />
                ) : (
                  <FileText className="w-8 h-8 text-blue-400" />
                )}
              </div>
              <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold border mb-3 ${
                fileFormat.type === 'zip'
                  ? 'bg-purple-950/80 text-purple-300 border-purple-800'
                  : fileFormat.type === 'ppt'
                  ? 'bg-amber-950/80 text-amber-300 border-amber-800'
                  : 'bg-blue-950/80 text-blue-300 border-blue-800'
              }`}>
                {fileFormat.label}
              </span>
              <h3 className="text-lg sm:text-xl font-bold text-white mb-2 leading-snug">
                {activeFileName || material.title}
              </h3>
              <p className="text-xs text-slate-400 mb-6 max-w-sm mx-auto leading-relaxed">
                {parseFileSizeToMb(activeFileSizeStr) !== null && (parseFileSizeToMb(activeFileSizeStr) || 0) > 30
                  ? `This file is ${activeFileSizeStr || 'large'} and exceeds in-browser preview capacity. Download below to open and view the high-quality notes directly on your device.`
                  : material.description || `This ${fileFormat.label} contains downloadable course files. Download to view locally on your device.`}
              </p>
              <div className="bg-slate-950/80 rounded-2xl p-3 border border-slate-800 mb-6 flex flex-col gap-1 items-center justify-center text-center overflow-hidden">
                <span className="truncate text-xs font-mono text-slate-300 max-w-xs font-semibold">
                  {activeFileName || material.file_name || `${material.title}${fileFormat.ext}`}
                </span>
                {activeFileSizeStr && (
                  <span className="text-[11px] font-mono text-amber-400 font-medium">
                    File Size: {activeFileSizeStr}
                  </span>
                )}
              </div>
              <button
                onClick={handleDownloadActiveFile}
                className="btn w-full inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-full font-bold text-sm shadow-xl cursor-pointer group"
              >
                <Download className="sparkle w-4 h-4 text-orange-400" />
                <span className="text">Download File ({activeFileSizeStr || fileFormat.label})</span>
              </button>
            </div>
          ) : externalLinkUrl ? (
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 sm:p-12 max-w-lg text-center mx-auto my-auto shadow-2xl animate-in zoom-in-95 duration-200">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-amber-500/20 to-orange-500/20 border border-amber-500/30 text-amber-400 flex items-center justify-center mx-auto mb-5 shadow-lg shadow-orange-500/10">
                <Globe className="w-8 h-8 text-amber-400" />
              </div>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-800 text-[11px] font-bold text-amber-400 border border-slate-700 mb-3">
                External Study Resource
              </span>
              <h3 className="text-lg sm:text-xl font-bold text-white mb-2 leading-snug">
                {material.title}
              </h3>
              <p className="text-xs text-slate-400 mb-6 max-w-sm mx-auto leading-relaxed">
                {material.description || 'This study resource is accessible directly via the external link below.'}
              </p>
              <div className="bg-slate-950/80 rounded-2xl p-3 border border-slate-800 mb-6 flex items-center justify-center gap-2 text-center overflow-hidden">
                <span className="truncate text-xs font-mono text-slate-300 max-w-xs">
                  {externalLinkUrl}
                </span>
              </div>
              <a
                href={externalLinkUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="btn w-full inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-full font-bold text-sm shadow-xl cursor-pointer group"
              >
                <span className="text">Open Resource Link</span>
                <ExternalLink className="sparkle w-4 h-4 text-orange-400" />
              </a>
            </div>
          ) : isDriveResource ? (
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 sm:p-12 max-w-xl text-center mx-auto my-auto shadow-2xl animate-in zoom-in-95 duration-200">
              <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-400 flex items-center justify-center mx-auto mb-5 shadow-lg shadow-amber-500/10">
                <ExternalLink className="w-8 h-8 text-amber-400" />
              </div>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-950/80 text-[11px] font-bold text-amber-300 border border-amber-800 mb-3">
                Google Drive Folder
              </span>
              <h3 className="text-lg sm:text-xl font-bold text-white mb-2 leading-snug">
                {activeFileName || material.title}
              </h3>
              <p className="text-xs text-slate-400 mb-6 max-w-md mx-auto leading-relaxed">
                Google Drive folders cannot be previewed in-app. Open in Google Drive to view all files, notes, and folders.
              </p>
              
              <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                <a
                  href={activeFileUrl || material.file_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => {
                    fetch('/api/materials/history', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ materialId: material.id }),
                    }).catch(() => {});
                  }}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-2xl bg-gradient-to-r from-lpu-600 to-amber-500 hover:from-lpu-700 hover:to-amber-600 text-white font-bold text-sm shadow-xl shadow-orange-500/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
                >
                  <span>Open in Google Drive (New Tab)</span>
                  <ExternalLink className="w-4 h-4" />
                </a>
              </div>
            </div>
          ) : error ? (
            <div className="bg-slate-800/80 border border-slate-700 rounded-2xl p-6 sm:p-8 max-w-md text-center mx-auto my-auto shadow-2xl animate-in zoom-in-95 duration-200">
              <AlertTriangle className="w-10 h-10 text-amber-400 mx-auto mb-3" />
              <p className="text-sm font-semibold text-slate-200 mb-1">{error}</p>
              <p className="text-xs text-slate-400 mb-4">
                {canDownload ? 'You can download the document directly to your device.' : 'Please try reloading or contact administration if the problem persists.'}
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-2.5 mt-2">
                {canDownload && (
                  <button
                    onClick={handleDownloadActiveFile}
                    className="btn w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-5 py-2.5 rounded-full font-bold text-xs shadow-md cursor-pointer group"
                  >
                    <Download className="sparkle w-4 h-4 text-orange-400" />
                    <span className="text">Download Document</span>
                  </button>
                )}
                {canDownload && externalLinkUrl && (
                  <button
                    onClick={handleOpenSourceLink}
                    className="btn w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-full font-bold text-xs cursor-pointer group"
                  >
                    <ExternalLink className="sparkle w-4 h-4 text-orange-400" />
                    <span className="text">Open Resource Link</span>
                  </button>
                )}
              </div>
            </div>
          ) : isImageType && previewBlobUrl ? (
            <div 
              className="w-full h-full flex items-center justify-center transition-transform duration-100 ease-out"
              style={{
                transform: `scale(${zoomLevel / 100}) rotate(${rotation}deg)`,
                transformOrigin: 'center center',
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={previewBlobUrl}
                alt={material.title}
                className="max-w-full max-h-full rounded-none sm:rounded-lg shadow-2xl object-contain bg-white transition-all duration-150"
                style={{
                  filter: readingFilterStyle,
                  touchAction: 'none',
                }}
              />
            </div>
          ) : pdfDoc ? (
            /* Continuous Vertical Scroll Page Column */
            <div className="flex flex-col items-center gap-4 sm:gap-6 min-w-min mx-auto pb-16">
              {Array.from({ length: totalPages }, (_, idx) => idx + 1).map((pageNum) => (
                <PdfPageItem
                  key={pageNum}
                  pageNumber={pageNum}
                  pdfDoc={pdfDoc}
                  scale={effectiveScale}
                  rotation={rotation}
                  baseWidth={basePageDims?.width || 595.28}
                  baseHeight={basePageDims?.height || 841.89}
                  readingFilterStyle={readingFilterStyle}
                  isIntersecting={visiblePages.has(pageNum)}
                />
              ))}
            </div>
          ) : driveEmbedUrl ? (
            /* Fallback Embed when Google Drive prevents binary download */
            <div className="w-full h-full overflow-hidden sm:overflow-auto flex items-start justify-center p-0 sm:p-4 select-none">
              <div 
                className="relative rounded-none sm:rounded-xl overflow-hidden bg-black shadow-2xl transition-all duration-150 ease-out origin-top shrink-0 w-full h-full"
                style={{
                  width: zoomLevel <= 100 ? '100%' : `${zoomLevel}%`,
                  height: zoomLevel <= 100 ? '100%' : `${zoomLevel}%`,
                  transform: zoomLevel < 100 ? `scale(${zoomLevel / 100}) rotate(${rotation}deg)` : (rotation ? `rotate(${rotation}deg)` : undefined),
                  transformOrigin: 'top center',
                }}
              >
                <iframe
                  src={driveEmbedUrl}
                  title={material.title}
                  className="w-full h-full rounded-none sm:rounded-xl border-0 bg-black transition-all duration-150"
                  style={{
                    filter: readingFilterStyle,
                    pointerEvents: isPinching ? 'none' : 'auto',
                  }}
                  sandbox="allow-scripts allow-same-origin allow-forms"
                />
              </div>
            </div>
          ) : (
            <div className="text-xs text-slate-400 text-center py-20">Loading document...</div>
          )}
        </div>

        {/* Bottom Information & Security Bar */}
        {(!isFocusMode && !isFullscreen) && (
          <div className="px-4 sm:px-6 py-2.5 bg-slate-950 border-t border-slate-800/80 flex flex-wrap items-center justify-between text-xs text-slate-400 gap-2 shrink-0 animate-in fade-in duration-150">
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1 text-[11px]">
                <HardDrive className="w-3 h-3 text-slate-500" />
                {material.file_size}
              </span>
              <span>•</span>
              <span className="text-[11px]">
                {material.download_count} total downloads
              </span>
              <span>•</span>
              <span className="text-[11px]">
                Uploaded {new Date(material.created_at).toLocaleDateString()}
              </span>
              <span className="text-slate-600 hidden sm:inline">•</span>
              <span className="text-[11px] text-slate-400 hidden sm:inline">
                Continuous Scroll • Pinch or Alt+Wheel to Zoom • J/K: Jump Page • F: Stretch
              </span>
              <span className="text-[11px] text-amber-400/90 sm:hidden">
                👆 Swipe up/down to read continuously • Pinch to zoom
              </span>
            </div>

            <div className="flex items-center gap-2 text-[11px]">
              {isGlobalDownloadsEnabled ? (
                <span className="text-emerald-400 font-medium">
                  ✓ Full Access: Reading & Downloads Enabled
                </span>
              ) : (
                <span className="text-amber-400 font-medium flex items-center gap-1">
                  <ShieldAlert className="w-3 h-3 text-amber-400" />
                  Preview Only: Downloads Disabled
                </span>
              )}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
