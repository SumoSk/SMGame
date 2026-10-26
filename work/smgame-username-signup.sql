create table if not exists public.smgame_signup_rate_limits (
 bucket text primary key,
 started_at timestamptz not null,
 attempts integer not null default 0
);
alter table public.smgame_signup_rate_limits enable row level security;
revoke all on public.smgame_signup_rate_limits from public,anon,authenticated;
grant all on public.smgame_signup_rate_limits to service_role;
create or replace function public.smgame_allow_signup(bucket_key text,bucket_limit integer)
returns boolean language plpgsql security invoker set search_path=public,pg_temp as $$
declare hits integer;
begin
 delete from public.smgame_signup_rate_limits where started_at < now()-interval '1 day';
 insert into public.smgame_signup_rate_limits(bucket,started_at,attempts)
 values(bucket_key,date_trunc('hour',now()),1)
 on conflict(bucket) do update set
 attempts=case when smgame_signup_rate_limits.started_at<date_trunc('hour',now()) then 1 else smgame_signup_rate_limits.attempts+1 end,
 started_at=date_trunc('hour',now())
 returning attempts into hits;
 return hits<=least(greatest(bucket_limit,1),60);
end;
$$;
revoke all on function public.smgame_allow_signup(text,integer) from public,anon,authenticated;
grant execute on function public.smgame_allow_signup(text,integer) to service_role;
