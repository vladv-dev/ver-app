'use client';
/**
 * Posts to the checkout route and redirects to the returned Stripe Checkout URL.
 * Shared by the pricing page's plan buttons.
 */
import { useState } from 'react';

export default function CheckoutButton({
  plan,
  label,
}: {
  plan: 'starter' | 'pro';
  label: string;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function start() {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ plan }),
      });
      const data = await res.json();
      if (res.status === 401) {
        window.location.href = '/login?next=/pricing';
        return;
      }
      if (!res.ok || !data.url) throw new Error(data.error || 'Checkout failed');
      window.location.href = data.url;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Checkout failed');
      setLoading(false);
    }
  }

  return (
    <>
      <button className="btn" onClick={start} disabled={loading}>
        {loading ? 'Redirecting…' : label}
      </button>
      {error && <p style={{ color: '#c00' }}>{error}</p>}
    </>
  );
}
