/**
 * CampusConnect LPU - Centralized Google Drive File Service
 * 
 * Provides unified, decoupled helpers for:
 * - Parsing & extracting Google Drive File IDs (single files, bundles, external links)
 * - Generating standardized preview, download, and embed URLs
 * - Normalizing metadata for database storage and future drive migration
 */

export interface DriveFileMetadata {
  fileId: string | null;
  fileName: string;
  fileSizeFormatted: string;
  mimeType: string;
  isGoogleDrive: boolean;
  isBundle: boolean;
  isExternalLink: boolean;
  previewUrl: string | null;
  downloadUrl: string | null;
  bundleItems?: Array<{
    title: string;
    name: string;
    url: string;
    drive_file_id?: string;
    size?: string;
  }>;
}

/**
 * Extracts a Google Drive File ID from various URL patterns
 */
export function extractDriveFileId(url: string | null | undefined): string | null {
  if (!url || typeof url !== 'string') return null;
  const clean = url.trim();

  // Pattern 1: uc?export=download&id=...
  const idParamMatch = clean.match(/[?&]id=([a-zA-Z0-9_-]{25,})/);
  if (idParamMatch) return idParamMatch[1];

  // Pattern 2: /file/d/...
  const fileDMatch = clean.match(/\/file\/d\/([a-zA-Z0-9_-]{25,})/);
  if (fileDMatch) return fileDMatch[1];

  // Pattern 3: /d/...
  const dMatch = clean.match(/\/d\/([a-zA-Z0-9_-]{25,})/);
  if (dMatch) return dMatch[1];

  // Pattern 4: Raw file ID directly (typically 28-44 chars alphanumeric with _ -)
  if (/^[a-zA-Z0-9_-]{28,45}$/.test(clean)) {
    return clean;
  }

  return null;
}

/**
 * Generates a clean Google Drive preview URL (for embed or browser view)
 */
export function getDrivePreviewUrl(fileId: string): string {
  return `https://drive.google.com/file/d/${fileId}/preview`;
}

/**
 * Generates a Google Drive download stream URL
 */
export function getDriveDownloadUrl(fileId: string): string {
  return `https://drive.google.com/uc?export=download&id=${fileId}`;
}

/**
 * Generates Google Drive alternative direct stream download URL
 */
export function getDriveDirectDownloadUrl(fileId: string): string {
  return `https://drive.usercontent.google.com/download?id=${fileId}&export=download`;
}

/**
 * Parses any material's `file_url` into standardized DriveFileMetadata
 */
export function parseMaterialFileMetadata(
  fileUrl: string | null | undefined,
  fallbackTitle: string = 'Document',
  fallbackSize: string = 'Unknown'
): DriveFileMetadata {
  if (!fileUrl) {
    return {
      fileId: null,
      fileName: fallbackTitle,
      fileSizeFormatted: fallbackSize,
      mimeType: 'application/octet-stream',
      isGoogleDrive: false,
      isBundle: false,
      isExternalLink: false,
      previewUrl: null,
      downloadUrl: null,
    };
  }

  const trimmed = fileUrl.trim();

  // 1. Multi-file bundle check (JSON array)
  if (trimmed.startsWith('[')) {
    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed) && parsed.length > 0) {
        const primary = parsed[0];
        const primaryDriveId = primary?.drive_file_id || extractDriveFileId(primary?.url);

        return {
          fileId: primaryDriveId,
          fileName: primary?.name || `${fallbackTitle} Bundle`,
          fileSizeFormatted: fallbackSize,
          mimeType: 'application/json',
          isGoogleDrive: Boolean(primaryDriveId),
          isBundle: true,
          isExternalLink: false,
          previewUrl: primaryDriveId ? getDrivePreviewUrl(primaryDriveId) : primary?.url || null,
          downloadUrl: primaryDriveId ? getDriveDownloadUrl(primaryDriveId) : primary?.url || null,
          bundleItems: parsed,
        };
      }
    } catch {
      // Fallback to plain URL handling if JSON parse fails
    }
  }

  // 2. Single Google Drive file check
  const driveId = extractDriveFileId(trimmed);
  if (driveId) {
    return {
      fileId: driveId,
      fileName: fallbackTitle.endsWith('.pdf') ? fallbackTitle : `${fallbackTitle}.pdf`,
      fileSizeFormatted: fallbackSize,
      mimeType: 'application/pdf',
      isGoogleDrive: true,
      isBundle: false,
      isExternalLink: false,
      previewUrl: getDrivePreviewUrl(driveId),
      downloadUrl: getDriveDownloadUrl(driveId),
    };
  }

  // 3. Supabase storage file check
  if (trimmed.includes('supabase.co/storage/v1/object/public/')) {
    return {
      fileId: null,
      fileName: fallbackTitle,
      fileSizeFormatted: fallbackSize,
      mimeType: 'application/pdf',
      isGoogleDrive: false,
      isBundle: false,
      isExternalLink: false,
      previewUrl: trimmed,
      downloadUrl: trimmed,
    };
  }

  // 4. External study resource link
  return {
    fileId: null,
    fileName: fallbackTitle,
    fileSizeFormatted: fallbackSize,
    mimeType: 'text/html',
    isGoogleDrive: false,
    isBundle: false,
    isExternalLink: true,
    previewUrl: trimmed,
    downloadUrl: trimmed,
  };
}

