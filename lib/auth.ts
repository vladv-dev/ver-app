/**
 * Server-side auth helpers. `getCurrentUser` is the canonical "who is signed in"
 * check — it validates the session against Supabase Auth (not just a cookie), so
 * it is safe to gate on. Returns null when signed out.
 */
import type { User } from '@supabase/supabase-js';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export async function getCurrentUser(): Promise<User | null> {
  const supabase = createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user ?? null;
}
