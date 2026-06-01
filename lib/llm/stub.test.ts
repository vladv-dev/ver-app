import { describe, expect, it } from 'vitest';
import { StubLLMProvider } from './stub';
import { buildUsageEvent } from '@/lib/usage';

describe('StubLLMProvider', () => {
  it('echoes the prompt and reports non-zero token usage', async () => {
    const provider = new StubLLMProvider();
    const result = await provider.generate({
      model: 'stub-echo',
      prompt: 'write a proposal for a roofing job',
    });
    expect(result.text).toContain('write a proposal');
    expect(result.usage.inputTokens).toBeGreaterThan(0);
    expect(result.usage.outputTokens).toBeGreaterThan(0);
  });

  it('feeds straight into the metering pipeline', async () => {
    const result = await new StubLLMProvider().generate({
      model: 'claude-haiku-4-5',
      prompt: 'hello world',
    });
    const event = buildUsageEvent({
      userId: 'u1',
      plan: 'free',
      kind: 'generation',
      model: result.model,
      usage: result.usage,
      createdAt: '2026-06-01T00:00:00.000Z',
    });
    // claude-haiku-4-5 has non-zero pricing, so a real call costs > 0.
    expect(event.costPence).toBeGreaterThan(0);
  });
});
