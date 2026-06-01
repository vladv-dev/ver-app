import WaitlistForm from './components/WaitlistForm';

// Generic, product-agnostic copy until VER-2 finalizes the v1 wedge.
// Iterate this copy once the product is chosen; structure stays.
const PRODUCT_NAME = process.env.NEXT_PUBLIC_PRODUCT_NAME || 'Our product';

export default function Home() {
  return (
    <main className="page">
      <section className="hero">
        <span className="eyebrow">Early access</span>
        <h1>Software that does the busywork for you.</h1>
        <p className="lede">
          {PRODUCT_NAME} is launching soon. Join the waitlist to get early
          access and help shape what we build.
        </p>
        <WaitlistForm />
      </section>

      <section className="features" aria-label="What you get">
        <div className="feature">
          <h2>Ships fast</h2>
          <p>Built lean, iterated in the open. New improvements land weekly.</p>
        </div>
        <div className="feature">
          <h2>Simple by default</h2>
          <p>No bloat, no setup marathon. Useful from the first minute.</p>
        </div>
        <div className="feature">
          <h2>Fair pricing</h2>
          <p>Straightforward plans. Start free, upgrade only when it pays off.</p>
        </div>
      </section>

      <footer className="footer">
        <p>© {new Date().getFullYear()} — building in public.</p>
      </footer>
    </main>
  );
}
