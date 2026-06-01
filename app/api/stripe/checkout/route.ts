/**
 * Start a Stripe Checkout session for the signed-in user. Server-side gated:
 * unauthenticated callers get 401; only purchasable plans are accepted.
 */
import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { getPaymentProvider } from '@/lib/payments';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { getStripeCustomerId } from '@/lib/subscriptions-db';
import { isPlanId, paidPlans } from '@/lib/plans';
import { appUrl } from '@/lib/env';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const body = (await request.json().catch(() => ({}))) as { plan?: string };
  const plan = body.plan;
  if (!plan || !isPlanId(plan) || !paidPlans().some((p) => p.id === plan)) {
    return NextResponse.json({ error: 'Invalid plan' }, { status: 400 });
  }

  const customerId = await getStripeCustomerId(
    createSupabaseServerClient(),
    user.id,
  );

  try {
    const { url } = await getPaymentProvider().createCheckoutSession({
      userId: user.id,
      email: user.email ?? '',
      plan,
      customerId,
      successUrl: `${appUrl()}/dashboard?checkout=success`,
      cancelUrl: `${appUrl()}/pricing?checkout=cancelled`,
    });
    return NextResponse.json({ url });
  } catch (err) {
    console.error('Checkout session creation failed:', err);
    return NextResponse.json({ error: 'Checkout unavailable' }, { status: 500 });
  }
}
