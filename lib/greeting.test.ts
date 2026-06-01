import { describe, expect, it } from 'vitest';
import { greeting } from './greeting';

describe('greeting', () => {
  it('defaults to world', () => {
    expect(greeting()).toBe('Hello, world!');
  });

  it('uses the provided name', () => {
    expect(greeting('VER')).toBe('Hello, VER!');
  });
});
