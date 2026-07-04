-- Run this in your Supabase SQL Editor if the Check In Today button does not persist.
-- Creates the streaks table (idempotent).

create table if not exists public.streaks (
  id               uuid         primary key default gen_random_uuid(),
  user_identifier  text         not null,
  completed_date   date         not null,
  created_at       timestamptz  not null default now(),
  unique (user_identifier, completed_date)
);

-- Allow authenticated users to read and write their own streaks.
alter table public.streaks enable row level security;

create policy if not exists "users can insert own streaks"
  on public.streaks for insert
  to authenticated
  with check (user_identifier = auth.uid()::text);

create policy if not exists "users can select own streaks"
  on public.streaks for select
  to authenticated
  using (user_identifier = auth.uid()::text);

-- Also allow service role (api-server) unrestricted access.
create policy if not exists "service role bypass"
  on public.streaks for all
  to service_role
  using (true)
  with check (true);
