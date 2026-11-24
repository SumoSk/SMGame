-- Developer chat. Run once through Supabase migration tooling.
begin;
create table if not exists public.smgame_chat_threads (
 account_id uuid primary key references public.smgame_simple_accounts(id),
 status text not null default 'open' check(status in ('open','resolved')),
 updated_at timestamptz not null default now()
);
create table if not exists public.smgame_chat_messages (
 id uuid primary key,
 account_id uuid not null references public.smgame_chat_threads(account_id),
 sender_id uuid not null references public.smgame_simple_accounts(id),
 sender text not null check(sender in ('player','developer')),
 category text not null check(category in ('message','bug','idea')),
 body text not null check(char_length(body)<=2000),
 image text check(image is null or char_length(image)<=300000),
 game_version text check(char_length(game_version)<=80),
 game_day text check(char_length(game_day)<=80),
 created_at timestamptz not null default now(),
 read_at timestamptz,
 check(char_length(body)>0 or image is not null)
);
create index if not exists smgame_chat_thread_time on public.smgame_chat_messages(account_id,created_at desc,id desc);
create index if not exists smgame_chat_unread on public.smgame_chat_messages(account_id,sender) where read_at is null;
create index if not exists smgame_chat_sender_time on public.smgame_chat_messages(sender_id,created_at desc);
alter table public.smgame_chat_threads enable row level security;
alter table public.smgame_chat_messages enable row level security;
revoke all on public.smgame_chat_threads,public.smgame_chat_messages from public,anon,authenticated;
grant select,insert,update on public.smgame_chat_threads,public.smgame_chat_messages to service_role;
create or replace function public.smgame_chat_send(p_id uuid,p_account uuid,p_actor uuid,p_sender text,p_category text,p_body text,p_image text,p_version text,p_day text)
returns text language plpgsql security invoker set search_path='' as $$
begin
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_actor::text,0));
 if exists(select 1 from public.smgame_chat_messages where id=p_id and sender_id=p_actor and account_id=p_account) then return 'ok'; end if;
 if (select count(*) from public.smgame_chat_messages where sender_id=p_actor and created_at>now()-interval '1 minute')>=10 then return 'rate'; end if;
 if (select count(*) from public.smgame_chat_messages where sender_id=p_actor and created_at>now()-interval '24 hours')>=100 then return 'rate'; end if;
 insert into public.smgame_chat_threads(account_id,status,updated_at) values(p_account,'open',now())
 on conflict(account_id) do update set updated_at=now(),status=case when p_sender='player' then 'open' else smgame_chat_threads.status end;
 insert into public.smgame_chat_messages(id,account_id,sender_id,sender,category,body,image,game_version,game_day)
 values(p_id,p_account,p_actor,p_sender,p_category,p_body,p_image,p_version,p_day);
 return 'ok';
end $$;
revoke all on function public.smgame_chat_send(uuid,uuid,uuid,text,text,text,text,text,text) from public,anon,authenticated;
grant execute on function public.smgame_chat_send(uuid,uuid,uuid,text,text,text,text,text,text) to service_role;
commit;
