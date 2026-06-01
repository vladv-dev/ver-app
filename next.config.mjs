/** @type {import('next').NextConfig} */

// When building for GitHub Pages we produce a fully static export served from
// a sub-path (https://<user>.github.io/<repo>/). Vercel/production builds use
// the defaults (server-capable, served from root) by setting no env vars.
const isPagesBuild = process.env.DEPLOY_TARGET === 'github-pages';
const basePath = process.env.PAGES_BASE_PATH || '';

const nextConfig = {
  reactStrictMode: true,
  ...(isPagesBuild
    ? {
        output: 'export',
        basePath,
        images: { unoptimized: true },
      }
    : {}),
};

export default nextConfig;
