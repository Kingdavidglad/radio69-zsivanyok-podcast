-- Rádió69 × Zsiványok Podcast – központi cikkkezelő
-- Supabase SQL Editorben futtasd le egyszer, új Supabase-projektben.
-- Ezután a TELEPITESI_UTMUTATO.txt szerint hozz létre profilt a főszerkesztőnek.

create table if not exists public.editor_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default 'Szerkesztő',
  role text not null default 'author' check (role in ('author', 'chief_editor')),
  created_at timestamptz not null default now()
);

create table if not exists public.articles (
  id text primary key check (id ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  category text not null default 'Rádió69',
  tag text not null default 'HÍR',
  status text not null default 'draft' check (status in ('draft', 'pending', 'published')),
  featured boolean not null default false,
  editor_pick boolean not null default false,
  title text not null,
  excerpt text not null default '',
  image_url text not null default '',
  image_alt text not null default '',
  image_caption text not null default '',
  image_position text not null default 'center',
  read_time text not null default '3 perc',
  published_at date not null default current_date,
  content_updated_at date,
  intro text not null default '',
  body jsonb not null default '[]'::jsonb,
  sources jsonb not null default '[]'::jsonb,
  source_note text not null default '',
  seo_title text not null default '',
  author_id uuid references auth.users(id) on delete set null,
  approved_by uuid references auth.users(id) on delete set null,
  approved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists articles_status_published_idx on public.articles(status, published_at desc);
create index if not exists articles_author_updated_idx on public.articles(author_id, updated_at desc);

create or replace function public.current_radio69_role()
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select ep.role
  from public.editor_profiles as ep
  where ep.user_id = (select auth.uid())
  limit 1;
$$;
revoke all on function public.current_radio69_role() from public;
revoke all on function public.current_radio69_role() from anon;
grant execute on function public.current_radio69_role() to authenticated;

create or replace function public.set_radio69_article_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;
drop trigger if exists set_radio69_article_updated_at on public.articles;
create trigger set_radio69_article_updated_at
before update on public.articles
for each row execute function public.set_radio69_article_updated_at();

alter table public.editor_profiles enable row level security;
alter table public.articles enable row level security;

-- Revoke broad default privileges, then grant only the operations the UI uses.
revoke all on table public.editor_profiles from anon, authenticated;
revoke all on table public.articles from anon, authenticated;
grant usage on schema public to anon, authenticated;
grant select on table public.editor_profiles to authenticated;
grant select on table public.articles to anon, authenticated;
grant insert, update, delete on table public.articles to authenticated;

-- Policies are dropped/recreated so re-running the setup is predictable.
drop policy if exists radio69_profiles_read_self_or_chief on public.editor_profiles;
create policy radio69_profiles_read_self_or_chief
on public.editor_profiles for select to authenticated
using (user_id = (select auth.uid()) or (select public.current_radio69_role()) = 'chief_editor');

 drop policy if exists radio69_articles_public_read_published on public.articles;
create policy radio69_articles_public_read_published
on public.articles for select to anon, authenticated
using (status = 'published');

drop policy if exists radio69_articles_author_read_own on public.articles;
create policy radio69_articles_author_read_own
on public.articles for select to authenticated
using (author_id = (select auth.uid()) and (select public.current_radio69_role()) = 'author');

drop policy if exists radio69_articles_chief_read_all on public.articles;
create policy radio69_articles_chief_read_all
on public.articles for select to authenticated
using ((select public.current_radio69_role()) = 'chief_editor');

drop policy if exists radio69_articles_author_insert_own on public.articles;
create policy radio69_articles_author_insert_own
on public.articles for insert to authenticated
with check (
  (select public.current_radio69_role()) = 'author'
  and author_id = (select auth.uid())
  and status in ('draft', 'pending')
  and approved_by is null and approved_at is null
  and featured = false and editor_pick = false
);

drop policy if exists radio69_articles_chief_insert on public.articles;
create policy radio69_articles_chief_insert
on public.articles for insert to authenticated
with check ((select public.current_radio69_role()) = 'chief_editor');

drop policy if exists radio69_articles_author_update_own on public.articles;
create policy radio69_articles_author_update_own
on public.articles for update to authenticated
using (
  author_id = (select auth.uid())
  and (select public.current_radio69_role()) = 'author'
  and status in ('draft', 'pending')
)
with check (
  author_id = (select auth.uid())
  and (select public.current_radio69_role()) = 'author'
  and status in ('draft', 'pending')
  and approved_by is null and approved_at is null
  and featured = false and editor_pick = false
);

drop policy if exists radio69_articles_chief_update_all on public.articles;
create policy radio69_articles_chief_update_all
on public.articles for update to authenticated
using ((select public.current_radio69_role()) = 'chief_editor')
with check ((select public.current_radio69_role()) = 'chief_editor');

drop policy if exists radio69_articles_author_delete_own_draft on public.articles;
create policy radio69_articles_author_delete_own_draft
on public.articles for delete to authenticated
using (
  author_id = (select auth.uid())
  and (select public.current_radio69_role()) = 'author'
  and status in ('draft', 'pending')
);

drop policy if exists radio69_articles_chief_delete_all on public.articles;
create policy radio69_articles_chief_delete_all
on public.articles for delete to authenticated
using ((select public.current_radio69_role()) = 'chief_editor');
