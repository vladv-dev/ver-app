/**
 * PaymentProvider — the swap-seam over our billing vendor. App code (checkout,
 * portal, webhook routes) depends on this interface, never on Stripe directly,
 * so swapping providers is a single-file change (add an impl + flip the factory).
 */
import type { PlanId } from '@/lib/plans';
import type { SubscriptionStatus } from '@/lib/entitlements';

export interface CheckoutParams {
  userId: string;
  email: string;
  plan: PlanId;
  /** Existing vendor customer id, if the user already has one. */
  customerId?: string | null;
  successUrl: string;
  cancelUrl: string;
}

export interface PortalParams {
  customerId: string;
  returnUrl: string;
}

/**
 * Normalized result of a verified billing webhook: the entitlement change to
 * persist. Returns null for events we don't act on, so the route can ack them.
 */
export interface BillingChange {
  userId: string;
  customerId: string;
  subscriptionId: string | null;
  plan: PlanId;
  status: SubscriptionStatus;
  currentPeriodEnd: string | null;
}

export interface PaymentProvider {
  /** Create a hosted checkout session for `plan`; returns the redirect URL. */
  createCheckoutSession(params: CheckoutParams): Promise<{ url: string }>;

  /** Create a customer-portal session for self-serve plan/billing management. */
  createPortalSession(params: PortalParams): Promise<{ url: string }>;

  /**
   * Verify a webhook's signature and translate it into a BillingChange (or null
   * for ignored events). Throws if the signature is invalid — the route must
   * reject with 400 so unverified payloads never reach the DB.
   */
  parseWebhook(rawBody: string, signature: string): Promise<BillingChange | null>;
}
