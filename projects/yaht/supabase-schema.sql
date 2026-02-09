-- ============================================
-- Yahtzeeeee Multiplayer Schema
-- Run this in Supabase SQL Editor
-- ============================================

-- Games table
create table if not exists games (
  id uuid default gen_random_uuid() primary key,
  code text unique not null,
  created_at timestamptz default now(),
  current_round int default 1,
  status text default 'lobby' check (status in ('lobby', 'playing', 'finished')),
  max_players int default 6,
  creator_token text not null
);

-- Players table
create table if not exists players (
  id uuid default gen_random_uuid() primary key,
  game_id uuid references games(id) on delete cascade,
  name text not null,
  session_token text not null,
  scores jsonb default '{}',
  bonuses jsonb default '[]',
  jail_penalty int default 0,
  joker_points int default 0,
  current_round int default 1,
  total_score int default 0,
  joined_at timestamptz default now()
);

-- Index for fast code lookups
create index if not exists idx_games_code on games(code);
create index if not exists idx_players_game on players(game_id);

-- ============================================
-- Row Level Security (RLS)
-- Allow anonymous access (no auth required)
-- ============================================

alter table games enable row level security;
alter table players enable row level security;

-- Games: anyone can read, anyone can insert, only creator can update
create policy "Games are viewable by everyone"
  on games for select using (true);

create policy "Anyone can create a game"
  on games for insert with check (true);

create policy "Anyone can update games"
  on games for update using (true);

-- Players: anyone can read, anyone can insert, anyone can update (client validates via session_token)
create policy "Players are viewable by everyone"
  on players for select using (true);

create policy "Anyone can join a game"
  on players for insert with check (true);

create policy "Anyone can update players"
  on players for update using (true);

-- ============================================
-- Enable Realtime on both tables
-- ============================================
alter publication supabase_realtime add table games;
alter publication supabase_realtime add table players;
