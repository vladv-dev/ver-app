import type { Metadata } from 'next';
import type { ReactNode } from 'react';

export const metadata: Metadata = {
  title: 'ver-app',
  description: 'Engineering foundation skeleton — proves the deploy pipeline end to end.',
};

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
        {children}
      </body>
    </html>
  );
}
