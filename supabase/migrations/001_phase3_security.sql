-- Moonlit Grove phase 3 -- Dedicated Supabase project ONLY.
-- No permission to run this against cass-health-lab or another existing app.
-- INVITE-ONLY: Signing into Supabase alone never grants application membership.
-- Run as Supabase migration role on NEW isolated project after approval.

create schema if not exists mg_private;
create extension if not exists pgcrypto with schema extensions;

create table if not exists public.mg_members (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null check (char_length(display_name) between 2 and 40 and display_name !~ '[[:cntrl:]]'),
  joined_at timestamptz not null default now()
);
create table if not exists public.mg_friendships (
  first_id uuid not null references public.mg_members(id) on delete cascade,
  second_id uuid not null references public.mg_members(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (first_id, second_id),
  check (first_id < second_id)
);
create index if not exists mg_friends_second_idx on public.mg_friendships(second_id);
create table if not exists public.mg_blocks (
  blocker_id uuid not null references public.mg_members(id) on delete cascade,
  blocked_id uuid not null references public.mg_members(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id),
  check (blocker_id <> blocked_id)
);
create table if not exists public.mg_invites (
  id uuid primary key default gen_random_uuid(),
  inviter_id uuid not null references public.mg_members(id) on delete cascade,
  token_hash bytea unique not null,
  expires_at timestamptz not null,
  used_by uuid references public.mg_members(id) on delete set null,
  used_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists mg_invites_active_idx on public.mg_invites(inviter_id,expires_at)
  where used_at is null and revoked_at is null;
create table if not exists public.mg_reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references public.mg_members(id) on delete cascade,
  reported_id uuid not null references public.mg_members(id) on delete cascade,
  category text not null check (category in ('harassment','spam','safety','other')),
  details text not null default '' check (char_length(details) <= 500),
  created_at timestamptz not null default now(),
  check (reported_id <> reporter_id)
);
create index if not exists mg_reports_created_idx on public.mg_reports(created_at);
-- Security test fixture + future owner-only application preferences. Not populated from local studios.
create table if not exists public.mg_private_records (
  owner_id uuid not null references public.mg_members(id) on delete cascade,
  slot text not null check (slot ~ '^[a-z0-9_-]{1,32}$'),
  payload jsonb not null check (pg_column_size(payload) <= 8192),
  updated_at timestamptz not null default now(),
  primary key (owner_id, slot)
);

alter table public.mg_members enable row level security;
alter table public.mg_friendships enable row level security;
alter table public.mg_blocks enable row level security;
alter table public.mg_invites enable row level security;
alter table public.mg_reports enable row level security;
alter table public.mg_private_records enable row level security;

-- Explicitly revoke default public/anon/authenticated privileges before selective grants.
revoke all on table public.mg_members,public.mg_friendships,public.mg_blocks,
  public.mg_invites,public.mg_reports,public.mg_private_records from public,anon,authenticated;
grant select on public.mg_members,public.mg_friendships,public.mg_blocks to authenticated;
grant select,insert,update,delete on public.mg_private_records to authenticated;

create policy mg_members_visibility on public.mg_members for select to authenticated using (
  id = (select auth.uid())
  or exists (
    select 1 from public.mg_friendships f
    where (f.first_id = (select auth.uid()) and f.second_id = mg_members.id)
       or (f.second_id = (select auth.uid()) and f.first_id = mg_members.id)
  )
);
create policy mg_friends_visibility on public.mg_friendships for select to authenticated using (
  first_id = (select auth.uid()) or second_id = (select auth.uid())
);
create policy mg_blocks_own on public.mg_blocks for select to authenticated using (
  blocker_id = (select auth.uid())
);
create policy mg_private_read on public.mg_private_records for select to authenticated using (
  owner_id = (select auth.uid())
);
create policy mg_private_insert on public.mg_private_records for insert to authenticated with check (
  owner_id = (select auth.uid())
);
create policy mg_private_update on public.mg_private_records for update to authenticated
  using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()));
create policy mg_private_delete on public.mg_private_records for delete to authenticated using (
  owner_id = (select auth.uid())
);
-- No RLS policies or grants on invitation hashes or reports: inaccessible over Data API.

-- Privileged implementations reside in NON-exposed schema, not public RPC functions.
create or replace function mg_private.require_member() returns uuid language plpgsql
security definer set search_path = '' as $$
declare caller uuid := (select auth.uid());
begin
  if caller is null or not exists(select 1 from public.mg_members where id=caller) then
    raise exception 'Membership required' using errcode='42501';
  end if;
  return caller;