export type MaterialCategory = 'PDF' | 'PPT' | 'EXTERNAL_LINK' | 'ARCHIVE' | 'IMAGE' | 'OTHER';

/**
 * Checks if a URL specifically targets a Google Drive folder
 */
export function isGoogleDriveFolder(url: string | null | undefined): boolean {
  if (!url || typeof url !== 'string') return false;
  const clean = url.trim().toLowerCase();
  return clean.includes('drive.google.com') && (clean.includes('/folders/') || clean.includes('id=folders'));
}

/**
 * Checks if a URL points to a specific Google Drive single file
 */
export function isGoogleDriveFile(url: string | null | undefined): boolean {
  if (!url || typeof url !== 'string') return false;
  if (isGoogleDriveFolder(url)) return false;
  return Boolean(extractDriveFileId(url));
}

/**
 * Accurately categorizes any study material into one of 6 exact types:
 * - PDF: Standard study documents, books, notes, PYQs (previewable in Canvas viewer)
 * - PPT: PowerPoint presentation files (.ppt, .pptx, etc.)
 * - EXTERNAL_LINK: External resource URLs, Google Drive folder links, Resource Links
 * - ARCHIVE: Compressed containers (.zip, .rar, .7z, etc.)
 * - IMAGE: Visual images (.png, .jpg, .jpeg, .webp, .svg, .img, etc.)
 * - OTHER: Word docs, spreadsheets, or unsupported binaries
 */
export function getMaterialCategory(material: {
  file_url?: string;
  file_name?: string | null;
  title?: string;
  mime_type?: string | null;
  material_type?: string;
  file_size?: string | null;
}): MaterialCategory {
  if (!material) return 'OTHER';

  const url = (material.file_url || '').toLowerCase().trim();
  const name = (material.file_name || '').toLowerCase().trim();
  const title = (material.title || '').toLowerCase().trim();
  const mime = (material.mime_type || '').toLowerCase().trim();
  const size = (material.file_size || '').trim();
  const matType = (material.material_type || '').toLowerCase().trim();

  // 1. Check for multi-file bundle JSON
  if (url.startsWith('[')) {
    try {
      const parsed = JSON.parse(material.file_url || '[]');
      if (Array.isArray(parsed) && parsed.length > 0) {
        const first = parsed[0];
        return getMaterialCategory({
          file_url: first?.url || '',
          file_name: first?.title || first?.name || '',
          title: first?.title || first?.name || title,
          file_size: first?.size || size,
          mime_type: mime,
          material_type: matType,
        });
      }
    } catch {}
  }

  // 2. Google Drive FOLDERS are external links (cannot be previewed as single files)
  if (isGoogleDriveFolder(url)) {
    return 'EXTERNAL_LINK';
  }

  // 3. Genuine external resource links (web pages, documentation, link resources)
  const isExternalResource =
    size === 'Resource Link' ||
    mime === 'text/uri-list' ||
    matType === 'link' ||
    name.includes('resource link') ||
    title.includes('resource link') ||
    (url.startsWith('http') &&
      !url.includes('drive.google.com') &&
      !url.includes('docs.google.com') &&
      !url.includes('/study-materials/') &&
      !url.includes('/uploads/') &&
      !/\.(pdf|png|jpg|jpeg|webp|svg|gif|bmp|img|ppt|pptx|zip|rar|7z|doc|docx)($|\?)/i.test(url));

  if (isExternalResource) {
    return 'EXTERNAL_LINK';
  }

  // 4. IMAGE: PNG, JPG, JPEG, WEBP, SVG, GIF, BMP, IMG
  const imgExts = ['.png', '.jpg', '.jpeg', '.webp', '.svg', '.gif', '.bmp', '.img'];
  const isImg =
    imgExts.some((ext) => name.endsWith(ext) || url.includes(ext) || title.endsWith(ext)) ||
    mime.startsWith('image/');

  if (isImg) {
    return 'IMAGE';
  }

  // 5. PPT / PPTX: Presentation slides
  const pptExts = ['.ppt', '.pptx', '.pps', '.ppsx', '.odp'];
  const isPpt =
    pptExts.some((ext) => name.endsWith(ext) || url.includes(ext) || title.endsWith(ext)) ||
    mime.includes('powerpoint') ||
    mime.includes('presentation') ||
    mime.includes('presentationml') ||
    /\b(ppts?|slides|powerpoint)\b/i.test(title);

  if (isPpt) {
    return 'PPT';
  }

  // 6. ARCHIVE: ZIP, RAR, 7Z, TAR, GZ, ISO
  const archiveExts = ['.zip', '.rar', '.7z', '.tar', '.gz', '.bz2', '.xz', '.tgz', '.iso'];
  const isArchive =
    archiveExts.some((ext) => name.endsWith(ext) || url.includes(ext) || title.endsWith(ext)) ||
    mime.includes('zip') ||
    mime.includes('compressed') ||
    mime.includes('archive') ||
    mime.includes('x-rar') ||
    mime.includes('x-7z') ||
    /\b(zip|rar|7z|archive)\b/i.test(title);

  if (isArchive) {
    return 'ARCHIVE';
  }

  // 7. OTHER non-previewable docs: Word, Excel, Executables
  const otherDocExts = ['.doc', '.docx', '.xls', '.xlsx', '.csv', '.apk', '.exe', '.msi', '.bin'];
  const isOtherDoc =
    otherDocExts.some((ext) => name.endsWith(ext) || url.includes(ext) || title.endsWith(ext)) ||
    mime.includes('word') ||
    mime.includes('spreadsheet') ||
    mime.includes('excel');

  if (isOtherDoc) {
    return 'OTHER';
  }

  // 8. Default to PDF for standard study materials
  return 'PDF';
}

