import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtVerify } from 'jose';
import { createServerClient } from '@supabase/ssr';
import { getSupabaseConfig } from './lib/supabase/config';

const SECRET_KEY = new TextEncoder().encode(
  process.env.JWT_SECRET || 'cc_lpu_sec_auth_rotated_token_9f82b7c1e4a3d6052841_2026'
);

const SESSION_COOKIE_NAME = 'cc_session';

interface SessionPayload {
  userId: string;
  email: string;
  name: string;
  community_joined: boolean;
  isAdmin: boolean;
}

// Set to true to temporarily pause the site for maintenance and updates
const MAINTENANCE_MODE = false;

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  // Always allow static assets and internal Next.js assets
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/uploads') ||
    pathname.includes('.') // static file extensions
  ) {
    return response;
  }

  // ========================================================
  // MAINTENANCE MODE GATEKEEPER
  // ========================================================
  if (MAINTENANCE_MODE) {
    // Allow the maintenance page itself
    if (pathname === '/maintenance') {
      return response;
    }

    // Allow auth callbacks, admin endpoints, and owner admin access
    const isAdminBypass =
      pathname.startsWith('/admin') ||
      pathname.startsWith('/auth/callback') ||
      pathname.startsWith('/api/auth') ||
      (pathname === '/login' && request.nextUrl.searchParams.get('admin') === 'true');

    if (!isAdminBypass) {
      // If API route, return 503 Maintenance
      if (pathname.startsWith('/api')) {
        return NextResponse.json(
          {
            error: 'Campus Connect LPU is temporarily paused for updates. Please check back shortly.',
            maintenance: true,
          },
          { status: 503 }
        );
      }

      // For all pages, redirect to /maintenance
      const maintenanceUrl = new URL('/maintenance', request.url);
      return NextResponse.redirect(maintenanceUrl);
    }
  }

  // Extra Defense-in-depth: Protect all /api/admin endpoints at the edge
  // Exempt GET /api/admin/settings so students can read download/community permissions
  const isReadOnlySettings = pathname === '/api/admin/settings' && request.method === 'GET';
  if (pathname.startsWith('/api/admin') && !isReadOnlySettings) {
    const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized: Authentication required.' }, { status: 401 });
    }
    try {
      const { payload } = await jwtVerify(token, SECRET_KEY);
      const isOwner = (payload as any).isOwner || (payload as any).role === 'owner' || (payload as any).email?.toLowerCase() === 'mishra.rajvansh11@gmail.com';
      const isAdmin = isOwner || (payload as any).isAdmin || (payload as any).role === 'admin';
      if (!isAdmin) {
        return NextResponse.json({ error: 'Forbidden: Admin privileges required.' }, { status: 403 });
      }
    } catch {
      return NextResponse.json({ error: 'Unauthorized: Invalid session token.' }, { status: 401 });
    }
  }

  // Internal routes to skip when not in maintenance
  if (
    pathname.startsWith('/api') ||
    pathname.startsWith('/auth/callback')
  ) {
    return response;
  }

  let session: SessionPayload | null = null;

  // 1. Check JOSE session cookie
  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  if (token) {
    try {
      const { payload } = await jwtVerify(token, SECRET_KEY);
      session = payload as unknown as SessionPayload;
    } catch (e) {
      session = null;
    }
  }

  // 2. If no JOSE token, check Supabase SSR cookies if configured
  if (!session) {
    const { url, anonKey, isConfigured } = getSupabaseConfig();
    if (isConfigured) {
      try {
        const supabase = createServerClient(url, anonKey, {
          cookies: {
            getAll() {
              return request.cookies.getAll();
            },
            setAll(cookiesToSet) {
              cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
              response = NextResponse.next({
                request: {
                  headers: request.headers,
                },
              });
              cookiesToSet.forEach(({ name, value, options }) =>
                response.cookies.set(name, value, options)
              );
            },
          },
        });

        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const userEmail = (user.email || '').toLowerCase().trim();
          const isOwnerEmail = userEmail === 'mishra.rajvansh11@gmail.com';

          // Query public.users for community_joined
          const { data: profile } = await supabase
            .from('users')
            .select('community_joined')
            .eq('id', user.id)
            .single();

          // Check if admin/owner
          const { data: adminRecord } = await supabase
            .from('admins')
            .select('role')
            .or(`user_id.eq.${user.id},email.ilike.${userEmail}`)
            .limit(1);

          const isAdmin = isOwnerEmail || userEmail === 'admin@lpu.in' || (adminRecord && adminRecord.length > 0);

          session = {
            userId: user.id,
            email: user.email || '',
            name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'Student',
            community_joined: Boolean(profile?.community_joined || isAdmin),
            isAdmin: Boolean(isAdmin),
          };
        }
      } catch (sbErr) {
        // Continue
      }
    }
  }

  // 1. Not logged in
  if (!session) {
    // Protected routes requiring authentication: /library, /dashboard, /materials, /admin, /community
    if (
      pathname.startsWith('/dashboard') ||
      pathname.startsWith('/library') ||
      pathname.startsWith('/materials') ||
      pathname.startsWith('/community') ||
      pathname.startsWith('/admin')
    ) {
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('redirect', pathname);
      return NextResponse.redirect(loginUrl);
    }
    return response;
  }

  const isOwnerEmail = session.email.toLowerCase().trim() === 'mishra.rajvansh11@gmail.com';
  const effectiveIsAdmin = isOwnerEmail || session.isAdmin;
  const isCommunityVerificationRequired = request.cookies.get('cc_comm_req')?.value !== 'false';

  // 2. User is logged in
  if (pathname === '/login') {
    if (effectiveIsAdmin) {
      return NextResponse.redirect(new URL('/admin', request.url));
    } else if (!isCommunityVerificationRequired || session.community_joined) {
      return NextResponse.redirect(new URL('/library', request.url));
    } else {
      return NextResponse.redirect(new URL('/community', request.url));
    }
  }

  // 3. Admin Route Gatekeeping
  if (pathname.startsWith('/admin')) {
    if (!effectiveIsAdmin) {
      const dashboardUrl = new URL('/dashboard', request.url);
      dashboardUrl.searchParams.set('error', 'unauthorized_admin');
      return NextResponse.redirect(dashboardUrl);
    }
    return response;
  }

  // 4. Community verification check
  // Admin and owner bypass community verification restriction.
  // When global community verification is OFF, any logged-in user can access library/dashboard/materials!
  if (isCommunityVerificationRequired && !session.community_joined && !effectiveIsAdmin) {
    if (
      pathname.startsWith('/dashboard') || 
      pathname.startsWith('/library') ||
      pathname.startsWith('/materials')
    ) {
      return NextResponse.redirect(new URL('/community', request.url));
    }
  }

  return response;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