end;$$;

create or replace function mg_private.create_invite()
returns table(code text, expires_at timestamptz)
language plpgsql security definer set search_path = '' as $$
declare caller uuid; issued text; until_at timestamptz;
begin
  caller := mg_private.require_member();
  if (select count(*) from public.mg_invites where inviter_id=caller
      and used_at is null and revoked_at is null and expires_at > now()) >= 5 then
    raise exception 'Five active invitations maximum' using errcode='22023';
  end if;
  issued := pg_catalog.encode(extensions.gen_random_bytes(24),'hex');
  until_at := now() + interval '7 days';
  insert into public.mg_invites(inviter_id,token_hash,expires_at)
    values(caller,extensions.digest(pg_catalog.decode(issued,'hex'),'sha256'),until_at);
  code:=issued; expires_at:=until_at; return next;
end;$$;

create or replace function mg_private.accept_invite(
  provided_code text, chosen_name text, confirms_age_13 boolean
) returns jsonb language plpgsql security definer set search_path = '' as $$
declare caller uuid := (select auth.uid()); inviter uuid; cleaned text; inviter_name text;
begin
  if caller is null or confirms_age_13 is distinct from true then
    raise exception 'A verified account aged 13+ is required' using errcode='42501';
  end if;
  if not exists(select 1 from auth.users where id=caller and email_confirmed_at is not null) then
    raise exception 'Verified identity required' using errcode='42501';
  end if;
  cleaned:=pg_catalog.btrim(chosen_name);
  if cleaned is null or char_length(cleaned) not between 2 and 40 or cleaned ~ '[[:cntrl:]]' then
    raise exception 'Display name must be 2–40 readable characters' using errcode='22023';
  end if;
  if provided_code is null or provided_code !~ '^[a-f0-9]{48}$' then
    raise exception 'Invitation invalid or expired' using errcode='22023';
  end if;
  select inviter_id into inviter from public.mg_invites
    where token_hash=extensions.digest(pg_catalog.decode(provided_code,'hex'),'sha256')
      and used_at is null and revoked_at is null and expires_at>now()
    for update;
  if inviter is null or inviter=caller then
    raise exception 'Invitation invalid or expired' using errcode='22023';
  end if;
  if exists(select 1 from public.mg_blocks b
       where (b.blocker_id=caller and b.blocked_id=inviter)
          or (b.blocker_id=inviter and b.blocked_id=caller)) then
    raise exception 'Connection unavailable' using errcode='42501';
  end if;
  -- Only approved members may issue invitations; sign-in alone never confers access.
  if not exists(select 1 from public.mg_members where id=inviter) then
    raise exception 'Invitation invalid or expired' using errcode='22023';
  end if;
  insert into public.mg_members(id,display_name) values(caller,cleaned)
    on conflict(id) do nothing;
  if (select count(*) from public.mg_friendships where first_id=caller or second_id=caller)>=30 or
     (select count(*) from public.mg_friendships where first_id=inviter or second_id=inviter)>=30 then
    raise exception 'Friends limit reached' using errcode='22023';
  end if;
  insert into public.mg_friendships(first_id,second_id)
    values(least(caller,inviter),greatest(caller,inviter)) on conflict do nothing;
  update public.mg_invites set used_by=caller,used_at=now()
    where token_hash=extensions.digest(pg_catalog.decode(provided_code,'hex'),'sha256');
  select display_name into inviter_name from public.mg_members where id=inviter;
  return pg_catalog.jsonb_build_object('friend_id',inviter,'friend_name',inviter_name);
end;$$;

create or replace function mg_private.rename_member(chosen_name text)
returns text language plpgsql security definer set search_path = '' as $$
declare caller uuid; cleaned text := pg_catalog.btrim(chosen_name);
begin
  caller:=mg_private.require_member();
  if cleaned is null or char_length(cleaned) not between 2 and 40 or cleaned ~ '[[:cntrl:]]' then
    raise exception 'Display name must be 2–40 readable characters' using errcode='22023';
  end if;
  update public.mg_members set display_name=cleaned where id=caller;
  return cleaned;
end;$$;

create or replace function mg_private.remove_friend(other_id uuid)
returns boolean language plpgsql security definer set search_path = '' as $$
declare caller uuid;
begin
 caller:=mg_private.require_member();
 delete from public.mg_friendships where first_id=least(caller,other_id) and second_id=greatest(caller,other_id);
 return found;
end;$$;

