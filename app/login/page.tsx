'use client';
/**
 * Sign-in / sign-up — one screen for both. Email magic link (passwordless) and
 * Google OAuth, both via Supabase Auth. New users are created on first sign-in,
 * so there is no separate signup flow to maintain.
 */
import { useState } from 'react';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>(
    'idle',
  );
  const [message, setMessage] = useState('');

  const redirectTo =
    typeof window !== 'undefined' ? `${window.location.origin}/auth/callback` : '';

  async function sendMagicLink(e: React.FormEvent) {
    e.preventDefault();
    setStatus('sending');
    const supabase = createSupabaseBrowserClient();
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: redirectTo },
    });
    if (error) {
      setStatus('error');
      setMessage(error.message);
    } else {
      setStatus('sent');
      setMessage('Check your email for a sign-in link.');
    }
  }

  async function signInWithGoogle() {
    const supabase = createSupabaseBrowserClient();
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo },
    });
  }

  return (
    <main className="page">
      <section className="hero" style={{ maxWidth: 420 }}>
        <h1>Sign in</h1>
        <p className="lede">Use a magic link or your Google account.</p>

        <button className="btn" onClick={signInWithGoogle} style={{ width: '100%' }}>
          Continue with Google
        </button>

        <div style={{ margin: '16px 0', opacity: 0.6 }}>— or —</div>

        <form onSubmit={sendMagicLink} className="waitlist-form">
          <input
            type="email"
            required
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="input"
          />
          <button className="btn" type="submit" disabled={status === 'sending'}>
            {status === 'sending' ? 'Sending…' : 'Email me a link'}
          </button>
        </form>

        {message && (
          <p role="status" style={{ color: status === 'error' ? '#c00' : '#070' }}>
            {message}
          </p>
        )}
      </section>
    </main>
  );
}
