import { NextRequest, NextResponse } from 'next/server';
import { getCurrentSession } from '@/lib/auth';
import { getMaterialById, recordMaterialOpen, getAppSettings } from '@/lib/db';
import { supabase } from '@/lib/db/supabase';
import {
  extractDriveFileId,
  getDrivePreviewUrl,
  getDriveDownloadUrl,
  getDriveDirectDownloadUrl,
} from '@/lib/drive-service';

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getCurrentSession();
    if (!session) {
      return NextResponse.json({ error: 'Please log in to view materials' }, { status: 401 });
    }

    const isAdminOrOwner = Boolean(session.isAdmin || session.isOwner);
    const settings = await getAppSettings().catch(() => ({ require_community_verification: true } as any));
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

    // Record open event in user's history asynchronously (does NOT touch download_count)
    if (session.userId) {
      recordMaterialOpen(session.userId, material.id).catch((err) => {
        console.warn('Asynchronous open history recording notice:', err);
      });
    }

    const { searchParams } = new URL(req.url);
    const returnSignedUrl = searchParams.get('signed') === 'true';

    // Multi-file bundle handling (if material.file_url is a JSON array)
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
            if (chosen.title || chosen.name) targetTitle = `${material.title} - ${chosen.title || chosen.name}`;
            if (chosen.size) targetFileSize = chosen.size;
          }
        }
      } catch (e) {
        console.warn('Failed to parse multi-file JSON in preview route:', e);
      }
    }

    // 0. If stored in Google Drive
    const driveId = extractDriveFileId(targetFileUrl);
    if (driveId) {
      const drivePreview = getDrivePreviewUrl(driveId);
      if (returnSignedUrl) {
        return NextResponse.json({
          success: true,
          signedUrl: drivePreview,
          driveFileId: driveId,
          isGoogleDrive: true,
          material: {
            id: material.id,
            title: targetTitle,
            file_size: targetFileSize,
          },
        });
      }

      // Direct 307 Redirect to Google Drive preview CDN.
      // Google CDN handles 100% of the bandwidth at ZERO Vercel Fast Origin cost!
      return NextResponse.redirect(drivePreview, 307);
    }

    // 1. If stored in Supabase Storage
    if (targetFileUrl.includes('/study-materials/')) {
      const parts = targetFileUrl.split('/study-materials/');
      const storagePath = decodeURIComponent(parts[1]?.split('?')[0] || '');

      if (storagePath && supabase) {
        if (returnSignedUrl) {
          const { data: signedData, error: signError } = await supabase.storage
            .from('study-materials')
            .createSignedUrl(storagePath, 3600);

          if (!signError && signedData?.signedUrl) {
            return NextResponse.json({
              success: true,
              signedUrl: signedData.signedUrl,
              material: {
                id: material.id,
                title: targetTitle,
                file_size: targetFileSize,
              },
            });
          }
        }

        // Direct 307 Redirect to Supabase Storage CDN public URL
        // Supabase CDN handles all egress bytes directly. Zero Vercel Fast Origin cost!
        const { data: publicUrlData } = supabase.storage
          .from('study-materials')
          .getPublicUrl(storagePath);

        if (publicUrlData?.publicUrl) {
          return NextResponse.redirect(publicUrlData.publicUrl, 307);
        }
      }
    }

    // 2. Direct external URL redirect
    if (targetFileUrl.startsWith('http')) {
      if (returnSignedUrl) {
        return NextResponse.json({
          success: true,
          signedUrl: targetFileUrl,
          material: {
            id: material.id,
            title: targetTitle,
            file_size: targetFileSize,
          },
        });
      }

      // 307 Redirect directly to origin URL — zero byte transfer through Vercel Functions
      return NextResponse.redirect(targetFileUrl, 307);
    }

    return NextResponse.json({ error: 'Document file could not be retrieved' }, { status: 404 });
  } catch (error: any) {
    console.error('Preview stream error:', error);
    return NextResponse.json({ error: error.message || 'Failed to stream document' }, { status: 500 });
  }
}
