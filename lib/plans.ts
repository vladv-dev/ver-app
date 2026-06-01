/**
 * Plan catalog — the single source of truth for what we sell.
 *
 * Pure data + lookups, no Stripe/DB imports, so it is trivially unit-tested and
 * usable on both server and client. Stripe price IDs live in env (one per plan)
 * so the catalog itself never hard-codes account-specific identifiers.
 */

export type PlanId = 'free' | 'starter' | 'pro';

export interface Plan {
  id: PlanId;
  name: string;
  /** Monthly price in GBP pence (e.g. 2900 = £29.00). 0 for the free trial. */
  pricePence: number;
  /** Name of the env var holding this plan's Stripe Price ID (paid plans only). */
  stripePriceEnv?: string;
  /** Generations included per month. Drives gating + cost-per-proposal headroom. */
  monthlyGenerations: number;
  /** Marketing blurb for the pricing UI. */
  tagline: string;
}

/** Ordered cheapest → most expensive. Order is also the access ranking. */
export const PLANS: readonly Plan[] = [
  {
    id: 'free',
    name: 'Free trial',
    pricePence: 0,
    monthlyGenerations: 3,
    tagline: 'Kick the tyres. A few generations on us, no card required.',
  },
  {
    id: 'starter',
    name: 'Starter',
    pricePence: 2900,
    stripePriceEnv: 'STRIPE_PRICE_STARTER',
    monthlyGenerations: 50,
    tagline: 'For solo operators shipping proposals every week.',
  },
  {
    id: 'pro',
    name: 'Pro',
    pricePence: 7900,
    stripePriceEnv: 'STRIPE_PRICE_PRO',
    monthlyGenerations: 250,
    tagline: 'For teams running proposals at volume.',
  },
] as const;

const PLAN_BY_ID: Record<PlanId, Plan> = PLANS.reduce(
  (acc, p) => ({ ...acc, [p.id]: p }),
  {} as Record<PlanId, Plan>,
);

/** Access ranking: free < starter < pro. Higher = more access. */
export const PLAN_RANK: Record<PlanId, number> = {
  free: 0,
  starter: 1,
  pro: 2,
};

export function isPlanId(value: string): value is PlanId {
  return value === 'free' || value === 'starter' || value === 'pro';
}

export function getPlan(id: PlanId): Plan {
  return PLAN_BY_ID[id];
}

/** Paid plans only (have a Stripe price). The free trial is excluded. */
export function paidPlans(): Plan[] {
  return PLANS.filter((p) => p.stripePriceEnv !== undefined);
}

/**
 * Resolve a Stripe Price ID back to a PlanId using the env mapping. Used by the
 * webhook to translate a subscription's price into our internal plan. Returns
 * null when the price is unknown (e.g. a legacy/removed price).
 */
export function planForStripePrice(
  priceId: string,
  env: Record<string, string | undefined>,
): PlanId | null {
  for (const plan of paidPlans()) {
    if (plan.stripePriceEnv && env[plan.stripePriceEnv] === priceId) {
      return plan.id;
    }
  }
  return null;
}

/** True when `have` grants at least the access of `need`. */
export function planSatisfies(have: PlanId, need: PlanId): boolean {
  return PLAN_RANK[have] >= PLAN_RANK[need];
}