create or replace function mg_private.block_member(other_id uuid)
returns boolean language plpgsql security definer set search_path = '' as $$
declare caller uuid;
begin
  caller:=mg_private.require_member();
  if other_id is null or caller=other_id or not exists(select 1 from public.mg_members where id=other_id) then
    raise exception 'Invalid member' using errcode='22023';
  end if;
  if (select count(*) from public.mg_blocks where blocker_id=caller)>=100 then
    raise exception 'Block limit reached' using errcode='22023';
  end if;
  insert into public.mg_blocks(blocker_id,blocked_id) values(caller,other_id) on conflict do nothing;
  delete from public.mg_friendships where first_id=least(caller,other_id) and second_id=greatest(caller,other_id);
  return true;
end;$$;
create or replace function mg_private.unblock_member(other_id uuid)
returns boolean language plpgsql security definer set search_path = '' as $$
declare caller uuid;
begin
 caller:=mg_private.require_member();
 delete from public.mg_blocks where blocker_id=caller and blocked_id=other_id;
 return found;
end;$$;

create or replace function mg_private.report_member(other_id uuid, reason text, details_text text)
returns boolean language plpgsql security definer set search_path = '' as $$
declare caller uuid;
begin
  caller:=mg_private.require_member();
  if other_id is null or other_id=caller or reason not in ('harassment','spam','safety','other')
     or char_length(coalesce(details_text,''))>500 then
    raise exception 'Invalid report' using errcode='22023';
  end if;
  -- Reports can be filed for connected people or accounts the reporter already blocked.
  if not exists(select 1 from public.mg_friendships where
       first_id=least(caller,other_id) and second_id=greatest(caller,other_id))
     and not exists(select 1 from public.mg_blocks where blocker_id=caller and blocked_id=other_id) then
    raise exception 'Report unavailable' using errcode='42501';
  end if;
  insert into public.mg_reports(reporter_id,reported_id,category,details)
    values(caller,other_id,reason,coalesce(details_text,''));
  return true;
end;$$;

-- API wrappers are SECURITY INVOKER: the only elevated functions live in mg_private.
create or replace function public.mg_create_invite() returns table(code text,expires_at timestamptz)
language sql security invoker set search_path = '' as $$ select * from mg_private.create_invite(); $$;
create or replace function public.mg_accept_invite(provided_code text,chosen_name text,confirms_age_13 boolean)
returns jsonb language sql security invoker set search_path = '' as $$ select mg_private.accept_invite(provided_code,chosen_name,confirms_age_13); $$;
create or replace function public.mg_rename_member(chosen_name text) returns text
language sql security invoker set search_path = '' as $$ select mg_private.rename_member(chosen_name); $$;
create or replace function public.mg_remove_friend(other_id uuid) returns boolean
language sql security invoker set search_path = '' as $$ select mg_private.remove_friend(other_id); $$;
create or replace function public.mg_block_member(other_id uuid) returns boolean
language sql security invoker set search_path = '' as $$ select mg_private.block_member(other_id); $$;
create or replace function public.mg_unblock_member(other_id uuid) returns boolean
language sql security invoker set search_path = '' as $$ select mg_private.unblock_member(other_id); $$;
create or replace function public.mg_report_member(other_id uuid,reason text,details_text text) returns boolean
language sql security invoker set search_path = '' as $$ select mg_private.report_member(other_id,reason,details_text); $$;

revoke all on schema mg_private from public, anon;
grant usage on schema mg_private to authenticated;
revoke all on all functions in schema mg_private from public,anon,authenticated;
grant execute on all functions in schema mg_private to authenticated;
revoke all on function public.mg_create_invite(),public.mg_accept_invite(text,text,boolean),
  public.mg_rename_member(text),public.mg_remove_friend(uuid),public.mg_block_member(uuid),
  public.mg_unblock_member(uuid),public.mg_report_member(uuid,text,text) from public,anon,authenticated;
grant execute on function public.mg_create_invite(),public.mg_accept_invite(text,text,boolean),
  public.mg_rename_member(text),public.mg_remove_friend(uuid),public.mg_block_member(uuid),
  public.mg_unblock_member(uuid),public.mg_report_member(uuid,text,text) to authenticated;

comment on schema mg_private is 'Must not be in Supabase Data API exposed schemas. Security definer functions are here.';
comment on table public.mg_members is 'Invite-only, members see only themselves and directly accepted friends.';
comment on table public.mg_private_records is 'Owner-only data protected by RLS. Never automatically ingest local-only Phase 1/2 content.';
