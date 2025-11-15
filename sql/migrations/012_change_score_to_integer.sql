-- Migration: Change Score Column to Integer
-- Description: Changes the score column from NUMERIC to INTEGER (4-byte int)

-- Alter the score column to INTEGER
ALTER TABLE gamebox.missions_players
  ALTER COLUMN score TYPE INTEGER USING score::INTEGER;

-- Update the comment
COMMENT ON COLUMN gamebox.missions_players.score IS 'Player score for the mission (nullable integer, set when mission is completed)';

