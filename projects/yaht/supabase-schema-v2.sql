-- ============================================
-- Yahtzeeeee Multiplayer V2 — Schema Updates
-- Run this in Supabase SQL Editor AFTER v1
-- ============================================

-- Add new columns to games table
ALTER TABLE games ADD COLUMN IF NOT EXISTS player1_name text;
ALTER TABLE games ADD COLUMN IF NOT EXISTS player2_name text;
ALTER TABLE games ADD COLUMN IF NOT EXISTS current_turn int;
ALTER TABLE games ADD COLUMN IF NOT EXISTS turn_dice jsonb;
ALTER TABLE games ADD COLUMN IF NOT EXISTS turn_held jsonb;
ALTER TABLE games ADD COLUMN IF NOT EXISTS turn_rolls_left int DEFAULT 3;
ALTER TABLE games ADD COLUMN IF NOT EXISTS last_action jsonb;

-- Add player_num to players table
ALTER TABLE players ADD COLUMN IF NOT EXISTS player_num int;
