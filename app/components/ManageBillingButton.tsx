'use client';
/**
 * Opens the Stripe Customer Portal for self-serve plan changes / cancellation.
 */
import { useState } from 'react';

export default function ManageBillingButton() {
  const [loading, setLoading] = useState(false);

  async function open() {
    setLoading(true);
    const res = await fetch('/api/stripe/portal', { method: 'POST' });
    const data = await res.json();
    if (res.ok && data.url) {
      window.location.href = data.url;
    } else {
      setLoading(false);
    }
  }

  return (
    <button className="btn btn-secondary" onClick={open} disabled={loading}>
      {loading ? 'Opening…' : 'Manage billing'}
    </button>
  );
}
