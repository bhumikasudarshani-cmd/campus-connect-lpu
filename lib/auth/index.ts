import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';
import { User } from '../db/types';
import { getUserById, getUserByEmail, upsertUser, isAdmin as checkIsAdmin, getUserRole, isOwner as checkIsOwner, touchUserActivity } from '../db';
import { createServerSupabaseClient } from '../supabase/server';

const SECRET_KEY = new TextEncoder().encode(
  process.env.JWT_SECRET || 'cc_lpu_sec_auth_rotated_token_9f82b7c1e4a3d6052841_2026'
);

export const SESSION_COOKIE_NAME = 'cc_session';

export interface SessionPayload {
  userId: string;
  email: string;
  name: string;
  avatar_url?: string;
  community_joined: boolean;
  isAdmin: boolean;
  isOwner?: boolean;
  role?: 'owner' | 'admin' | 'user';
  year?: number;
  iat?: number;
  exp?: number;
}

export async function signSession(user: User, isAdminUser: boolean, role?: 'owner' | 'admin' | 'user'): Promise<string> {
  const isOwnerUser = role === 'owner' || user.email.toLowerCase() === 'mishra.rajvansh11@gmail.com';
  const effectiveRole = isOwnerUser ? 'owner' : (isAdminUser ? 'admin' : 'user');

  const payload: SessionPayload = {
    userId: user.id,
    email: user.email,
    name: user.name,
    avatar_url: user.avatar_url,
    community_joined: user.community_joined,
    isAdmin: isOwnerUser || isAdminUser,
    isOwner: isOwnerUser,
    role: effectiveRole,
    year: user.year || undefined,
  };

  return await new SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('30d')
    .sign(SECRET_KEY);
}

export async function verifySession(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, SECRET_KEY);
    return payload as unknown as SessionPayload;
  } catch (err) {
    return null;
  }
}

// In-memory throttle for activity updates (once every 5 minutes per user)
const activityThrottleMap = new Map<string, number>();

function recordActivityNonBlocking(userId: string) {
  if (!userId) return;
  const now = Date.now();
  const last = activityThrottleMap.get(userId) || 0;
  if (now - last > 5 * 60 * 1000) {
    activityThrottleMap.set(userId, now);
    touchUserActivity(userId).catch(() => {});
  }
}

export async function getCurrentSession(): Promise<SessionPayload | null> {
  try {
    // 1. Fast path: Check HTTP session cookie (0.05ms in-memory cryptographic verification)
    const cookieStore = cookies();
    const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
    if (token) {
      const payload = await verifySession(token);
      if (payload) {
        // Asynchronously update activity timestamp without blocking request
        recordActivityNonBlocking(payload.userId);

        const isOwnerUser = payload.isOwner || payload.role === 'owner' || payload.email?.toLowerCase() === 'mishra.rajvansh11@gmail.com';
        const isAdminUser = isOwnerUser || payload.isAdmin || payload.role === 'admin';

        return {
          ...payload,
          isAdmin: isAdminUser,
          isOwner: isOwnerUser,
          role: isOwnerUser ? 'owner' : (payload.role || (isAdminUser ? 'admin' : 'user')),
        };
      }
    }

    // 2. Fallback: Supabase Auth session if configured and no valid JWT cookie
    const supabase = createServerSupabaseClient();
    if (supabase) {
      try {
        const { data: { user: authUser } } = await supabase.auth.getUser();
        if (authUser) {
          const [profile, userRole] = await Promise.all([
            getUserById(authUser.id),
            getUserRole(authUser.email || authUser.id),
          ]);
          const isOwnerUser = userRole === 'owner' || authUser.email?.toLowerCase() === 'mishra.rajvansh11@gmail.com';
          const isAdminUser = isOwnerUser || userRole === 'admin';
          const communityJoined = profile ? profile.community_joined : false;

          recordActivityNonBlocking(authUser.id);

          return {
            userId: authUser.id,
            email: authUser.email || '',
            name: profile?.name || authUser.user_metadata?.full_name || authUser.user_metadata?.name || authUser.email?.split('@')[0] || 'Student',
            avatar_url: profile?.avatar_url || authUser.user_metadata?.avatar_url || authUser.user_metadata?.picture,
            community_joined: communityJoined,
            isAdmin: isAdminUser,
            isOwner: isOwnerUser,
            role: isOwnerUser ? 'owner' : userRole,
            year: profile?.year || undefined,
          };
        }
      } catch (sbErr) {
        // Fallback
      }
    }

    return null;
  } catch (err) {
    return null;
  }
}

export async function loginWithGoogleProfile(profile: {
  name: string;
  email: string;
  avatar_url?: string;
  subId?: string;
}): Promise<{ token: string; user: User; isAdmin: boolean; isOwner: boolean; role: 'owner' | 'admin' | 'user' }> {
  const existing = await getUserByEmail(profile.email);
  const id = existing ? existing.id : (profile.subId && /^[0-9a-f-]{36}$/i.test(profile.subId) ? profile.subId : crypto.randomUUID());

  const userRole = await getUserRole(profile.email);
  const isOwnerUser = userRole === 'owner';
  const isAdminUser = isOwnerUser || userRole === 'admin';

  const user = await upsertUser({
    id,
    name: profile.name,
    email: profile.email,
    avatar_url: profile.avatar_url,
    community_joined: existing ? existing.community_joined : false,
    year: existing?.year ?? undefined,
  });

  const token = await signSession(user, isAdminUser, userRole);

  return { token, user, isAdmin: isAdminUser, isOwner: isOwnerUser, role: userRole };
}
