'use client';

import { useState } from 'react';
import { isValidEmail } from '@/lib/waitlist';

/**
 * Static-export-safe waitlist form. Posts to a managed capture endpoint set at
 * build time via NEXT_PUBLIC_WAITLIST_ENDPOINT (e.g. Formspree/Supabase). When
 * the endpoint is unset the form stays usable but tells the visitor signups are
 * not live yet, so we never silently drop an email.
 *
 * Why an external endpoint and not a Next API route: the autonomous deploy is a
 * GitHub Pages static export (`output: 'export'`), which has no server runtime.
 * A managed form backend keeps capture durable without a server. See README.
 */
const ENDPOINT = process.env.NEXT_PUBLIC_WAITLIST_ENDPOINT ?? '';
const SOURCE = 'landing-hero';

type Status = 'idle' | 'submitting' | 'success' | 'error' | 'disabled';

export default function WaitlistForm() {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<Status>('idle');
  const [message, setMessage] = useState('');

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    // Honeypot: real users never fill this hidden field.
    const form = e.currentTarget;
    const trap = (form.elements.namedItem('company') as HTMLInputElement | null)?.value;
    if (trap) {
      setStatus('success'); // silently swallow bots
      return;
    }

    if (!isValidEmail(email)) {
      setStatus('error');
      setMessage('Please enter a valid email address.');
      return;
    }

    if (!ENDPOINT) {
      setStatus('disabled');
      setMessage("Thanks for your interest — signups open shortly. Check back soon!");
      return;
    }

    setStatus('submitting');
    setMessage('');
    try {
      const res = await fetch(ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          source: SOURCE,
          submittedAt: new Date().toISOString(),
        }),
      });
      if (!res.ok) throw new Error(`status ${res.status}`);
      setStatus('success');
      setMessage("You're on the list. We'll be in touch.");
      setEmail('');
    } catch {
      setStatus('error');
      setMessage('Something went wrong. Please try again in a moment.');
    }
  }

  if (status === 'success') {
    return (
      <p className="wl-msg wl-msg--ok" role="status">
        {message || "You're on the list. We'll be in touch."}
      </p>
    );
  }

  return (
    <form className="wl-form" onSubmit={handleSubmit} noValidate>
      <label className="wl-label" htmlFor="wl-email">
        Email address
      </label>
      <div className="wl-row">
        <input
          id="wl-email"
          name="email"
          type="email"
          inputMode="email"
          autoComplete="email"
          required
          placeholder="you@company.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          disabled={status === 'submitting'}
          aria-describedby="wl-feedback"
        />
        {/* honeypot — visually hidden, not for humans */}
        <input
          type="text"
          name="company"
          tabIndex={-1}
          autoComplete="off"
          aria-hidden="true"
          className="wl-hp"
        />
        <button type="submit" disabled={status === 'submitting'}>
          {status === 'submitting' ? 'Joining…' : 'Join the waitlist'}
        </button>
      </div>
      <p
        id="wl-feedback"
        className={
          status === 'error'
            ? 'wl-msg wl-msg--err'
            : status === 'disabled'
              ? 'wl-msg wl-msg--info'
              : 'wl-msg'
        }
        role={status === 'error' ? 'alert' : 'status'}
      >
        {message || 'No spam. Just one email when we launch.'}
      </p>
    </form>
  );
}
