/**
 * Unit-economics metering — cost-per-proposal plumbing, stood up in M2 before
 * generation (M3) so we never scale blind to margin.
 *
 * Pure cost math here; persistence lives in `lib/usage-db.ts`. Every LLM call
 * (and any other metered action) produces a UsageEvent carrying token counts and
 * the modelled cost in pence, tagged by user + plan, so we can answer
 * "what does a proposal cost us, and is each plan profitable?" from one table.
 */

import type { PlanId } from './plans';

export interface TokenUsage {
  inputTokens: number;
  outputTokens: number;
}

/** Per-model pricing in GBP pence per 1,000,000 tokens. */
export interface ModelPricing {
  inputPencePerMillion: number;
  outputPencePerMillion: number;
}

/**
 * Modelled provider pricing. Approximate (USD list prices converted at a flat
 * rate); the point is directional margin tracking, not invoicing. Update as
 * provider prices or FX move. Keyed by the model id the LLMProvider reports.
 */
export const MODEL_PRICING: Record<string, ModelPricing> = {
  // Placeholder economy/quality tiers; real model ids land with M3 generation.
  'stub-echo': { inputPencePerMillion: 0, outputPencePerMillion: 0 },
  'claude-haiku-4-5': { inputPencePerMillion: 80, outputPencePerMillion: 400 },
  'claude-sonnet-4-6': { inputPencePerMillion: 240, outputPencePerMillion: 1200 },
};

export const UNKNOWN_MODEL_PRICING: ModelPricing = {
  inputPencePerMillion: 0,
  outputPencePerMillion: 0,
};

export function pricingForModel(model: string): ModelPricing {
  return MODEL_PRICING[model] ?? UNKNOWN_MODEL_PRICING;
}

/**
 * Cost of a single call in pence (floating — sub-penny precision matters when
 * aggregating thousands of calls). Round only at display/reporting time.
 */
export function computeCostPence(usage: TokenUsage, pricing: ModelPricing): number {
  const input = (usage.inputTokens / 1_000_000) * pricing.inputPencePerMillion;
  const output = (usage.outputTokens / 1_000_000) * pricing.outputPencePerMillion;
  return input + output;
}

export type UsageKind = 'generation' | 'other';

export interface UsageEvent {
  userId: string;
  plan: PlanId;
  kind: UsageKind;
  model: string;
  inputTokens: number;
  outputTokens: number;
  costPence: number;
  /** ISO-8601; caller supplies it so this stays pure/testable. */
  createdAt: string;
}

/**
 * Build a metered usage event from a completed call. Computes cost from the
 * model's pricing so callers cannot forget to. This is the one place token
 * usage becomes money.
 */
export function buildUsageEvent(params: {
  userId: string;
  plan: PlanId;
  kind: UsageKind;
  model: string;
  usage: TokenUsage;
  createdAt: string;
}): UsageEvent {
  const costPence = computeCostPence(params.usage, pricingForModel(params.model));
  return {
    userId: params.userId,
    plan: params.plan,
    kind: params.kind,
    model: params.model,
    inputTokens: params.usage.inputTokens,
    outputTokens: params.usage.outputTokens,
    costPence,
    createdAt: params.createdAt,
  };
}

/** Average cost per event in pence, for cost-per-proposal reporting. 0 if empty. */
export function averageCostPence(events: Pick<UsageEvent, 'costPence'>[]): number {
  if (events.length === 0) return 0;
  const total = events.reduce((sum, e) => sum + e.costPence, 0);
  return total / events.length;
}
