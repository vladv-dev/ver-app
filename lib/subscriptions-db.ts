/**
 * Subscription persistence — the bridge between Stripe's view of billing and our
 * `subscriptions` table. The webhook writes here (admin client); gating reads
 * here (user or admin client). All reads funnel through `deriveEntitlement` so
 * access logic lives in one tested place.
 */
import type { SupabaseClient } from '@supabase/supabase-js';
import {
  deriveEntitlement,
  type Entitlement,
  FREE_ENTITLEMENT,
  type SubscriptionRecord,
  type SubscriptionStatus,
} from '@/lib/entitlements';
import type { PlanId } from '@/lib/plans';

/** Raw DB row shape (snake_case) for the `subscriptions` table. */
interface SubscriptionRow {
  plan: PlanId;
  status: SubscriptionStatus;
  current_period_end: string | null;
  stripe_customer_id: string | null;
}

function toRecord(row: SubscriptionRow): SubscriptionRecord {
  return {
    plan: row.plan,
    status: row.status,
    currentPeriodEnd: row.current_period_end,
  };
}

/**
 * Resolve a user's entitlement. Any DB error or missing row degrades safely to
 * the free trial rather than locking a paying customer out on a transient error.
 */
export async function getEntitlement(
  supabase: SupabaseClient,
  userId: string,
): Promise<Entitlement> {
  const { data, error } = await supabase
    .from('subscriptions')
    .select('plan, status, current_period_end, stripe_customer_id')
    .eq('user_id', userId)
    .maybeSingle();

  if (error || !data) return FREE_ENTITLEMENT;
  return deriveEntitlement(toRecord(data as SubscriptionRow));
}

/** Look up a user's Stripe customer id (for the Customer Portal). */
export async function getStripeCustomerId(
  supabase: SupabaseClient,
  userId: string,
): Promise<string | null> {
  const { data } = await supabase
    .from('subscriptions')
    .select('stripe_customer_id')
    .eq('user_id', userId)
    .maybeSingle();
  return (data?.stripe_customer_id as string | null) ?? null;
}

export interface SubscriptionUpsert {
  userId: string;
  stripeCustomerId: string;
  stripeSubscriptionId: string | null;
  plan: PlanId;
  status: SubscriptionStatus;
  currentPeriodEnd: string | null;
}

/**
 * Idempotently write the latest billing state for a user. Called from the Stripe
 * webhook with an admin client. Keyed by user_id so repeated webhook deliveries
 * converge to the same row (Stripe delivers at-least-once).
 */
export async function upsertSubscription(
  admin: SupabaseClient,
  data: SubscriptionUpsert,
): Promise<void> {
  const { error } = await admin.from('subscriptions').upsert(
    {
      user_id: data.userId,
      stripe_customer_id: data.stripeCustomerId,
      stripe_subscription_id: data.stripeSubscriptionId,
      plan: data.plan,
      status: data.status,
      current_period_end: data.currentPeriodEnd,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'user_id' },
  );
  if (error) throw new Error(`Failed to upsert subscription: ${error.message}`);
}
