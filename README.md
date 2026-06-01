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

## Landing page + waitlist (VER-4)

The home page (`app/page.tsx`) is the demand-validation landing page with email
capture (`app/components/WaitlistForm.tsx`). Copy is generic until VER-2 picks
the v1 wedge — iterate the copy then; the structure stays.

### How capture works (and why)

The autonomous deploy is a **static export** (GitHub Pages, no server), so the
form posts to an external **managed form/DB endpoint** rather than a Next.js API
route — a POST route handler cannot be statically exported and would break the
Pages build. This keeps capture durable with zero server to operate.

The endpoint is configured at build time:

| Env var | Purpose |
| --- | --- |
| `NEXT_PUBLIC_WAITLIST_ENDPOINT` | Managed endpoint the form POSTs `{ email, source, submittedAt }` to. Unset ⇒ form stays usable but tells visitors signups aren't live yet (no silent drops). |
| `NEXT_PUBLIC_PRODUCT_NAME` | Product name in copy/title. Generic default. |
| `NEXT_PUBLIC_PLAUSIBLE_DOMAIN` | Enables privacy-friendly, cookieless analytics. No-op when unset. |

`NEXT_PUBLIC_*` values are inlined into the client bundle — never put secrets
there. A managed endpoint must accept a **publishable** (non-secret) token.

Pure email logic lives in `lib/waitlist.ts` (validation/normalization) and is
unit-tested in `lib/waitlist.test.ts`.

### Verify capture end to end (local)

```bash
node scripts/dev-waitlist-endpoint.mjs          # durable endpoint on :4000
# in another shell:
NEXT_PUBLIC_WAITLIST_ENDPOINT=http://localhost:4000 npm run dev
# submit an email at http://localhost:3000 -> appended to data/waitlist.jsonl
```

`scripts/dev-waitlist-endpoint.mjs` is the local stand-in that documents the
contract (POST JSON, dedupe by normalized email, append-only durable store). It
is **not** for production — swap in a managed backend (below). Captured emails
(`data/*.jsonl`) are gitignored (PII).

### Going live (approved: Formspree free tier — board 2026-06-01)

The board approved **Formspree** as the waitlist backend (free tier: no server,
endpoint-only, email notifications). Runbook — the only manual, account-gated
step, ~2 min:

1. Create a Formspree form with the **company email** at <https://formspree.io>.
2. Copy the form endpoint, e.g. `https://formspree.io/f/abcdwxyz`.
3. Set the build env var `NEXT_PUBLIC_WAITLIST_ENDPOINT` to that URL (CI/host
   secrets, or `.env.local` for a local check) and redeploy.
4. Submit a test email on the live page → confirm it lands in the Formspree
   dashboard. Capture is now live.

Code is wired and verified — this is a config flip, not a code change. Alternative
if Formspree is dropped later: **Supabase** (managed Postgres + publishable anon
key + RLS insert) using the same `{ email, source, submittedAt }` POST contract.

### Analytics

Set `NEXT_PUBLIC_PLAUSIBLE_DOMAIN` to enable Plausible (cookieless, GDPR-light,
autonomous-friendly). Signup counts come from the managed backend's dashboard.
A managed analytics account is the second small decision flagged to the CEO.

### Design debt (for the future UX Designer)

Clean and functional, hand-rolled CSS in `app/globals.css`. No design system,
no responsive imagery, single hero layout, dark-only theme. Flagged for UX.

## M2 — auth, payments & entitlements

M2 makes the app **server-dependent** (auth, API routes, Stripe webhook), so the
canonical host is **Vercel**. The GitHub Pages static export only ever covered
static pages and is superseded for the full app — a deliberate two-way door
(`next.config.mjs` still supports both targets).

### What's wired

- **Supabase** — managed Postgres + Auth (email magic link + Google) + Storage.
  Server/browser/admin clients in `lib/supabase/*`; session refresh in
  `middleware.ts`.
- **Stripe** — Checkout (`/api/stripe/checkout`), Customer Portal
  (`/api/stripe/portal`), and a signature-verified webhook
  (`/api/stripe/webhook`) that writes entitlement state to `subscriptions`.
- **Plan gating** — plan catalog in `lib/plans.ts` (Free trial / Starter £29 /
  Pro £79); entitlement derived in `lib/entitlements.ts`; enforced server-side
  in routes and `/dashboard`.
- **Swap-seams** — payments behind `PaymentProvider` (`lib/payments/`), LLM
  behind `LLMProvider` (`lib/llm/`). Swapping a vendor is a one-file change.
- **Unit economics** — `lib/usage.ts` turns token usage into costed
  `usage_events` (cost-per-proposal), tagged by user + plan. Plumbing is live
  now; real generation lands in M3.

### Setup (once Supabase + Stripe accounts exist)

1. Copy `.env.example` → `.env.local` and fill the M2 vars.
2. Apply the DB schema: run `supabase/migrations/0001_init.sql` in the Supabase
   SQL editor (or `supabase db push`).
3. In Supabase Auth: enable Email and Google providers; add
   `<APP_URL>/auth/callback` to the redirect allow-list.
4. In Stripe: create two recurring GBP/month Prices (Starter £29, Pro £79); put
   their `price_…` ids in `STRIPE_PRICE_STARTER` / `STRIPE_PRICE_PRO`. Add a
   webhook to `<APP_URL>/api/stripe/webhook` for `customer.subscription.*`
   events; put its signing secret in `STRIPE_WEBHOOK_SECRET`.
5. `npm run dev`, sign in at `/login`, subscribe via `/pricing`, see entitlement
   on `/dashboard`. Use `stripe listen --forward-to localhost:3000/api/stripe/webhook`
   for local webhook delivery.

### Routes

```
/login                     Sign in / up (magic link + Google)
/pricing                   Plans + Stripe Checkout
/dashboard                 Gated: live plan, status, usage
/auth/callback             OAuth / magic-link code exchange
/auth/signout              Clear session
/api/stripe/checkout       POST → Checkout session URL (authed)
/api/stripe/portal         POST → Customer Portal URL (authed)
/api/stripe/webhook        POST ← Stripe → writes entitlement
```
