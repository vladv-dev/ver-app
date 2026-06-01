/** @type {import('next').NextConfig} */

// Single deploy target: Vercel (server-capable). The app requires a server —
// Stripe webhooks need the Node runtime + raw request body, auth routes read
// request cookies — so a static export (`output: 'export'`) is not viable.
// See VER-13 and the Deployment section of the README.
const nextConfig = {
  reactStrictMode: true,
};

export default nextConfig;
