-- Rádió69 Web Push: one record per browser/device subscription.
create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  endpoint text not null unique check (endpoint like 'https://%'),
  p256dh text not null check (char_length(p256dh) between 80 and 120),
  auth text not null check (char_length(auth) between 16 and 64),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists push_subscriptions_created_at_idx
  on public.push_subscriptions (created_at desc);

alter table public.push_subscriptions enable row level security;
revoke all on table public.push_subscriptions from public, anon, authenticated;
grant all on table public.push_subscriptions to service_role;
