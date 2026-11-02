-- Rádió69 heti műsorértesítések – Supabase-adatbázis séma
-- Futtasd le egyszer a Supabase Dashboard → SQL Editor felületén.

create table if not exists public.radio69_show_push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  show_ids text[] not null default '{}',
  active boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint radio69_show_push_endpoint_https check (endpoint like 'https://%'),
  constraint radio69_show_push_endpoint_size check (length(endpoint) <= 4096),
  constraint radio69_show_push_p256dh_size check (length(p256dh) between 40 and 120),
  constraint radio69_show_push_auth_size check (length(auth) between 16 and 80)
);

create index if not exists radio69_show_push_subscriptions_active_idx
  on public.radio69_show_push_subscriptions (active)
  where active = true;

create table if not exists public.radio69_show_push_deliveries (
  subscription_id uuid not null references public.radio69_show_push_subscriptions(id) on delete cascade,
  show_id text not null,
  event_date date not null,
  start_time time not null,
  created_at timestamptz not null default now(),
  primary key (subscription_id, show_id, event_date, start_time)
);

create index if not exists radio69_show_push_deliveries_event_date_idx
  on public.radio69_show_push_deliveries (event_date);

create or replace function public.set_radio69_show_push_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_radio69_show_push_updated_at on public.radio69_show_push_subscriptions;
create trigger set_radio69_show_push_updated_at
before update on public.radio69_show_push_subscriptions
for each row execute function public.set_radio69_show_push_updated_at();

-- A táblák közvetlenül nem olvashatók és nem írhatók publikus böngészőszerepkörből.
-- Kizárólag a szerveroldali Edge Function használja a service/secret kulcsot.
alter table public.radio69_show_push_subscriptions enable row level security;
alter table public.radio69_show_push_deliveries enable row level security;
revoke all on table public.radio69_show_push_subscriptions from anon, authenticated;
revoke all on table public.radio69_show_push_deliveries from anon, authenticated;
