import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import Link from 'next/link';
import Script from 'next/script';
import './globals.css';

const PRODUCT_NAME = process.env.NEXT_PUBLIC_PRODUCT_NAME || 'Join the waitlist';

export const metadata: Metadata = {
  title: PRODUCT_NAME,
  description: 'Launching soon. Join the waitlist for early access.',
};

// Privacy-friendly, cookieless analytics (Plausible by default). No-op unless
// NEXT_PUBLIC_PLAUSIBLE_DOMAIN is set, so no account is required to build/deploy.
const PLAUSIBLE_DOMAIN = process.env.NEXT_PUBLIC_PLAUSIBLE_DOMAIN || '';
const PLAUSIBLE_SRC =
  process.env.NEXT_PUBLIC_PLAUSIBLE_SRC || 'https://plausible.io/js/script.js';

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body
        style={{
          fontFamily:
            'system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif',
          margin: 0,
        }}
      >
        <nav className="nav">
          <Link href="/" className="nav-brand">
            {PRODUCT_NAME}
          </Link>
          <div className="nav-links">
            <Link href="/pricing">Pricing</Link>
            <Link href="/login">Sign in</Link>
          </div>
        </nav>
        {children}
        {PLAUSIBLE_DOMAIN && (
          <Script
            defer
            data-domain={PLAUSIBLE_DOMAIN}
            src={PLAUSIBLE_SRC}
            strategy="afterInteractive"
          />
        )}
      </body>
    </html>
  );
}
