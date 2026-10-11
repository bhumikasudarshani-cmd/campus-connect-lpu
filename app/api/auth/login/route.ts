import { NextResponse } from 'next/server';

/**
 * SECURITY LOCKDOWN:
 * Direct unauthenticated email-based login is permanently disabled.
 * All legitimate authentication in Campus Connect LPU goes through
 * verified Google OAuth with Supabase code exchange at `/auth/callback`.
 */
export async function POST() {
  return NextResponse.json(
    { error: 'Endpoint permanently disabled. All logins must proceed through verified Google OAuth.' },
    { status: 404 }
  );
}

export async function GET() {
  return NextResponse.json(
    { error: 'Endpoint permanently disabled.' },
    { status: 404 }
  );
}
