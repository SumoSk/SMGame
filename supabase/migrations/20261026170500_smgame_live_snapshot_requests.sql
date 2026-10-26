-- Temporary developer-requested SMCITY snapshots; access only via role-gated Edge Function.
create table if not exists public.smgame_live_snapshot_requests (
  id uuid primary key default gen_random_uuid(),
  target_session_id uuid not null references public.smgame_visitor_sessions(session_id) on delete cascade,
  target_visitor_id uuid not null,
  requester_id uuid not null references auth.users(id) on delete cascade,
  requested_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '3 minutes'),
  status text not null default 'pending' check (status in ('pending','ready','error')),
  captured_at timestamptz,
  snapshot jsonb,
  error_message text,
  check (snapshot is null or status = 'ready')
);
create index if not exists smgame_live_request_target_idx on public.smgame_live_snapshot_requests(target_session_id,status,expires_at);
create index if not exists smgame_live_request_requester_idx on public.smgame_live_snapshot_requests(requester_id,requested_at desc);
alter table public.smgame_live_snapshot_requests enable row level security;
revoke all on public.smgame_live_snapshot_requests from anon, authenticated;
