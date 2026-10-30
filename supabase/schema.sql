-- Stableford app storage (catalog + rounds as JSON documents).
create table if not exists app_data (
  id text primary key,
  payload jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table app_data enable row level security;

-- Drop old policies if re-running
drop policy if exists "public read app_data" on app_data;
drop policy if exists "public write app_data" on app_data;
drop policy if exists "public update app_data" on app_data;
drop policy if exists "public insert app_data" on app_data;

create policy "public read app_data" on app_data
  for select using (true);

create policy "public insert app_data" on app_data
  for insert with check (true);

create policy "public update app_data" on app_data
  for update using (true) with check (true);

insert into app_data (id, payload)
values
  ('catalog', '{"courses":[],"members":[]}'::jsonb),
  ('rounds', '[]'::jsonb),
  ('migrated', '{"ok":true}'::jsonb)
on conflict (id) do nothing;
