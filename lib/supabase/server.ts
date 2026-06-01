/**
 * Supabase server client — bound to the request's cookies so it carries the
 * signed-in user's session in Server Components, Route Handlers, and Actions.
 * Use this for anything that reads/writes as the user (RLS enforced).
 */
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import { requireEnv } from '@/lib/env';

export function createSupabaseServerClient() {
  const cookieStore = cookies();
  return createServerClient(
    requireEnv('NEXT_PUBLIC_SUPABASE_URL'),
    requireEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY'),
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // `set` throws in Server Components (read-only cookies). The session
            // is refreshed in middleware, so this is safe to ignore here.
          }
        },
      },
    },
  );
}
