import { NextRequest, NextResponse } from 'next/server';
import { signCommFlag, COMM_FLAG_COOKIE, COMM_FLAG_MAX_AGE } from '@/lib/auth/comm-flag';
import { createServerClient } from '@supabase/ssr';
import { getSupabaseConfig } from '@/lib/supabase/config';
import { upsertUser, isAdmin as checkIsAdmin, getUserRole, getAppSettings } from '@/lib/db';
import { signSession, SESSION_COOKIE_NAME } from '@/lib/auth';

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
  const origin = requestUrl.origin;
  const redirectTarget = requestUrl.searchParams.get('redirect') || '';
  const errorParam = requestUrl.searchParams.get('error');
  const errorDescription = requestUrl.searchParams.get('error_description');

  // Handle errors forwarded directly in query params from Supabase Auth
  if (errorParam || errorDescription) {
    const errorMsg = encodeURIComponent(errorDescription || errorParam || 'Authentication failed');
    return NextResponse.redirect(
      new URL(`/login?error=oauth_error&error_description=${errorMsg}`, origin)
    );
  }

  if (code) {
    const { url, anonKey, isConfigured } = getSupabaseConfig();

    if (isConfigured) {
      // Collect cookies set by Supabase during code exchange so they are preserved on redirect
      const cookiesToSetLater: Array<{ name: string; value: string; options?: any }> = [];

      const supabase = createServerClient(url, anonKey, {
        cookies: {
          getAll() {
            return request.cookies.getAll();
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookiesToSetLater.push({ name, value, options });
            });
          },
        },
      });

      const { data, error } = await supabase.auth.exchangeCodeForSession(code);

      if (!error && data?.session?.user) {
        const authUser = data.session.user;
        const authId = authUser.id;
        const email = authUser.email || '';
        const name = 
          authUser.user_metadata?.full_name || 
          authUser.user_metadata?.name || 
          email.split('@')[0] || 
          'Student';
        const avatarUrl = 
          authUser.user_metadata?.avatar_url || 
          authUser.user_metadata?.picture || 
          `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(name)}`;

        // Check if user already exists in public.users table
        const { data: existingProfile } = await supabase
          .from('users')
          .select('*')
          .eq('id', authId)
          .single();

        const now = new Date().toISOString();
        let communityJoined = false;

        if (existingProfile) {
          // Existing User: Update profile, last_login, last_active_at without duplicate creation
          communityJoined = Boolean(existingProfile.community_joined);

          await supabase
            .from('users')
            .update({
              name,
              avatar_url: avatarUrl,
              last_login: now,
              last_active_at: now,
            })
            .eq('id', authId);
        } else {
          // New User: Create record with community_joined = false
          await supabase
            .from('users')
            .insert({
              id: authId,
              name,
              email,
              avatar_url: avatarUrl,
              community_joined: false,
              created_at: now,
              last_login: now,
              last_active_at: now,
            });
        }

        // Sync with unified database adapter
        const unifiedUser = await upsertUser({
          id: authId,
          name,
          email,
          avatar_url: avatarUrl,
          community_joined: existingProfile ? communityJoined : false,
        });

        // Sign unified session cookie with verified database role
        const userRole = await getUserRole(email || authId);
        const isAdmin = userRole === 'owner' || userRole === 'admin';
        const sessionToken = await signSession(unifiedUser, isAdmin, userRole);

        const settings = await getAppSettings().catch(() => ({ require_community_verification: true } as any));
        const requireCommunity = settings.require_community_verification !== false;

        // Determine destination based on role and community status:
        // - Admin/Owner -> /admin (or redirectTarget if specifically requested)
        // - If community verification is OFF -> /library
        // - If community verification is ON and verified -> /library
        // - If community verification is ON and unverified -> /community
        let destination = isAdmin ? '/admin' : ((!requireCommunity || communityJoined) ? '/library' : '/community');
        if (redirectTarget) {
          destination = redirectTarget;
        }

        const response = NextResponse.redirect(new URL(destination, origin));

        response.cookies.set({
          name: COMM_FLAG_COOKIE,
          value: await signCommFlag(requireCommunity),
          path: '/',
          httpOnly: true,
          sameSite: 'lax',
          maxAge: COMM_FLAG_MAX_AGE,
        });

        // CRITICAL: Propagate all Supabase SSR session cookies to the redirect response!
        cookiesToSetLater.forEach(({ name, value, options }) => {
          response.cookies.set(name, value, options);
        });

        // Also set the unified cc_session token cookie
        response.cookies.set({
          name: SESSION_COOKIE_NAME,
          value: sessionToken,
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
          path: '/',
          maxAge: 30 * 24 * 60 * 60,
        });

        return response;
      } else {
        console.error('Supabase exchangeCodeForSession error:', error);
        const desc = encodeURIComponent(error?.message || 'OAuth code exchange failed');
        return NextResponse.redirect(
          new URL(`/login?error=oauth_exchange_failed&error_description=${desc}`, origin)
        );
      }
    }
  }

  // Fallback if code exchange failed or not present
  return NextResponse.redirect(new URL('/login?error=oauth_exchange_failed', origin));
}
