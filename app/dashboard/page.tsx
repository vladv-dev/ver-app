/**
 * Gated dashboard — proves the revenue rail end to end: shows the signed-in
 * user's live entitlement (plan, status, generations used this period) sourced
 * from the DB the Stripe webhook writes. Server Component; redirects to /login
 * when signed out (server-side gate, not client trickery).
 */
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { getEntitlement, getStripeCustomerId } from '@/lib/subscriptions-db';
import { countGenerationsSince } from '@/lib/usage-db';
import { getPlan } from '@/lib/plans';
import { isSupabaseConfigured } from '@/lib/env';
import ManageBillingButton from '@/app/components/ManageBillingButton';

export const dynamic = 'force-dynamic';

/** Start of the current calendar month (UTC) — the metering period for the skeleton. */
function periodStartIso(): string {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString();
}

export default async function DashboardPage() {
  if (!isSupabaseConfigured()) {
    return (
      <main className="page">
        <section className="hero">
          <h1>Dashboard</h1>
          <p className="lede">
            Auth isn&apos;t configured yet. Set the Supabase env vars (see
            <code> .env.example</code>) to enable sign-in and entitlements.
          </p>
        </section>
      </main>
    );
  }

  const user = await getCurrentUser();
  if (!user) redirect('/login?next=/dashboard');

  const supabase = createSupabaseServerClient();
  const [entitlement, customerId, used] = await Promise.all([
    getEntitlement(supabase, user.id),
    getStripeCustomerId(supabase, user.id),
    countGenerationsSince(supabase, user.id, periodStartIso()),
  ]);

  const plan = getPlan(entitlement.plan);

  return (
    <main className="page">
      <section className="hero">
        <h1>Welcome{user.email ? `, ${user.email}` : ''}</h1>
        <p className="lede">Your plan and usage this period.</p>

        <div className="card">
          <div className="row">
            <span>Plan</span>
            <strong>{plan.name}</strong>
          </div>
          <div className="row">
            <span>Billing status</span>
            <strong>{entitlement.status}</strong>
          </div>
          <div className="row">
            <span>Generations used</span>
            <strong>
              {used} / {entitlement.monthlyGenerations}
            </strong>
          </div>
          {entitlement.currentPeriodEnd && (
            <div className="row">
              <span>Renews</span>
              <strong>
                {new Date(entitlement.currentPeriodEnd).toLocaleDateString()}
              </strong>
            </div>
          )}
        </div>

        <div className="actions">
          {entitlement.plan === 'free' ? (
            <Link className="btn" href="/pricing">
              Upgrade
            </Link>
          ) : (
            <Link className="btn btn-secondary" href="/pricing">
              Change plan
            </Link>
          )}
          {customerId && <ManageBillingButton />}
          <form action="/auth/signout" method="post">
            <button className="btn btn-ghost" type="submit">
              Sign out
            </button>
          </form>
        </div>
      </section>
    </main>
  );
}
