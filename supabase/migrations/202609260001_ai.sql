create table public.atlas_ai_usage (
  day date not null,
  bucket text not null,
  requests integer not null default 0,
  primary key(day,bucket)
);
alter table public.atlas_ai_usage enable row level security;
revoke all on public.atlas_ai_usage from anon, authenticated;
grant all on public.atlas_ai_usage to service_role;

create table public.atlas_ai_generations (
  id uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  status text not null check(status in ('pending','completed','failed')),
  model text not null,
  result jsonb,
  input_tokens integer not null default 0,
  output_tokens integer not null default 0
);
alter table public.atlas_ai_generations enable row level security;
revoke all on public.atlas_ai_generations from anon, authenticated;
grant all on public.atlas_ai_generations to service_role;
grant select, delete on public.atlas_ai_generations to authenticated;
create policy ai_own_read on public.atlas_ai_generations for select to authenticated using(user_id=auth.uid());
create policy ai_own_delete on public.atlas_ai_generations for delete to authenticated using(user_id=auth.uid());
create index atlas_ai_user_date on public.atlas_ai_generations(user_id,created_at desc);

create function public.atlas_claim_ai(p_user uuid) returns boolean
language plpgsql security definer set search_path=public as $$
declare d date := (now() at time zone 'UTC')::date; g integer; u integer;
begin
  -- Serialize both checks together so concurrent requests cannot exceed either cap.
  perform pg_advisory_xact_lock(260926001);
  select requests into g from atlas_ai_usage where day=d and bucket='global';
  select requests into u from atlas_ai_usage where day=d and bucket=p_user::text;
  if coalesce(g,0)>=200 or coalesce(u,0)>=10 then return false; end if;
  insert into atlas_ai_usage(day,bucket,requests) values(d,'global',1),(d,p_user::text,1)
    on conflict(day,bucket) do update set requests=atlas_ai_usage.requests+1;
  return true;
end; $$;
revoke all on function public.atlas_claim_ai(uuid) from public,anon,authenticated;
grant execute on function public.atlas_claim_ai(uuid) to service_role;
