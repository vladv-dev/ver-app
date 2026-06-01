/**
 * Stripe webhook → entitlement state. The ONLY writer of `subscriptions`.
 * Verifies the signature (via the provider), then upserts the normalized billing
 * change with the service-role client. Idempotent: Stripe delivers at-least-once
 * and the upsert is keyed by user_id.
 */
import { NextResponse } from 'next/server';
import { getPaymentProvider } from '@/lib/payments';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { upsertSubscription } from '@/lib/subscriptions-db';

// Stripe SDK needs Node crypto + the raw body; force the Node runtime.
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  const signature = request.headers.get('stripe-signature');
  if (!signature) {
    return NextResponse.json({ error: 'Missing signature' }, { status: 400 });
  }

  const rawBody = await request.text();

  let change;
  try {
    change = await getPaymentProvider().parseWebhook(rawBody, signature);
  } catch (err) {
    // Bad signature or unparsable payload — never let it reach the DB.
    console.error('Stripe webhook verification failed:', err);
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  if (!change) return NextResponse.json({ received: true });

  try {
    await upsertSubscription(createSupabaseAdminClient(), {
      userId: change.userId,
      stripeCustomerId: change.customerId,
      stripeSubscriptionId: change.subscriptionId,
      plan: change.plan,
      status: change.status,
      currentPeriodEnd: change.currentPeriodEnd,
    });
  } catch (err) {
    // Return 500 so Stripe retries — better than silently dropping a payment.
    console.error('Failed to persist entitlement:', err);
    return NextResponse.json({ error: 'Persist failed' }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
