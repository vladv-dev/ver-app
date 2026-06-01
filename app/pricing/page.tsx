/**
 * Pricing page — the storefront. Renders the plan catalog (single source of
 * truth in lib/plans) and wires paid plans to Stripe Checkout. Free plan links
 * to sign-up; paid plans launch Checkout (which bounces to /login if needed).
 */
import Link from 'next/link';
import { PLANS, type Plan } from '@/lib/plans';
import CheckoutButton from '@/app/components/CheckoutButton';

function priceLabel(plan: Plan): string {
  return plan.pricePence === 0 ? 'Free' : `£${(plan.pricePence / 100).toFixed(0)}/mo`;
}

export default function PricingPage() {
  return (
    <main className="page">
      <section className="hero">
        <h1>Pricing</h1>
        <p className="lede">Start free. Upgrade when it pays for itself.</p>
      </section>

      <section className="features" aria-label="Plans">
        {PLANS.map((plan) => (
          <div className="feature" key={plan.id}>
            <h2>{plan.name}</h2>
            <p className="price">{priceLabel(plan)}</p>
            <p>{plan.tagline}</p>
            <p className="muted">{plan.monthlyGenerations} generations / month</p>
            {plan.id === 'free' ? (
              <Link className="btn btn-secondary" href="/login?next=/dashboard">
                Start free
              </Link>
            ) : (
              <CheckoutButton plan={plan.id} label={`Choose ${plan.name}`} />
            )}
          </div>
        ))}
      </section>
    </main>
  );
}
