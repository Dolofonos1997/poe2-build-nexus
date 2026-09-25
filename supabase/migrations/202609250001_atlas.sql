-- Run in a Supabase project. The web app uses only a publishable key.
begin;
create table public.atlas_workspaces (
 user_id uuid primary key references auth.users(id) on delete cascade,
 payload jsonb not null check(jsonb_typeof(payload)='object' and octet_length(payload::text)<2000000),
 updated_at timestamptz not null default now()
);
create table public.atlas_builds (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references auth.users(id) on delete cascade,
 title text not null check(length(title) between 1 and 120),
 author text not null check(length(author) between 1 and 60),
 payload jsonb not null check(jsonb_typeof(payload)='object' and octet_length(payload::text)<1000000),
 published boolean not null default true,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
create table public.atlas_comments (
 id uuid primary key default gen_random_uuid(),
 build_id uuid not null references public.atlas_builds(id) on delete cascade,
 user_id uuid not null references auth.users(id) on delete cascade,
 author text not null check(length(author) between 1 and 60),
 body text not null check(length(body) between 1 and 2000),
 created_at timestamptz not null default now()
);
create table public.atlas_likes (
 build_id uuid not null references public.atlas_builds(id) on delete cascade,
 user_id uuid not null references auth.users(id) on delete cascade,
 primary key(build_id,user_id)
);
create table public.atlas_admins (user_id uuid primary key references auth.users(id) on delete cascade);
alter table public.atlas_workspaces enable row level security;
alter table public.atlas_builds enable row level security;
alter table public.atlas_comments enable row level security;
alter table public.atlas_likes enable row level security;
alter table public.atlas_admins enable row level security;
create policy workspace_owner on public.atlas_workspaces for all to authenticated using((select auth.uid())=user_id) with check((select auth.uid())=user_id);
create policy admin_self_read on public.atlas_admins for select to authenticated using((select auth.uid())=user_id);
create policy build_read on public.atlas_builds for select using(published or (select auth.uid())=user_id or exists(select 1 from public.atlas_admins where user_id=(select auth.uid())));
create policy build_insert on public.atlas_builds for insert to authenticated with check((select auth.uid())=user_id);
create policy build_update on public.atlas_builds for update to authenticated using((select auth.uid())=user_id) with check((select auth.uid())=user_id);
create policy build_delete on public.atlas_builds for delete to authenticated using((select auth.uid())=user_id or exists(select 1 from public.atlas_admins where user_id=(select auth.uid())));
create policy comment_read on public.atlas_comments for select using(exists(select 1 from public.atlas_builds b where b.id=build_id and b.published));
create policy comment_insert on public.atlas_comments for insert to authenticated with check((select auth.uid())=user_id and exists(select 1 from public.atlas_builds b where b.id=build_id and b.published));
create policy comment_delete on public.atlas_comments for delete to authenticated using((select auth.uid())=user_id or exists(select 1 from public.atlas_admins where user_id=(select auth.uid())));
create policy like_read on public.atlas_likes for select using(exists(select 1 from public.atlas_builds b where b.id=build_id and b.published));
create policy like_insert on public.atlas_likes for insert to authenticated with check((select auth.uid())=user_id and exists(select 1 from public.atlas_builds b where b.id=build_id and b.published));
create policy like_delete on public.atlas_likes for delete to authenticated using((select auth.uid())=user_id);
grant select,insert,update,delete on public.atlas_workspaces to authenticated;
grant select on public.atlas_builds,public.atlas_comments,public.atlas_likes to anon,authenticated;
grant insert,update,delete on public.atlas_builds to authenticated;
grant insert,delete on public.atlas_comments,public.atlas_likes to authenticated;
grant select on public.atlas_admins to authenticated;
create index atlas_builds_published_created on public.atlas_builds(published,created_at desc);
create index atlas_comments_build on public.atlas_comments(build_id,created_at);
create function public.atlas_touch_updated() returns trigger language plpgsql set search_path='' as $$ begin new.updated_at=now();return new;end; $$;
create trigger atlas_workspace_touch before update on public.atlas_workspaces for each row execute function public.atlas_touch_updated();
create trigger atlas_build_touch before update on public.atlas_builds for each row execute function public.atlas_touch_updated();
-- Optimistic concurrency: stale devices must fetch the latest timestamp first.
create function public.atlas_save_workspace(data jsonb, expected timestamptz default null) returns timestamptz language plpgsql security invoker set search_path='' as $$
declare stamp timestamptz;
begin
 if auth.uid() is null then raise exception 'Sign in first';end if;
 if expected is null then
  insert into public.atlas_workspaces(user_id,payload) values(auth.uid(),data) returning updated_at into stamp;
 else
  update public.atlas_workspaces set payload=data where user_id=auth.uid() and updated_at=expected returning updated_at into stamp;
  if stamp is null then raise exception 'Cloud workspace changed. Refresh cloud status before saving.';end if;
 end if;
 return stamp;
end; $$;
revoke all on function public.atlas_save_workspace(jsonb,timestamptz) from public;
grant execute on function public.atlas_save_workspace(jsonb,timestamptz) to authenticated;
commit;
