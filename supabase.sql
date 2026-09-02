create table if not exists public.schedule (
  id bigint primary key,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);
insert into public.schedule (id,data) values (1,jsonb_build_object('semesters',jsonb_build_object('first',jsonb_build_object('odd','{}'::jsonb,'even','{}'::jsonb),'second',jsonb_build_object('odd','{}'::jsonb,'even','{}'::jsonb)))) on conflict (id) do nothing;
alter table public.schedule enable row level security;

create table if not exists public.notification_users (
  telegram_user_id text primary key,
  chat_id bigint not null,
  enabled boolean not null default true,
  updated_at timestamptz not null default now()
);
alter table public.notification_users enable row level security;

-- === АВТОМАТИЧЕСКИЕ НАПОМИНАНИЯ БОТА ===
-- Supabase Cron запускает проверку каждую минуту. Время занятий считается по Europe/Moscow.
create extension if not exists pg_cron with schema pg_catalog;
create extension if not exists pg_net;

-- Вставь токен бота вместо YOUR_BOT_TOKEN и выполни этот блок один раз.
-- Токен хранится в Supabase Vault, а не в коде приложения.
do $$
begin
  if not exists (select 1 from vault.decrypted_secrets where name='telegram_bot_token') then
    perform vault.create_secret('YOUR_BOT_TOKEN','telegram_bot_token');
  end if;
end $$;

create or replace function public.send_class_reminders()
returns void
language plpgsql
security definer
as $$
declare
  now_local timestamptz := now() at time zone 'Europe/Moscow';
  y int := extract(year from now_local);
  m int := extract(month from now_local);
  d int := extract(day from now_local);
  dow int := extract(dow from now_local); -- 0 Sun ... 6 Sat
  hh int := extract(hour from now_local);
  mm int := extract(minute from now_local);
  target_time text;
  sem text;
  par text;
  lesson jsonb;
  r record;
  msg text;
  iso_week int;
begin
  if dow < 2 or dow > 6 then return; end if;
  target_time := case hh*60+mm
    when 8*60+5 then '08:15'
    when 9*60+50 then '10:00'
    when 11*60+35 then '11:45'
    when 13*60+5 then '13:15'
    when 15*60+5 then '15:15'
    else null end;
  if target_time is null then return; end if;
  sem := case when m >= 9 then 'first' else 'second' end;
  iso_week := extract(week from now_local);
  par := case when mod(iso_week,2)=0 then 'even' else 'odd' end;
  select x into lesson
  from jsonb_array_elements(coalesce((select data->'semesters'->sem->par->(dow::text) from public.schedule where id=1),'[]'::jsonb)) x
  where x->>'time'=target_time limit 1;
  if lesson is null then return; end if;
  msg := '⏰ Через 10 минут пара' || E'\n\n' || coalesce(lesson->>'text','') || E'\nНачало: ' || target_time || coalesce(E'\nКабинет: ' || nullif(lesson->>'room',''),'');
  for r in select chat_id from public.notification_users where enabled=true loop
    perform net.http_post(
      url := 'https://api.telegram.org/bot' || (select decrypted_secret from vault.decrypted_secrets where name='telegram_bot_token') || '/sendMessage',
      body := jsonb_build_object('chat_id',r.chat_id,'text',msg),
      headers := jsonb_build_object('Content-Type','application/json'),
      timeout_milliseconds := 5000
    );
  end loop;
end;
$$;

-- Если job уже существует, сначала удаляем старую версию.
select cron.unschedule(jobid) from cron.job where jobname='study-class-reminders-every-minute';
select cron.schedule('study-class-reminders-every-minute','* * * * *','select public.send_class_reminders();');
