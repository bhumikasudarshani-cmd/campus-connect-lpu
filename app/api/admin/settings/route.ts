import { NextRequest, NextResponse } from 'next/server';
import { signCommFlag, COMM_FLAG_COOKIE, COMM_FLAG_MAX_AGE } from '@/lib/auth/comm-flag';
import { getCurrentSession } from '@/lib/auth';
import { getAppSettings, updateAppSettings } from '@/lib/db';

export async function GET() {
  try {
    const session = await getCurrentSession();
    const settings = await getAppSettings();
    const res = NextResponse.json(
      {
        success: true,
        settings,
        isAdmin: Boolean(session && (session.isAdmin || session.isOwner)),
      },
      {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
          Pragma: 'no-cache',
          Expires: '0',
        },
      }
    );

    res.cookies.set({
      name: COMM_FLAG_COOKIE,
      value: await signCommFlag(settings.require_community_verification),
      path: '/',
      httpOnly: true,
      sameSite: 'lax',
      maxAge: COMM_FLAG_MAX_AGE,
    });

    res.cookies.set({
      name: 'cc_allow_dl',
      value: settings.allow_user_downloads ? 'true' : 'false',
      path: '/',
      httpOnly: false,
      sameSite: 'lax',
      maxAge: 31536000,
    });

    return res;
  } catch (error: any) {
    console.error('Settings GET error:', error);
    return NextResponse.json({ error: error.message || 'Failed to fetch settings' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const session = await getCurrentSession();
    if (!session || (!session.isAdmin && !session.isOwner)) {
      return NextResponse.json({ error: 'Unauthorized: Admin privileges required.' }, { status: 403 });
    }

    const body = await req.json();
    const { allow_user_downloads, require_community_verification } = body;

    if (allow_user_downloads !== undefined && typeof allow_user_downloads !== 'boolean') {
      return NextResponse.json({ error: 'allow_user_downloads must be a boolean' }, { status: 400 });
    }

    if (require_community_verification !== undefined && typeof require_community_verification !== 'boolean') {
      return NextResponse.json({ error: 'require_community_verification must be a boolean' }, { status: 400 });
    }

    const updatePayload: any = {
      updated_by: session.email || session.userId,
    };
    if (allow_user_downloads !== undefined) {
      updatePayload.allow_user_downloads = allow_user_downloads;
    }
    if (require_community_verification !== undefined) {
      updatePayload.require_community_verification = require_community_verification;
    }

    const updated = await updateAppSettings(updatePayload);

    let message = 'Global settings updated successfully.';
    if (require_community_verification !== undefined && allow_user_downloads === undefined) {
      message = require_community_verification
        ? 'Global Community Verification Enabled: All students must complete community verification before accessing materials.'
        : 'Global Community Verification Disabled: Anyone signed in can now access study materials without verification.';
    } else if (allow_user_downloads !== undefined && require_community_verification === undefined) {
      message = allow_user_downloads
        ? 'Global setting updated: Users can preview and download study materials.'
        : 'Global setting updated: Users can preview study materials but cannot download them.';
    }

    const res = NextResponse.json({
      success: true,
      message,
      settings: updated,
    });

    res.cookies.set({
      name: COMM_FLAG_COOKIE,
      value: await signCommFlag(updated.require_community_verification),
      path: '/',
      httpOnly: true,
      sameSite: 'lax',
      maxAge: COMM_FLAG_MAX_AGE,
    });

    res.cookies.set({
      name: 'cc_allow_dl',
      value: updated.allow_user_downloads ? 'true' : 'false',
      path: '/',
      httpOnly: false,
      sameSite: 'lax',
      maxAge: 31536000,
    });

    return res;
  } catch (error: any) {
    console.error('Settings PATCH error:', error);
    return NextResponse.json({ error: error.message || 'Failed to update settings' }, { status: 500 });
  }
}
