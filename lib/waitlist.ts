/**
 * Framework-free waitlist helpers. Pure logic kept out of React/Next so it is
 * trivially unit-testable (see waitlist.test.ts) and reusable by any capture
 * backend (managed form endpoint today, server route later).
 */

export interface WaitlistSubmission {
  email: string;
  /** Free-text source/campaign tag, e.g. "landing-hero". */
  source: string;
  /** ISO-8601 timestamp. Caller supplies it so this stays pure/testable. */
  submittedAt: string;
}

/** Lowercase + trim. Does not alter the address beyond safe normalization. */
export function normalizeEmail(raw: string): string {
  return raw.trim().toLowerCase();
}

/**
 * Pragmatic email validation: good enough to reject obvious garbage without
 * rejecting valid-but-unusual addresses. Full RFC 5322 is not worth it here —
 * the managed backend / a confirmation email is the real gate.
 */
export function isValidEmail(raw: string): boolean {
  const email = normalizeEmail(raw);
  if (email.length === 0 || email.length > 254) return false;
  if (email.includes(' ')) return false;
  // single @, non-empty local part, domain with a dot and a TLD of 2+ chars
  return /^[^@\s]+@[^@\s.]+(\.[^@\s.]+)+$/.test(email) && /\.[a-z]{2,}$/.test(email);
}

/**
 * Build a normalized submission payload from raw form input.
 * Throws on invalid email so callers handle one error path.
 */
export function buildSubmission(
  rawEmail: string,
  source: string,
  submittedAt: string,
): WaitlistSubmission {
  if (!isValidEmail(rawEmail)) {
    throw new Error('invalid email');
  }
  return {
    email: normalizeEmail(rawEmail),
    source: source.trim() || 'unknown',
    submittedAt,
  };
}
