import { describe, expect, it } from 'vitest';
import { buildSubmission, isValidEmail, normalizeEmail } from './waitlist';

describe('normalizeEmail', () => {
  it('trims and lowercases', () => {
    expect(normalizeEmail('  Foo@Bar.COM ')).toBe('foo@bar.com');
  });
});

describe('isValidEmail', () => {
  it.each(['a@b.co', 'foo.bar@example.com', 'x+tag@sub.domain.io'])(
    'accepts %s',
    (e) => expect(isValidEmail(e)).toBe(true),
  );

  it.each(['', 'no-at', 'a@b', 'a@@b.com', 'spaces in@x.com', 'a@b.', '@b.com'])(
    'rejects %s',
    (e) => expect(isValidEmail(e)).toBe(false),
  );

  it('rejects over-long input', () => {
    expect(isValidEmail('a'.repeat(250) + '@x.com')).toBe(false);
  });
});

describe('buildSubmission', () => {
  it('normalizes and stamps a valid submission', () => {
    const ts = '2026-06-01T12:00:00.000Z';
    expect(buildSubmission(' Foo@Bar.com ', 'landing-hero', ts)).toEqual({
      email: 'foo@bar.com',
      source: 'landing-hero',
      submittedAt: ts,
    });
  });

  it('defaults blank source to unknown', () => {
    expect(buildSubmission('a@b.co', '  ', '2026-06-01T00:00:00.000Z').source).toBe(
      'unknown',
    );
  });

  it('throws on invalid email', () => {
    expect(() => buildSubmission('nope', 's', '2026-06-01T00:00:00.000Z')).toThrow(
      'invalid email',
    );
  });
});
