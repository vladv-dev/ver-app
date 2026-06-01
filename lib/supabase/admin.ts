/**
 * Supabase admin client — uses the service-role key and BYPASSES Row Level
 * Security. Server-only. Never import this into client code or expose the key.
 *
 * Use it strictly for trusted server work that must write on the user's behalf
 * without a user session: Stripe webhooks updating entitlements, and recording
 * metered usage events.
 */
import { createClient } from '@supabase/supabase-js';
import { requireEnv } from '@/lib/env';

export function createSupabaseAdminClient() {
  return createClient(
    requireEnv('NEXT_PUBLIC_SUPABASE_URL'),
    requireEnv('SUPABASE_SERVICE_ROLE_KEY'),
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}
