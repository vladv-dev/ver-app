import { greeting } from '@/lib/greeting';

export default function Home() {
  return (
    <main style={{ maxWidth: 640, margin: '4rem auto', padding: '0 1rem' }}>
      <h1>{greeting()}</h1>
      <p>
        ver-app skeleton is live. This page proves the engineering pipeline:
        commit &rarr; CI (lint + test) &rarr; deploy.
      </p>
      <p style={{ color: '#666' }}>VER-3 — engineering foundation.</p>
    </main>
  );
}
