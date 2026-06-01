/**
 * Usage-event persistence — writes the metered cost-per-proposal events built by
 * `lib/usage.ts` into the `usage_events` table, and reads back period totals for
 * gating + unit-economics reporting. Cost math stays pure in `usage.ts`; this is
 * just the DB edge.
 */
import type { SupabaseClient } from '@supabase/supabase-js';
import type { UsageEvent } from '@/lib/usage';

/** Persist one metered event (admin client; server-only). */
export async function recordUsageEvent(
  admin: SupabaseClient,
  event: UsageEvent,
): Promise<void> {
  const { error } = await admin.from('usage_events').insert({
    user_id: event.userId,
    plan: event.plan,
    kind: event.kind,
    model: event.model,
    input_tokens: event.inputTokens,
    output_tokens: event.outputTokens,
    cost_pence: event.costPence,
    created_at: event.createdAt,
  });
  if (error) throw new Error(`Failed to record usage event: ${error.message}`);
}

/**
 * Count a user's generations since `sinceIso` (start of their billing period),
 * for enforcing plan generation caps. Defaults to 0 on error to avoid hard
 * failures in the gating path.
 */
export async function countGenerationsSince(
  supabase: SupabaseClient,
  userId: string,
  sinceIso: string,
): Promise<number> {
  const { count, error } = await supabase
    .from('usage_events')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('kind', 'generation')
    .gte('created_at', sinceIso);
  if (error || count == null) return 0;
  return count;
}
