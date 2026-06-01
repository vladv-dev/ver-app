/**
 * Entitlement derivation — translates a raw subscription row (whatever the DB
 * holds) into "what can this user actually do right now". Pure and DB-agnostic
 * so gating logic is unit-tested without a database or Stripe.
 *
 * The webhook writes Stripe's view into `subscriptions`; everything that gates
 * access reads it back through `deriveEntitlement`. One funnel in, one out.
 */

import { getPlan, type PlanId, planSatisfies } from './plans';

/** Subset of Stripe subscription statuses we care about, plus our own default. */
export type SubscriptionStatus =
  | 'trialing'
  | 'active'
  | 'past_due'
  | 'canceled'
  | 'incomplete'
  | 'incomplete_expired'
  | 'unpaid'
  | 'paused'
  | 'none';

/** Shape persisted in the `subscriptions` table (snake-cased at the DB edge). */
export interface SubscriptionRecord {
  plan: PlanId;
  status: SubscriptionStatus;
  /** ISO-8601 string, or null when there is no paid period (free trial). */
  currentPeriodEnd: string | null;
}

export interface Entitlement {
  plan: PlanId;
  status: SubscriptionStatus;
  /** True when the user may use paid-tier features (billing is in good standing). */
  active: boolean;
  currentPeriodEnd: string | null;
  /** Generations allowed this billing period for the effective plan. */
  monthlyGenerations: number;
}

/** Statuses where access should be granted. `past_due` keeps access (dunning grace). */
const ACTIVE_STATUSES: ReadonlySet<SubscriptionStatus> = new Set([
  'trialing',
  'active',
  'past_due',
]);

/** Everyone starts here: free trial, no card, no Stripe record. */
export const FREE_ENTITLEMENT: Entitlement = {
  plan: 'free',
  status: 'none',
  active: true,
  currentPeriodEnd: null,
  monthlyGenerations: getPlan('free').monthlyGenerations,
};

/**
 * Map a subscription row (or null) to an entitlement. A missing/empty row means
 * the user is on the free trial. A non-active paid status downgrades the
 * effective plan to free so they keep a usable (if limited) product.
 */
export function deriveEntitlement(record: SubscriptionRecord | null): Entitlement {
  if (!record) return FREE_ENTITLEMENT;

  const active = ACTIVE_STATUSES.has(record.status);
  const effectivePlan: PlanId = active ? record.plan : 'free';

  return {
    plan: effectivePlan,
    status: record.status,
    active,
    currentPeriodEnd: record.currentPeriodEnd,
    monthlyGenerations: getPlan(effectivePlan).monthlyGenerations,
  };
}

/** Server-side gate: does this entitlement grant at least `required`? */
export function isEntitledTo(entitlement: Entitlement, required: PlanId): boolean {
  return entitlement.active && planSatisfies(entitlement.plan, required);
}

/** Has the user exhausted their plan's monthly generation allowance? */
export function hasGenerationsLeft(
  entitlement: Entitlement,
  usedThisPeriod: number,
): boolean {
  return usedThisPeriod < entitlement.monthlyGenerations;
}
