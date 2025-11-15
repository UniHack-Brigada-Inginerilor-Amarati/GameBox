-- Migration: Create Missions Players Table
-- Description: Tracks which players are playing which missions and their scores

-- Create missions_players table in gamebox schema
CREATE TABLE IF NOT EXISTS gamebox.missions_players (
  mission_slug TEXT NOT NULL,
  player_id UUID NOT NULL,
  score NUMERIC DEFAULT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  
  -- Composite primary key to prevent duplicate entries
  PRIMARY KEY (mission_slug, player_id),
  
  -- Foreign key to player
  CONSTRAINT fk_missions_players_player
    FOREIGN KEY (player_id)
    REFERENCES gamebox.user_profiles(id)
    ON DELETE CASCADE
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_missions_players_mission_slug 
  ON gamebox.missions_players(mission_slug);

CREATE INDEX IF NOT EXISTS idx_missions_players_player_id 
  ON gamebox.missions_players(player_id);

CREATE INDEX IF NOT EXISTS idx_missions_players_score 
  ON gamebox.missions_players(score) 
  WHERE score IS NOT NULL;

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION gamebox.update_missions_players_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update updated_at
CREATE TRIGGER missions_players_updated_at
  BEFORE UPDATE ON gamebox.missions_players
  FOR EACH ROW
  EXECUTE FUNCTION gamebox.update_missions_players_updated_at();

-- Enable Row Level Security
ALTER TABLE gamebox.missions_players ENABLE ROW LEVEL SECURITY;

-- RLS Policies for missions_players

-- Users can view all mission players (to see who's playing)
CREATE POLICY "Users can view all mission players"
  ON gamebox.missions_players FOR SELECT
  USING (true);

-- Users can insert their own mission player entries
CREATE POLICY "Users can insert their own mission player entries"
  ON gamebox.missions_players FOR INSERT
  WITH CHECK (player_id = auth.uid());

-- Users can update their own mission player entries (e.g., update score)
CREATE POLICY "Users can update their own mission player entries"
  ON gamebox.missions_players FOR UPDATE
  USING (player_id = auth.uid())
  WITH CHECK (player_id = auth.uid());

-- Admins can manage all mission player entries
CREATE POLICY "Admins can manage all mission player entries"
  ON gamebox.missions_players FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM gamebox.user_profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Add comment for documentation
COMMENT ON TABLE gamebox.missions_players IS 'Tracks which players are playing which missions and their scores';
COMMENT ON COLUMN gamebox.missions_players.mission_slug IS 'Slug identifier of the mission (from Payload CMS)';
COMMENT ON COLUMN gamebox.missions_players.player_id IS 'UUID of the player (from user_profiles)';
COMMENT ON COLUMN gamebox.missions_players.score IS 'Player score for the mission (nullable, set when mission is completed)';

