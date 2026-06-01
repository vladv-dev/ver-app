import { describe, expect, it } from 'vitest';
import {
  averageCostPence,
  buildUsageEvent,
  computeCostPence,
  pricingForModel,
  UNKNOWN_MODEL_PRICING,
} from './usage';

describe('computeCostPence', () => {
  it('costs input and output tokens at their per-million rate', () => {
    // 1M input @ 80p + 0.5M output @ 400p = 80 + 200 = 280p
    const cost = computeCostPence(
      { inputTokens: 1_000_000, outputTokens: 500_000 },
      { inputPencePerMillion: 80, outputPencePerMillion: 400 },
    );
    expect(cost).toBeCloseTo(280, 6);
  });

  it('handles sub-million counts with sub-penny precision', () => {
    const cost = computeCostPence(
      { inputTokens: 1000, outputTokens: 1000 },
      { inputPencePerMillion: 240, outputPencePerMillion: 1200 },
    );
    expect(cost).toBeCloseTo(0.24 + 1.2, 6);
  });

  it('is zero for zero tokens', () => {
    expect(
      computeCostPence({ inputTokens: 0, outputTokens: 0 }, UNKNOWN_MODEL_PRICING),
    ).toBe(0);
  });
});

describe('pricingForModel', () => {
  it('returns known pricing', () => {
    expect(pricingForModel('claude-haiku-4-5').inputPencePerMillion).toBe(80);
  });
  it('falls back to zero pricing for unknown models', () => {
    expect(pricingForModel('mystery-model')).toEqual(UNKNOWN_MODEL_PRICING);
  });
});

describe('buildUsageEvent', () => {
  it('computes cost from the model and carries plan/user tags', () => {
    const e = buildUsageEvent({
      userId: 'u1',
      plan: 'starter',
      kind: 'generation',
      model: 'claude-haiku-4-5',
      usage: { inputTokens: 1_000_000, outputTokens: 1_000_000 },
      createdAt: '2026-06-01T00:00:00.000Z',
    });
    expect(e.costPence).toBeCloseTo(80 + 400, 6);
    expect(e.plan).toBe('starter');
    expect(e.userId).toBe('u1');
    expect(e.kind).toBe('generation');
  });
});

describe('averageCostPence', () => {
  it('averages event costs', () => {
    expect(averageCostPence([{ costPence: 10 }, { costPence: 20 }])).toBe(15);
  });
  it('is zero for an empty set', () => {
    expect(averageCostPence([])).toBe(0);
  });
});
