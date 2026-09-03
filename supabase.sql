-- Telegram Study Schedule — Supabase setup
-- Выполни весь файл в Supabase SQL Editor.

create table if not exists public.schedule (
  id bigint primary key,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

insert into public.schedule (id, data)
values (
  1,
  jsonb_build_object(
    'semesters', jsonb_build_object(
      'first', jsonb_build_object('odd','{}'::jsonb,'even','{}'::jsonb),
      'second', jsonb_build_object('odd','{}'::jsonb,'even','{}'::jsonb)
    )
  )
)
on conflict (id) do nothing;

-- Если в таблице осталась старая структура расписания, заменяем только её.
update public.schedule
set data = jsonb_build_object(
  'semesters', jsonb_build_object(
    'first', jsonb_build_object('odd','{}'::jsonb,'even','{}'::jsonb),
    'second', jsonb_build_object('odd','{}'::jsonb,'even','{}'::jsonb)
  ),
  'version', 4
), updated_at = now()
where id = 1 and not (data ? 'semesters');

alter table public.schedule enable row level security;

create table if not exists public.notification_users (
  telegram_user_id text primary key,
  chat_id bigint not null,
  enabled boolean not null default true,
  updated_at timestamptz not null default now()
);

alter table public.notification_users enable row level security;

-- ============================================================
-- НАПОМИНАНИЯ БОТА
-- ============================================================
-- Нужно один раз создать секрет с ТОКЕНОМ БОТА.
-- Выполни ОТДЕЛЬНО следующую команду, заменив TOKEN на реальный токен:
-- select vault.create_secret('TOKEN', 'telegram_bot_token');
--
-- Если секрет уже существует и нужно заменить токен:
-- select vault.update_secret('telegram_bot_token', 'TOKEN');

create extension if not exists pg_cron with schema pg_catalog;
create extension if not exists pg_net;
create extension if not exists vault;

create or replace function public.send_class_reminders()
returns void
language plpgsql
security definer
as $$
declare
  local_now timestamp := timezone('Europe/Moscow', now());
  local_date date := local_now::date;
  local_month int := extract(month from local_date);
  local_dow int := extract(isodow from local_date); -- 1 Mon ... 7 Sun
  minute_of_day int := extract(hour from local_now)::int * 60 + extract(minute from local_now)::int;
  target_time text;
  semester_key text;
  parity_key text;
  lesson jsonb;
  r record;
  message_text text;
begin
  -- Учебный год: сентябрь-декабрь и январь-июнь.
  if local_month not between 1 and 6 and local_month not between 9 and 12 then
    return;
  end if;

  -- Учимся только вторник-суббота.
  if local_dow < 2 or local_dow > 6 then
    return;
  end if;

  target_time := case minute_of_day
    when 8*60+5  then '08:15'
    when 10*60-10 then '10:00'
    when 11*60+45-10 then '11:45'
    when 13*60+15-10 then '13:15'
    when 15*60+15-10 then '15:15'
    else null
  end;

  if target_time is null then return; end if;

  semester_key := case when local_month >= 9 then 'first' else 'second' end;
  parity_key := case
    when extract(week from local_date)::int % 2 = 0 then 'even'
    else 'odd'
  end;

  select x into lesson
  from jsonb_array_elements(
    coalesce(
      (select data->'semesters'->semester_key->parity_key->(local_dow::text)
       from public.schedule where id = 1),
      '[]'::jsonb
    )
  ) x
  where x->>'time' = target_time
  limit 1;

  if lesson is null then return; end if;

  message_text := '⏰ Через 10 минут пара'
    || E'\n\n'
    || coalesce(nullif(lesson->>'text',''), 'Занятие')
    || E'\nНачало: ' || target_time
    || case when nullif(lesson->>'room','') is not null then E'\nКабинет: ' || lesson->>'room' else '' end;

  for r in select chat_id from public.notification_users where enabled = true loop
    perform net.http_post(
      url := 'https://api.telegram.org/bot'
        || (select decrypted_secret from vault.decrypted_secrets where name='telegram_bot_token')
        || '/sendMessage',
      body := jsonb_build_object('chat_id', r.chat_id, 'text', message_text),
      headers := jsonb_build_object('Content-Type', 'application/json'),
      timeout_milliseconds := 5000
    );
  end loop;
end;
$$;

-- Удаляем старый cron, если он был.
select cron.unschedule(jobid)
from cron.job
where jobname = 'study-class-reminders-every-minute';

-- Проверяем расписание каждую минуту.
select cron.schedule(
  'study-class-reminders-every-minute',
  '* * * * *',
  'select public.send_class_reminders();'
);
