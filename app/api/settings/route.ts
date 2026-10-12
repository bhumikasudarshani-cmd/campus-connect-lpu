import { NextResponse } from 'next/server';
import { signCommFlag, COMM_FLAG_COOKIE, COMM_FLAG_MAX_AGE } from '@/lib/auth/comm-flag';
import { getCurrentSession } from '@/lib/auth';
import { getAppSettings } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const session = await getCurrentSession();
    const settings = await getAppSettings();

    const res = NextResponse.json(
      {
        success: true,
        settings: {
          allow_user_downloads: Boolean(settings.allow_user_downloads),
          require_community_verification: settings.require_community_verification !== false,
        },
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
    console.error('Settings public GET error:', error);
    return NextResponse.json({ error: error.message || 'Failed to fetch settings' }, { status: 500 });
  }
}
