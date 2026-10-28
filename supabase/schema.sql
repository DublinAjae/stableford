-- Run once in the Supabase SQL editor.

create extension if not exists "pgcrypto";

create table if not exists rounds (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists course_holes (
  round_id uuid not null references rounds(id) on delete cascade,
  hole int not null check (hole between 1 and 18),
  par int not null default 4 check (par between 3 and 6),
  stroke_index int not null check (stroke_index between 1 and 18),
  primary key (round_id, hole)
);

create table if not exists players (
  id uuid primary key default gen_random_uuid(),
  round_id uuid not null references rounds(id) on delete cascade,
  name text not null,
  course_handicap int not null default 18,
  group_code text not null default 'A',
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists players_round_idx on players(round_id, group_code, sort_order);

create table if not exists scores (
  player_id uuid not null references players(id) on delete cascade,
  hole int not null check (hole between 1 and 18),
  gross int check (gross is null or (gross between 1 and 20)),
  updated_at timestamptz not null default now(),
  primary key (player_id, hole)
);

alter publication supabase_realtime add table rounds;
alter publication supabase_realtime add table course_holes;
alter publication supabase_realtime add table players;
alter publication supabase_realtime add table scores;

alter table rounds enable row level security;
alter table course_holes enable row level security;
alter table players enable row level security;
alter table scores enable row level security;

-- Public read (leaderboard / group views). Writes go through Next.js API with service role.
create policy "public read rounds" on rounds for select using (true);
create policy "public read course_holes" on course_holes for select using (true);
create policy "public read players" on players for select using (true);
create policy "public read scores" on scores for select using (true);
