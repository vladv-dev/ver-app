import { describe, expect, it } from 'vitest';
import {
  getPlan,
  isPlanId,
  paidPlans,
  planForStripePrice,
  planSatisfies,
  PLANS,
  PLAN_RANK,
} from './plans';

describe('plan catalog', () => {
  it('prices the three plans as specified (£0 / £29 / £79)', () => {
    expect(getPlan('free').pricePence).toBe(0);
    expect(getPlan('starter').pricePence).toBe(2900);
    expect(getPlan('pro').pricePence).toBe(7900);
  });

  it('orders plans cheapest to most expensive', () => {
    const prices = PLANS.map((p) => p.pricePence);
    expect(prices).toEqual([...prices].sort((a, b) => a - b));
  });
});

describe('isPlanId', () => {
  it.each(['free', 'starter', 'pro'])('accepts %s', (v) =>
    expect(isPlanId(v)).toBe(true),
  );
  it.each(['', 'enterprise', 'Pro', 'FREE'])('rejects %s', (v) =>
    expect(isPlanId(v)).toBe(false),
  );
});

describe('paidPlans', () => {
  it('excludes the free trial', () => {
    expect(paidPlans().map((p) => p.id)).toEqual(['starter', 'pro']);
  });
});

describe('planForStripePrice', () => {
  const env = {
    STRIPE_PRICE_STARTER: 'price_starter_123',
    STRIPE_PRICE_PRO: 'price_pro_456',
  };

  it('maps a known price to its plan', () => {
    expect(planForStripePrice('price_starter_123', env)).toBe('starter');
    expect(planForStripePrice('price_pro_456', env)).toBe('pro');
  });

  it('returns null for an unknown price', () => {
    expect(planForStripePrice('price_unknown', env)).toBeNull();
  });

  it('returns null when env is unset', () => {
    expect(planForStripePrice('price_starter_123', {})).toBeNull();
  });
});

describe('planSatisfies', () => {
  it('grants equal or higher plans', () => {
    expect(planSatisfies('pro', 'starter')).toBe(true);
    expect(planSatisfies('starter', 'starter')).toBe(true);
    expect(planSatisfies('pro', 'free')).toBe(true);
  });

  it('denies lower plans', () => {
    expect(planSatisfies('free', 'starter')).toBe(false);
    expect(planSatisfies('starter', 'pro')).toBe(false);
  });

  it('ranks free < starter < pro', () => {
    expect(PLAN_RANK.free).toBeLessThan(PLAN_RANK.starter);
    expect(PLAN_RANK.starter).toBeLessThan(PLAN_RANK.pro);
  });
});
