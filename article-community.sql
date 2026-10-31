-- Rádió69 – cikkreakciók, hozzászólások és moderálás
-- Futtasd le egyszer a Supabase SQL Editorban.
-- A publikus cikkek között a régi, statikus cikkek is vannak, ezért az article_id
-- szándékosan nem kap idegen kulcsot az articles táblára.

create table if not exists public.article_comments (
  id uuid primary key default gen_random_uuid(),
  article_id text not null check (article_id ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  parent_id uuid references public.article_comments(id) on delete cascade,
  author_name text not null check (char_length(btrim(author_name)) between 2 and 40),
  body text not null check (char_length(btrim(body)) between 3 and 1000),
  visitor_token uuid not null,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  created_at timestamptz not null default now(),
  moderated_at timestamptz,
  moderated_by uuid references auth.users(id) on delete set null
);

create index if not exists article_comments_article_status_created_idx
  on public.article_comments (article_id, status, created_at desc);
create index if not exists article_comments_visitor_created_idx
  on public.article_comments (visitor_token, created_at desc);

create table if not exists public.article_reactions (
  id uuid primary key default gen_random_uuid(),
  article_id text not null check (article_id ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  visitor_token uuid not null,
  reaction_type text not null check (reaction_type in ('like', 'helpful', 'interesting')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (article_id, visitor_token)
);

create index if not exists article_reactions_article_type_idx
  on public.article_reactions (article_id, reaction_type);

alter table public.article_comments enable row level security;
alter table public.article_reactions enable row level security;

revoke all on table public.article_comments from public, anon, authenticated;
revoke all on table public.article_reactions from public, anon, authenticated;
grant select on table public.article_comments to anon, authenticated;
grant update (status) on table public.article_comments to authenticated;
grant delete on table public.article_comments to authenticated;
grant all on table public.article_comments to service_role;
grant all on table public.article_reactions to service_role;

-- A látogatók kizárólag jóváhagyott hozzászólásokat olvashatnak.
drop policy if exists radio69_comments_public_read_approved on public.article_comments;
create policy radio69_comments_public_read_approved
on public.article_comments for select to anon, authenticated
using (status = 'approved');

-- A főszerkesztő minden hozzászólást megtekinthet és moderálhat.
drop policy if exists radio69_comments_chief_read_all on public.article_comments;
create policy radio69_comments_chief_read_all
on public.article_comments for select to authenticated
using ((select public.current_radio69_role()) = 'chief_editor');

drop policy if exists radio69_comments_chief_update on public.article_comments;
create policy radio69_comments_chief_update
on public.article_comments for update to authenticated
using ((select public.current_radio69_role()) = 'chief_editor')
with check (
  (select public.current_radio69_role()) = 'chief_editor'
  and status in ('pending', 'approved', 'rejected')
);

drop policy if exists radio69_comments_chief_delete on public.article_comments;
create policy radio69_comments_chief_delete
on public.article_comments for delete to authenticated
using ((select public.current_radio69_role()) = 'chief_editor');

-- Reakciókat kizárólag a biztonságos RPC függvényeken át lehet olvasni/módosítani.
-- Közvetlen táblajogosultság és RLS-policy nincs az anon/authenticated szerepkörnek.

create or replace function public.set_radio69_comment_moderation_fields()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.status is distinct from old.status then
    new.moderated_at := now();
    new.moderated_by := (select auth.uid());
  end if;
  return new;
end;
$$;

drop trigger if exists radio69_comment_moderation_fields on public.article_comments;
create trigger radio69_comment_moderation_fields
before update of status on public.article_comments
for each row execute function public.set_radio69_comment_moderation_fields();

create or replace function public.submit_article_comment(
  p_article_id text,
  p_author_name text,
  p_body text,
  p_visitor_token uuid,
  p_parent_id uuid default null,
  p_website text default ''
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id uuid;
  v_parent record;
  v_status text;
  v_recent_count integer;
  v_daily_count integer;
begin
  if p_website is not null and btrim(p_website) <> '' then
    raise exception 'A beküldés nem fogadható el.' using errcode = '22023';
  end if;

  if p_article_id is null or p_article_id !~ '^[a-z0-9]+(-[a-z0-9]+)*$' then
    raise exception 'Érvénytelen cikkazonosító.' using errcode = '22023';
  end if;
  if p_visitor_token is null then
    raise exception 'Hiányzó böngészőazonosító.' using errcode = '22023';
  end if;
  if p_author_name is null or char_length(btrim(p_author_name)) not between 2 and 40 then
    raise exception 'A név 2–40 karakter lehet.' using errcode = '22023';
  end if;
  if p_body is null or char_length(btrim(p_body)) not between 3 and 1000 then
    raise exception 'A hozzászólás 3–1000 karakter lehet.' using errcode = '22023';
  end if;

  -- Ha az azonosító létezik a központi adatbázisban, csak publikált cikkhez engedünk hozzászólást.
  select a.status into v_status from public.articles as a where a.id = p_article_id;
  if found and v_status <> 'published' then
    raise exception 'Ehhez a cikkhez jelenleg nem lehet hozzászólni.' using errcode = '22023';
  end if;

  select count(*)::integer into v_recent_count
  from public.article_comments as c
  where c.visitor_token = p_visitor_token
    and c.created_at > now() - interval '10 minutes';
  if v_recent_count >= 3 then
    raise exception 'Rövid időn belül túl sok hozzászólást küldtél. Próbáld újra később.' using errcode = '22023';
  end if;

  select count(*)::integer into v_daily_count
  from public.article_comments as c
  where c.visitor_token = p_visitor_token
    and c.created_at > now() - interval '24 hours';
  if v_daily_count >= 10 then
    raise exception 'A napi hozzászólási korlátot elérted. Próbáld újra holnap.' using errcode = '22023';
  end if;

  if p_parent_id is not null then
    select c.article_id, c.parent_id, c.status
      into v_parent
    from public.article_comments as c
    where c.id = p_parent_id;

    if not found or v_parent.article_id <> p_article_id
       or v_parent.parent_id is not null or v_parent.status <> 'approved' then
      raise exception 'Ehhez a hozzászóláshoz nem lehet válaszolni.' using errcode = '22023';
    end if;
  end if;

  insert into public.article_comments (
    article_id, parent_id, author_name, body, visitor_token, status
  ) values (
    p_article_id, p_parent_id, btrim(p_author_name), btrim(p_body), p_visitor_token, 'pending'
  ) returning id into v_id;

  return v_id;
end;
$$;

create or replace function public.toggle_article_reaction(
  p_article_id text,
  p_visitor_token uuid,
  p_reaction_type text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_existing text;
  v_status text;
begin
  if p_article_id is null or p_article_id !~ '^[a-z0-9]+(-[a-z0-9]+)*$'
     or p_visitor_token is null
     or p_reaction_type is null
     or p_reaction_type not in ('like', 'helpful', 'interesting') then
    raise exception 'Érvénytelen reakcióadat.' using errcode = '22023';
  end if;

  select a.status into v_status from public.articles as a where a.id = p_article_id;
  if found and v_status <> 'published' then
    raise exception 'Ehhez a cikkhez jelenleg nem lehet reagálni.' using errcode = '22023';
  end if;

  select r.reaction_type into v_existing
  from public.article_reactions as r
  where r.article_id = p_article_id and r.visitor_token = p_visitor_token
  for update;

  if v_existing = p_reaction_type then
    delete from public.article_reactions as r
    where r.article_id = p_article_id and r.visitor_token = p_visitor_token;
  else
    insert into public.article_reactions (article_id, visitor_token, reaction_type)
    values (p_article_id, p_visitor_token, p_reaction_type)
    on conflict (article_id, visitor_token)
    do update set reaction_type = excluded.reaction_type, updated_at = now();
  end if;
end;
$$;

create or replace function public.get_article_reaction_summary(
  p_article_id text,
  p_visitor_token uuid
)
returns table (
  reaction_type text,
  reaction_count bigint,
  mine boolean,
  approved_comments bigint
)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_status text;
begin
  if p_article_id is null or p_article_id !~ '^[a-z0-9]+(-[a-z0-9]+)*$' then
    raise exception 'Érvénytelen cikkazonosító.' using errcode = '22023';
  end if;

  select a.status into v_status from public.articles as a where a.id = p_article_id;
  if found and v_status <> 'published' then
    return;
  end if;

  return query
  select t.kind,
    (select count(*)::bigint from public.article_reactions as r
     where r.article_id = p_article_id and r.reaction_type = t.kind),
    exists (select 1 from public.article_reactions as mine
            where mine.article_id = p_article_id
              and mine.visitor_token = p_visitor_token
              and mine.reaction_type = t.kind),
    (select count(*)::bigint from public.article_comments as c
     where c.article_id = p_article_id and c.status = 'approved')
  from (values ('like'::text), ('helpful'::text), ('interesting'::text)) as t(kind);
end;
$$;

revoke all on function public.submit_article_comment(text, text, text, uuid, uuid, text) from public;
revoke all on function public.toggle_article_reaction(text, uuid, text) from public;
revoke all on function public.get_article_reaction_summary(text, uuid) from public;
grant execute on function public.submit_article_comment(text, text, text, uuid, uuid, text) to anon, authenticated;
grant execute on function public.toggle_article_reaction(text, uuid, text) to anon, authenticated;
grant execute on function public.get_article_reaction_summary(text, uuid) to anon, authenticated;

comment on table public.article_comments is 'Rádió69 cikkhozzászólások; csak a főszerkesztő által jóváhagyott hozzászólás látható nyilvánosan.';
comment on table public.article_reactions is 'Rádió69 cikkreakciók; látogatónként és cikkenként egy aktív reakció.';
