/**
 * LLMProvider — the swap-seam over our model vendor. Generation proper lands in
 * M3, but the seam and (crucially) the token-usage contract are defined now so
 * cost-per-proposal metering is wired from the first real call.
 *
 * Every completion MUST report token usage so `lib/usage.ts` can turn it into a
 * costed UsageEvent. A provider that can't report usage isn't acceptable — we
 * refuse to scale blind to margin.
 */
import type { TokenUsage } from '@/lib/usage';

export interface LLMRequest {
  /** Model id; must match a key in MODEL_PRICING for accurate costing. */
  model: string;
  system?: string;
  prompt: string;
  maxOutputTokens?: number;
}

export interface LLMResult {
  text: string;
  model: string;
  /** Token counts for metering — non-optional on purpose. */
  usage: TokenUsage;
}

export interface LLMProvider {
  generate(request: LLMRequest): Promise<LLMResult>;
}
