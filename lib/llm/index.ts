/**
 * LLM provider factory. Returns the stub until M3 connects a real model behind
 * the same LLMProvider interface — swapping is a single branch here.
 */
import type { LLMProvider } from './provider';
import { StubLLMProvider } from './stub';

let cached: LLMProvider | null = null;

export function getLLMProvider(): LLMProvider {
  if (!cached) cached = new StubLLMProvider();
  return cached;
}

export type { LLMProvider, LLMRequest, LLMResult } from './provider';
