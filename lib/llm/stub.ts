/**
 * Stub LLM provider — placeholder until M3 wires a real model. It echoes the
 * prompt and reports plausible (rough word-count) token usage so the metering
 * pipeline can be exercised end-to-end before a real vendor is connected.
 */
import type { LLMProvider, LLMRequest, LLMResult } from './provider';

/** Crude token estimate: ~1.3 tokens per whitespace word. Good enough for the stub. */
function estimateTokens(text: string): number {
  const words = text.trim().split(/\s+/).filter(Boolean).length;
  return Math.ceil(words * 1.3);
}

export class StubLLMProvider implements LLMProvider {
  async generate(request: LLMRequest): Promise<LLMResult> {
    const text = `[stub:${request.model}] ${request.prompt}`;
    return {
      text,
      model: request.model,
      usage: {
        inputTokens: estimateTokens(`${request.system ?? ''} ${request.prompt}`),
        outputTokens: estimateTokens(text),
      },
    };
  }
}
