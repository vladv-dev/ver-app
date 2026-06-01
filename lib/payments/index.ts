/**
 * Payment provider factory. The single place app code obtains a PaymentProvider.
 * Swapping vendors = add an impl and branch here (e.g. on PAYMENT_PROVIDER env).
 */
import type { PaymentProvider } from './provider';
import { StripePaymentProvider } from './stripe';

let cached: PaymentProvider | null = null;

export function getPaymentProvider(): PaymentProvider {
  if (!cached) cached = new StripePaymentProvider();
  return cached;
}

export type { PaymentProvider } from './provider';
