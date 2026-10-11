import { NextRequest, NextResponse } from 'next/server';
import { getCurrentSession } from '@/lib/auth';
import { getMaterialById, recordDownload, getAppSettings } from '@/lib/db';
import { extractDriveFileId, getDriveDownloadUrl, isMaterialPreviewable } from '@/lib/drive-service';
import fs from 'fs';
import path from 'path';

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getCurrentSession();
    if (!session) {
      return NextResponse.json({ error: 'Please log in to access materials' }, { status: 401 });
    }

    const isAdminOrOwner = Boolean(session.isAdmin || session.isOwner);
    const settings = await getAppSettings().catch(() => ({ allow_user_downloads: true, require_community_verification: true }));
    const requireCommunity = settings.require_community_verification !== false;

    if (requireCommunity && !session.community_joined && !isAdminOrOwner) {
      return NextResponse.json(
        { error: 'Community confirmation required to access study materials' },
        { status: 403 }
      );
    }

    const material = await getMaterialById(params.id);
    if (!material) {
      return NextResponse.json({ error: 'Material not found' }, { status: 404 });
    }

    // Check if client wants JSON response or direct file stream
    const { searchParams } = new URL(req.url);
    const returnJson = searchParams.get('json') === 'true';

    let targetFileUrl = material.file_url;
    let targetTitle = material.title;
    let targetFileSize = material.file_size;

    if (material.file_url.startsWith('[')) {
      try {
        const fileList = JSON.parse(material.file_url);
        if (Array.isArray(fileList) && fileList.length > 0) {
          const fileIndex = parseInt(searchParams.get('fileIndex') || '0', 10);
          const chosen = fileList[fileIndex] || fileList[0];
          if (chosen && chosen.url) {
            targetFileUrl = chosen.url;
            if (chosen.title || chosen.name) targetTitle = `${material.title}_${chosen.title || chosen.name}`;
            if (chosen.size) targetFileSize = chosen.size;
          }
        }
      } catch (e) {
        console.warn('Failed to parse multi-file JSON in download route:', e);
      }
    }

    // SERVER-SIDE ACCESS CONTROL:
    // When allow_user_downloads = false and user is not admin/owner,
    // previewable documents (PDF, image, Drive PPT) are strictly restricted to Preview mode.
    // However, non-previewable files (DOC, DOCX, ZIP, RAR, other binaries) can only be accessed via download.
    const isPreviewable = isMaterialPreviewable({
      file_url: targetFileUrl,
      file_name: material.file_name,
      title: material.title,
      mime_type: material.mime_type,
      material_type: material.material_type,
      file_size: targetFileSize,
    });

    if (!settings.allow_user_downloads && !isAdminOrOwner && isPreviewable) {
      return NextResponse.json(
        {
          error: 'Document downloads are currently disabled by administration. You can view previewable documents in Preview mode.',
          code: 'DOWNLOADS_DISABLED_PREVIEW_ONLY',
        },
        { status: 403 }
      );
    }

    // 1. Record the download in database & increment download count
    await recordDownload(session.userId, material.id);

    if (returnJson) {
      return NextResponse.json({
        success: true,
        downloadUrl: targetFileUrl,
        material: {
          id: material.id,
          title: targetTitle,
          download_count: material.download_count + 1,
        },
      });
    }

    // 3. Serve direct download with attachment header
    const rawExt = material.file_name?.split('.').pop() || targetFileUrl.split('?')[0].split('.').pop() || 'pdf';
    let fileExtension = `.${rawExt.toLowerCase()}`;
    if (!['.pdf', '.zip', '.rar', '.7z', '.ppt', '.pptx', '.doc', '.docx', '.png', '.jpg', '.jpeg'].includes(fileExtension)) {
      fileExtension = '.pdf';
    }

    const cleanFilename = `${material.subject_code}_${material.material_type}_${targetTitle.slice(0, 30)}${fileExtension}`.replace(/[^a-zA-Z0-9_.-]/g, '_');

    let mimeType = 'application/pdf';
    switch (fileExtension) {
      case '.zip': mimeType = 'application/zip'; break;
      case '.rar': mimeType = 'application/vnd.rar'; break;
      case '.7z': mimeType = 'application/x-7z-compressed'; break;
      case '.ppt': mimeType = 'application/vnd.ms-powerpoint'; break;
      case '.pptx': mimeType = 'application/vnd.openxmlformats-officedocument.presentationml.presentation'; break;
      case '.doc': mimeType = 'application/msword'; break;
      case '.docx': mimeType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'; break;
      case '.jpg':
      case '.jpeg': mimeType = 'image/jpeg'; break;
      case '.png': mimeType = 'image/png'; break;
      default: mimeType = 'application/pdf';
    }

    // If local file path (development only)
    if (targetFileUrl.startsWith('/uploads/')) {
      const diskPath = path.join(process.cwd(), 'public', targetFileUrl.replace('/uploads/', 'uploads/'));
      if (fs.existsSync(diskPath)) {
        const fileBuffer = fs.readFileSync(diskPath);
        return new NextResponse(fileBuffer, {
          status: 200,
          headers: {
            'Content-Type': mimeType,
            'Content-Disposition': `attachment; filename="${cleanFilename}"`,
            'Content-Length': fileBuffer.length.toString(),
            'Cache-Control': 'no-cache',
          },
        });
      }
    }

    // Google Drive direct download bypass (Google CDN handles all bandwidth at 0 Vercel Fast Origin cost)
    const driveId = extractDriveFileId(targetFileUrl);
    if (driveId) {
      return NextResponse.redirect(getDriveDownloadUrl(driveId), 307);
    }

    // If external or Supabase Storage CDN URL, redirect directly to Supabase CDN at 0 Vercel Fast Origin cost
    return NextResponse.redirect(new URL(targetFileUrl, req.url), 307);
  } catch (error: any) {
    console.error('Download error:', error);
    return NextResponse.json({ error: error.message || 'Download failed' }, { status: 500 });
  }
}
