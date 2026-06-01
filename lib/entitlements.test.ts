import { describe, expect, it } from 'vitest';
import {
  deriveEntitlement,
  FREE_ENTITLEMENT,
  hasGenerationsLeft,
  isEntitledTo,
  type SubscriptionRecord,
} from './entitlements';

const sub = (over: Partial<SubscriptionRecord> = {}): SubscriptionRecord => ({
  plan: 'starter',
  status: 'active',
  currentPeriodEnd: '2026-07-01T00:00:00.000Z',
  ...over,
});

describe('deriveEntitlement', () => {
  it('falls back to free trial when there is no record', () => {
    expect(deriveEntitlement(null)).toEqual(FREE_ENTITLEMENT);
  });

  it('grants an active paid plan', () => {
    const e = deriveEntitlement(sub({ plan: 'pro', status: 'active' }));
    expect(e.plan).toBe('pro');
    expect(e.active).toBe(true);
    expect(e.monthlyGenerations).toBe(250);
  });

  it('treats trialing and past_due as active (dunning grace)', () => {
    expect(deriveEntitlement(sub({ status: 'trialing' })).active).toBe(true);
    expect(deriveEntitlement(sub({ status: 'past_due' })).active).toBe(true);
  });

  it('downgrades a canceled paid plan to free', () => {
    const e = deriveEntitlement(sub({ plan: 'pro', status: 'canceled' }));
    expect(e.plan).toBe('free');
    expect(e.active).toBe(false);
    expect(e.status).toBe('canceled');
    expect(e.monthlyGenerations).toBe(3);
  });
});

describe('isEntitledTo', () => {
  it('allows access at or above the required plan', () => {
    const pro = deriveEntitlement(sub({ plan: 'pro' }));
    expect(isEntitledTo(pro, 'starter')).toBe(true);
    expect(isEntitledTo(pro, 'pro')).toBe(true);
  });

  it('denies access below the required plan', () => {
    expect(isEntitledTo(FREE_ENTITLEMENT, 'starter')).toBe(false);
  });

  it('denies access when the subscription is inactive', () => {
    const dead = deriveEntitlement(sub({ plan: 'pro', status: 'canceled' }));
    expect(isEntitledTo(dead, 'starter')).toBe(false);
  });
});

describe('hasGenerationsLeft', () => {
  it('allows usage under the cap', () => {
    expect(hasGenerationsLeft(FREE_ENTITLEMENT, 2)).toBe(true);
  });
  it('blocks at the cap', () => {
    expect(hasGenerationsLeft(FREE_ENTITLEMENT, 3)).toBe(false);
  });
});
