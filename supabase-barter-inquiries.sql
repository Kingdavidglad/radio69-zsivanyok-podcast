-- Rádió69 × Zsiványok Podcast — nyilvános bartermegkereső űrlap.
-- Supabase Dashboard → SQL Editor → New query: ezt a fájlt egyszer futtasd le.
-- Az anon szerepkör kizárólag új megkeresést szúrhat be; olvasás/módosítás/törlés nincs engedélyezve.

create table if not exists public.barter_inquiries (
  id uuid primary key default gen_random_uuid(),
  business_name text not null check (char_length(btrim(business_name)) between 2 and 120),
  contact_name text not null check (char_length(btrim(contact_name)) between 2 and 100),
  contact_email text not null check (char_length(btrim(contact_email)) between 5 and 160),
  campaign_goal text not null check (char_length(btrim(campaign_goal)) between 2 and 100),
  formats text[] not null default '{}',
  barter_offer text not null check (char_length(btrim(barter_offer)) between 5 and 1200),
  campaign_period text not null default '' check (char_length(campaign_period) <= 100),
  barter_value text not null default '' check (char_length(barter_value) <= 100),
  campaign_audience text not null default '' check (char_length(campaign_audience) <= 180),
  campaign_details text not null default '' check (char_length(campaign_details) <= 1500),
  privacy_acknowledged boolean not null default false check (privacy_acknowledged = true),
  status text not null default 'new' check (status in ('new', 'reviewing', 'accepted', 'declined', 'closed')),
  created_at timestamptz not null default now(),
  constraint barter_contact_email_format check (contact_email ~* '^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$'),
  constraint barter_formats_limit check (coalesce(array_length(formats, 1), 0) <= 6)
);

alter table public.barter_inquiries enable row level security;
revoke all on table public.barter_inquiries from anon, authenticated;
grant usage on schema public to anon, authenticated;
grant insert (business_name, contact_name, contact_email, campaign_goal, formats, barter_offer, campaign_period, barter_value, campaign_audience, campaign_details, privacy_acknowledged) on table public.barter_inquiries to anon, authenticated;

drop policy if exists radio69_barter_public_insert on public.barter_inquiries;
create policy radio69_barter_public_insert
on public.barter_inquiries
for insert
to anon, authenticated
with check (
  status = 'new'
  and privacy_acknowledged = true
  and char_length(btrim(business_name)) between 2 and 120
  and char_length(btrim(contact_name)) between 2 and 100
  and char_length(btrim(contact_email)) between 5 and 160
  and char_length(btrim(campaign_goal)) between 2 and 100
  and char_length(btrim(barter_offer)) between 5 and 1200
  and coalesce(array_length(formats, 1), 0) <= 6
);

comment on table public.barter_inquiries is 'Barter együttműködési megkeresések. Nyilvános kliens csak új rekordot küldhet be; olvasás csak a Supabase Dashboard/privilegizált admin felületen.';
