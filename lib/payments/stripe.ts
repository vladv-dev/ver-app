/**
 * Stripe implementation of PaymentProvider. The only file that imports the
 * Stripe SDK — everything else talks to the PaymentProvider interface.
 */
import Stripe from 'stripe';
import { requireEnv } from '@/lib/env';
import { getPlan, type PlanId, planForStripePrice } from '@/lib/plans';
import type { SubscriptionStatus } from '@/lib/entitlements';
import type {
  BillingChange,
  CheckoutParams,
  PaymentProvider,
  PortalParams,
} from './provider';

/** Stripe subscription statuses map 1:1 onto ours; pass through. */
function toStatus(s: Stripe.Subscription.Status): SubscriptionStatus {
  return s as SubscriptionStatus;
}

/** current_period_end moved between subscription and item across API versions. */
function periodEndIso(sub: Stripe.Subscription): string | null {
  const top = (sub as unknown as { current_period_end?: number })
    .current_period_end;
  const item = sub.items?.data?.[0] as unknown as {
    current_period_end?: number;
  };
  const unix = top ?? item?.current_period_end;
  return unix ? new Date(unix * 1000).toISOString() : null;
}

export class StripePaymentProvider implements PaymentProvider {
  private readonly stripe: Stripe;
  private readonly webhookSecret: string;

  constructor() {
    this.stripe = new Stripe(requireEnv('STRIPE_SECRET_KEY'));
    this.webhookSecret = requireEnv('STRIPE_WEBHOOK_SECRET');
  }

  private priceIdForPlan(plan: PlanId): string {
    const { stripePriceEnv } = getPlan(plan);
    if (!stripePriceEnv) {
      throw new Error(`Plan "${plan}" is not purchasable (no Stripe price).`);
    }
    return requireEnv(stripePriceEnv);
  }

  async createCheckoutSession(params: CheckoutParams): Promise<{ url: string }> {
    const session = await this.stripe.checkout.sessions.create({
      mode: 'subscription',
      line_items: [{ price: this.priceIdForPlan(params.plan), quantity: 1 }],
      success_url: params.successUrl,
      cancel_url: params.cancelUrl,
      client_reference_id: params.userId,
      // Reuse an existing customer, else let Stripe create one from the email.
      ...(params.customerId
        ? { customer: params.customerId }
        : { customer_email: params.email }),
      // Stamp the user id onto the subscription so webhooks can map back to us.
      subscription_data: { metadata: { userId: params.userId } },
      allow_promotion_codes: true,
    });
    if (!session.url) throw new Error('Stripe did not return a checkout URL');
    return { url: session.url };
  }

  async createPortalSession(params: PortalParams): Promise<{ url: string }> {
    const session = await this.stripe.billingPortal.sessions.create({
      customer: params.customerId,
      return_url: params.returnUrl,
    });
    return { url: session.url };
  }

  async parseWebhook(
    rawBody: string,
    signature: string,
  ): Promise<BillingChange | null> {
    // Throws on a bad signature — caller turns that into a 400.
    const event = this.stripe.webhooks.constructEvent(
      rawBody,
      signature,
      this.webhookSecret,
    );

    switch (event.type) {
      case 'customer.subscription.created':
      case 'customer.subscription.updated':
      case 'customer.subscription.deleted':
        return this.fromSubscription(event.data.object as Stripe.Subscription);
      default:
        return null; // Acked but not acted on.
    }
  }

  private fromSubscription(sub: Stripe.Subscription): BillingChange | null {
    const userId = sub.metadata?.userId;
    if (!userId) return null; // Not one of ours / missing mapping.

    const priceId = sub.items?.data?.[0]?.price?.id;
    const plan = priceId ? planForStripePrice(priceId, process.env) : null;
    if (!plan) return null; // Unknown price; nothing to grant.

    const customerId =
      typeof sub.customer === 'string' ? sub.customer : sub.customer.id;

    return {
      userId,
      customerId,
      subscriptionId: sub.id,
      plan,
      status: toStatus(sub.status),
      currentPeriodEnd: periodEndIso(sub),
    };
  }
}
