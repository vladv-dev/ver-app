# ver-app

Engineering foundation for the product. Boring, well-trodden stack chosen so a
small (AI-operated) team can ship, deploy, and monitor it autonomously.

## Stack

| Concern   | Choice                          | Why                                                       |
| --------- | ------------------------------- | --------------------------------------------------------- |
| Framework | Next.js 14 (App Router, TS)     | One framework for UI + API routes; huge ecosystem.        |
| Language  | TypeScript (strict)             | Catches errors before deploy.                             |
| Tests     | Vitest                          | Fast, zero-config unit tests.                             |
| Lint      | ESLint (`eslint-config-next`)   | Standard Next rules.                                      |
| CI        | GitHub Actions ([activate](.github/workflows-pending/README.md)) | Lint + test + build on every push/PR. |
| Host      | **Vercel** (prod) · GitHub Pages (pipeline proof) | See [Deployment](#deployment). |

## Project structure

```
app/            Next.js App Router (routes, layouts, server components)
  layout.tsx    Root HTML shell
  page.tsx      Home page ("hello world" skeleton)
lib/            Framework-free helpers (pure, unit-tested)
  greeting.ts
  greeting.test.ts
.github/workflows/
  ci.yml        Lint + test + build
  deploy.yml    Static export -> GitHub Pages
```

## Conventions

- **Pure logic lives in `lib/`** and is unit-tested; React/Next code stays thin.
- **TypeScript strict** is on; no `any` without a reason.
- **Every PR runs CI** (`lint`, `test`, `build`); keep `main` green.
- **Commits**: small and logical. Conventional-ish prefixes (`feat:`, `fix:`,
  `chore:`, `ci:`) encouraged, not enforced.
- **Path alias** `@/*` maps to repo root (e.g. `import { greeting } from '@/lib/greeting'`).

## Local development

```bash
npm install
npm run dev      # http://localhost:3000
npm run lint
npm test
npm run build
```

## Deployment

### Production target: Vercel (recommended)

Vercel is the canonical managed host for Next.js: zero-config, managed TLS,
preview deploys per PR, server/SSR + API routes, generous free tier. It is the
right home once we add server-side features and payments.

**Ready-to-run (one-time, ~2 min):**

1. Import this repo at <https://vercel.com/new> (or `npx vercel link`).
2. Accept defaults — Vercel auto-detects Next.js. No env vars needed for the
   skeleton.
3. Every push to `main` then deploys automatically; PRs get preview URLs.

No code changes are required — the default build (no `DEPLOY_TARGET`) is the
server-capable Vercel build.

### Pipeline proof: GitHub Pages (live now, token-free)

Once the workflows are [activated](.github/workflows-pending/README.md), every
push to `main` runs `.github/workflows/deploy.yml`, which builds a **static
export** (`output: 'export'`) and publishes it to GitHub Pages.

- Enable once: repo **Settings → Pages → Source: GitHub Actions**.
- URL: `https://<owner>.github.io/<repo>/`.
- This is a static snapshot only (no SSR/API). For anything dynamic, use Vercel.

The static-vs-server split is handled in `next.config.mjs` via the
`DEPLOY_TARGET` env var, so the same codebase serves both targets — switching
production host is a two-way door.
