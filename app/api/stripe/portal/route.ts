/**
 * Open the Stripe Customer Portal for the signed-in user to manage/cancel their
 * subscription. Requires an existing Stripe customer (i.e. they have subscribed).
 */
import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { getPaymentProvider } from '@/lib/payments';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { getStripeCustomerId } from '@/lib/subscriptions-db';
import { appUrl } from '@/lib/env';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const customerId = await getStripeCustomerId(
    createSupabaseServerClient(),
    user.id,
  );
  if (!customerId) {
    return NextResponse.json({ error: 'No billing account yet' }, { status: 400 });
  }

  try {
    const { url } = await getPaymentProvider().createPortalSession({
      customerId,
      returnUrl: `${appUrl()}/dashboard`,
    });
    return NextResponse.json({ url });
  } catch (err) {
    console.error('Portal session creation failed:', err);
    return NextResponse.json({ error: 'Portal unavailable' }, { status: 500 });
  }
}
