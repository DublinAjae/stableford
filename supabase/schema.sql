-- Optional Supabase backend (single JSON document).
create table if not exists app_data (
  id int primary key,
  payload jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table app_data enable row level security;
create policy "public read app_data" on app_data for select using (true);

insert into app_data (id, payload)
values (1, '{"version":3,"courses":[],"members":[],"rounds":[]}'::jsonb)
on conflict (id) do nothing;
