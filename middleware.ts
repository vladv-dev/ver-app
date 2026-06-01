/**
 * Refreshes the Supabase auth session on every request so Server Components see
 * a fresh session (cookies can only be written from middleware / route handlers).
 * No-ops cleanly until Supabase env is configured, keeping the app buildable and
 * runnable pre-provisioning.
 */
import { type NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';

export async function middleware(request: NextRequest) {
  const response = NextResponse.next({ request });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anon) return response;

  const supabase = createServerClient(url, anon, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options),
        );
      },
    },
  });

  // Touch the session so expiring tokens are refreshed into the response cookies.
  await supabase.auth.getUser();
  return response;
}

export const config = {
  // Run on app routes, skip static assets and Next internals.
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
};
