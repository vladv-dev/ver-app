/**
 * Typed, fail-loud environment access. Server code calls `requireEnv` so a
 * missing secret surfaces as a clear error at the call site instead of a
 * confusing downstream null. Public (NEXT_PUBLIC_*) vars are read directly where
 * needed since they are inlined at build time.
 */

export function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(
      `Missing required environment variable: ${name}. ` +
        `See .env.example and set it in .env.local (dev) or the host's env (prod).`,
    );
  }
  return value;
}

export function optionalEnv(name: string): string | undefined {
  return process.env[name] || undefined;
}

/** App base URL for building Stripe redirect URLs. */
export function appUrl(): string {
  return (
    optionalEnv('NEXT_PUBLIC_APP_URL') ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : '') ||
    'http://localhost:3000'
  );
}

/** True once Supabase is configured — lets pages degrade gracefully pre-provisioning. */
export function isSupabaseConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  );
}

/** True once Stripe is configured. */
export function isStripeConfigured(): boolean {
  return Boolean(process.env.STRIPE_SECRET_KEY);
}
