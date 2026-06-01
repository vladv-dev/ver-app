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
| CI        | GitHub Actions (`.github/workflows/ci.yml`, active) | Lint + test + build on every push/PR. |
| Host      | **Vercel** (server-capable; sole target)          | See [Deployment](#deployment). |

## Project structure

```
app/            Next.js App Router (routes, layouts, server components)
  layout.tsx    Root HTML shell
  page.tsx      Home page ("hello world" skeleton)
lib/            Framework-free helpers (pure, unit-tested)
  greeting.ts
  greeting.test.ts
.github/workflows/
  ci.yml        Lint + test + build (active)
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

### Target: Vercel (sole host)

The app is **server-required** — Stripe webhooks need the Node runtime + raw
request body, and the auth routes read request cookies — so a static export is
not viable (see [VER-13](/VER/issues/VER-13)). Vercel is the canonical managed
host for Next.js: zero-config, managed TLS, preview deploys per PR, server/SSR +
API routes, generous free tier.

**Ready-to-run (one-time, ~2 min; needs a Vercel account — board/CEO step):**

1. Import this repo at <https://vercel.com/new> (or `npx vercel link`).
2. Accept defaults — Vercel auto-detects Next.js. The default build is the
   server-capable build; no `next.config.mjs` changes are needed.
3. Add the M2 env vars (Supabase + Stripe — see
   [M2 setup](#setup-once-supabase--stripe-accounts-exist)) in the Vercel
   project's Environment Variables.
4. Every push to `main` then deploys automatically; PRs get preview URLs.

Vercel's native Git integration handles deploys — no GitHub Actions deploy
workflow is required (CI in `ci.yml` still gates lint/test/build on every push).
Switching host later is a two-way door: the app is a standard Next.js server
build with no Vercel-specific code.

> **Prior Pages export — dropped.** An earlier `output: 'export'` GitHub Pages
> workflow proved the pipeline while the app was static. It is incompatible with
> the M2 server routes and has been removed. The last static artifact may still
> be served at `https://<owner>.github.io/<repo>/` until Pages is disabled in
> repo settings; it is a stale snapshot, not the app.

## Landing page + waitlist (VER-4)

The home page (`app/page.tsx`) is the demand-validation landing page with email
capture (`app/components/WaitlistForm.tsx`). Copy is generic until VER-2 picks
the v1 wedge — iterate the copy then; the structure stays.

### How capture works (and why)

The form posts client-side to an external **managed form/DB endpoint** rather
than a Next.js API route. This keeps waitlist capture durable with zero backend
code to maintain and works regardless of host. (A server-side `/api/waitlist`
route is now possible on Vercel and is an option for later — tracked in VER-11.)

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
host is **Vercel** (sole target — see [Deployment](#deployment)). The earlier
GitHub Pages static export only ever covered static pages and has been dropped
for the full app.

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
