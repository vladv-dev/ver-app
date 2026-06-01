-- M2 schema: profiles, subscriptions (entitlement state), usage_events (unit economics).
-- Apply via Supabase SQL editor or `supabase db push`. Idempotent where practical.
--
-- RLS model: users may READ their own rows; all WRITES go through the service
-- role (Stripe webhook, metering) which bypasses RLS. So no user-facing write
-- policies are defined — that is intentional, not an omission.

-- ---------------------------------------------------------------------------
-- profiles: one row per auth user, auto-created on signup via trigger below.
-- ---------------------------------------------------------------------------
create table if not exists public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  email       text,
  created_at  timestamptz not null default now()
);

alter table public.profiles enable row level security;

drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own" on public.profiles
  for select using (auth.uid() = id);

-- Auto-provision a profile whenever a new auth user is created.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email)
  values (new.id, new.email)
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- subscriptions: current billing/entitlement state, one row per user.
-- Written only by the Stripe webhook (service role). Read by gating.
-- ---------------------------------------------------------------------------
create table if not exists public.subscriptions (
  user_id                uuid primary key references auth.users (id) on delete cascade,
  stripe_customer_id     text,
  stripe_subscription_id text,
  plan                   text not null default 'free'
                           check (plan in ('free', 'starter', 'pro')),
  status                 text not null default 'none',
  current_period_end     timestamptz,
  updated_at             timestamptz not null default now()
);

create index if not exists subscriptions_customer_idx
  on public.subscriptions (stripe_customer_id);

alter table public.subscriptions enable row level security;

drop policy if exists "subscriptions_select_own" on public.subscriptions;
create policy "subscriptions_select_own" on public.subscriptions
  for select using (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- usage_events: one row per metered action (LLM generation today). Drives
-- cost-per-proposal reporting and per-plan margin. Written by service role.
-- ---------------------------------------------------------------------------
create table if not exists public.usage_events (
  id            bigint generated always as identity primary key,
  user_id       uuid not null references auth.users (id) on delete cascade,
  plan          text not null,
  kind          text not null default 'generation',
  model         text not null,
  input_tokens  integer not null default 0,
  output_tokens integer not null default 0,
  -- Modelled cost in GBP pence; numeric to preserve sub-penny precision.
  cost_pence    numeric(12, 4) not null default 0,
  created_at    timestamptz not null default now()
);

create index if not exists usage_events_user_period_idx
  on public.usage_events (user_id, created_at);

alter table public.usage_events enable row level security;

drop policy if exists "usage_events_select_own" on public.usage_events;
create policy "usage_events_select_own" on public.usage_events
  for select using (auth.uid() = user_id);
