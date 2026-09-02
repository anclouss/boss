create table if not exists public.schedule (
  id bigint primary key,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);
insert into public.schedule (id,data) values (1,'{}'::jsonb) on conflict (id) do nothing;
-- Keep RLS enabled and do not expose the service role key to the browser.
alter table public.schedule enable row level security;