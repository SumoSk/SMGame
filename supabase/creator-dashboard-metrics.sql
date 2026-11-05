alter table public.smgame_visitor_sessions add column if not exists metrics jsonb;
comment on column public.smgame_visitor_sessions.metrics is 'Optional reported city metrics. Null means older clients did not collect these values; never infer historic levels.';