/**
 * Checks whether a material can be rendered in the in-browser DocumentViewer
 * (PDF Canvas, Images, and Google Drive PPT embeds).
 */
export function isMaterialPreviewable(material: {
  file_url?: string;
  file_name?: string | null;
  title?: string;
  mime_type?: string | null;
  material_type?: string;
  file_size?: string | null;
}): boolean {
  if (!material) return false;
  const category = getMaterialCategory(material);
  if (category === 'PDF' || category === 'IMAGE') return true;
  if (category === 'PPT') {
    const driveId = extractDriveFileId(material.file_url);
    return Boolean(driveId);
  }
  // Any Google Drive file (including Word docs / slides) can be previewed via Google Drive embed!
  const driveId = extractDriveFileId(material.file_url);
  if (driveId && !isGoogleDriveFolder(material.file_url)) return true;
  return false;
}

/**
 * Parses file size strings like "122.4 MB", "129.6 MB", "500 KB", "1.2 GB" into numeric Megabytes (MB).
 */
export function parseFileSizeToMb(sizeStr: string | null | undefined): number | null {
  if (!sizeStr || typeof sizeStr !== 'string') return null;
  const match = sizeStr.trim().match(/^([0-9.]+)\s*(bytes|b|kb|mb|gb|tb)?$/i);
  if (!match) return null;
  const val = parseFloat(match[1]);
  if (isNaN(val)) return null;
  const unit = (match[2] || 'b').toLowerCase();
  if (unit === 'gb') return val * 1024;
  if (unit === 'mb') return val;
  if (unit === 'kb') return val / 1024;
  if (unit === 'b' || unit === 'bytes') return val / (1024 * 1024);
  if (unit === 'tb') return val * 1024 * 1024;
  return val;
}

export interface MaterialFileFormatInfo {
  type: 'zip' | 'ppt' | 'image' | 'doc' | 'pdf';
  label: string;
  badgeClass: string;
  ext: string;
}

export function getMaterialFileFormat(material: {
  file_name?: string | null;
  file_url?: string;
  mime_type?: string | null;
  title?: string;
  file_size?: string | null;
  material_type?: string;
}): MaterialFileFormatInfo {
  const category = getMaterialCategory(material);
  if (category === 'ARCHIVE') {
    return {
      type: 'zip',
      label: 'ZIP Archive',
      badgeClass: 'bg-purple-50 dark:bg-purple-950/50 text-purple-700 dark:text-purple-300 border-purple-200/90 dark:border-purple-800/80',
      ext: '.zip',
    };
  }
  if (category === 'PPT') {
    const name = (material.file_name || material.title || '').toLowerCase();
    return {
      type: 'ppt',
      label: 'PPT Slides',
      badgeClass: 'bg-amber-50 dark:bg-amber-950/50 text-amber-800 dark:text-amber-300 border-amber-200/90 dark:border-amber-800/80',
      ext: name.endsWith('.ppt') ? '.ppt' : '.pptx',
    };
  }
  if (category === 'IMAGE') {
    return {
      type: 'image',
      label: 'Images',
      badgeClass: 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border-emerald-200/90 dark:border-emerald-800/80',
      ext: '.jpg',
    };
  }
  if (category === 'EXTERNAL_LINK') {
    const isFolder = isGoogleDriveFolder(material.file_url);
    return {
      type: 'doc',
      label: isFolder ? 'Drive Folder' : 'Resource Link',
      badgeClass: 'bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 border-amber-200/90 dark:border-amber-800/80',
      ext: '',
    };
  }
  const name = (material.file_name || material.title || '').toLowerCase();
  if (name.endsWith('.docx') || name.endsWith('.doc') || (material.mime_type || '').includes('word')) {
    return {
      type: 'doc',
      label: 'Word Doc',
      badgeClass: 'bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 border-blue-200/90 dark:border-blue-800/80',
      ext: '.docx',
    };
  }
  return {
    type: 'pdf',
    label: 'PDF',
    badgeClass: 'bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300 border-rose-200/90 dark:border-rose-800/80',
    ext: '.pdf',
  };
}

