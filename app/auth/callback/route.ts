/**
 * Auth callback — exchanges the `?code` from a Google OAuth redirect or an email
 * magic link for a session cookie, then sends the user on to `next` (default
 * /dashboard). Supabase Auth redirects here after the user authenticates.
 */
import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const next = url.searchParams.get('next') ?? '/dashboard';

  if (code) {
    const supabase = createSupabaseServerClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) {
      return NextResponse.redirect(new URL('/login?error=auth', url.origin));
    }
  }

  return NextResponse.redirect(new URL(next, url.origin));
}
