/**
 * Supabase browser client — for client components (e.g. the login form calling
 * signInWithOAuth / signInWithOtp). Uses only public anon credentials.
 */
'use client';
import { createBrowserClient } from '@supabase/ssr';

export function createSupabaseBrowserClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
