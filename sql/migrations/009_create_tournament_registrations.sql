-- Migration: Create Tournament Registration System
-- Description: Creates tables for tournament registrations and player tracking
-- This table links players (from gamebox.user_profiles) to tournaments (from payload.tournaments)

-- Create tournament_registrations table in gamebox schema
CREATE TABLE IF NOT EXISTS gamebox.tournament_registrations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tournament_id INTEGER NOT NULL,
  player_id UUID NOT NULL REFERENCES gamebox.user_profiles(id) ON DELETE CASCADE,
  registered_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  status TEXT NOT NULL DEFAULT 'registered' CHECK (status IN ('registered', 'cancelled', 'completed')),
  
  -- Ensure a player can only register once per tournament
  UNIQUE(tournament_id, player_id),
  
  -- Foreign key to payload.tournaments table
  CONSTRAINT tournament_registrations_tournament_id_fk 
    FOREIGN KEY (tournament_id) 
    REFERENCES payload.tournaments(id) 
    ON DELETE CASCADE 
    ON UPDATE NO ACTION
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS tournament_registrations_tournament_id_idx 
  ON gamebox.tournament_registrations(tournament_id);

CREATE INDEX IF NOT EXISTS tournament_registrations_player_id_idx 
  ON gamebox.tournament_registrations(player_id);

CREATE INDEX IF NOT EXISTS tournament_registrations_status_idx 
  ON gamebox.tournament_registrations(status);

-- Create a function to get tournament player count
CREATE OR REPLACE FUNCTION gamebox.get_tournament_player_count(tournament_id_param INTEGER)
RETURNS INTEGER AS $$
BEGIN
  RETURN (
    SELECT COUNT(*)::INTEGER
    FROM gamebox.tournament_registrations
    WHERE tournament_id = tournament_id_param
      AND status = 'registered'
  );
END;
$$ LANGUAGE plpgsql STABLE;

-- Create a view for tournament statistics
CREATE OR REPLACE VIEW gamebox.tournament_stats AS
SELECT 
  tr.tournament_id,
  COUNT(*) FILTER (WHERE tr.status = 'registered') AS current_players,
  COUNT(*) FILTER (WHERE tr.status = 'cancelled') AS cancelled_count,
  COUNT(*) FILTER (WHERE tr.status = 'completed') AS completed_count
FROM gamebox.tournament_registrations tr
GROUP BY tr.tournament_id;

-- Enable RLS on tournament_registrations table
ALTER TABLE gamebox.tournament_registrations ENABLE ROW LEVEL SECURITY;

-- RLS Policies for tournament_registrations

-- Users can view all registrations (to see who's registered)
CREATE POLICY "Users can view all tournament registrations"
  ON gamebox.tournament_registrations FOR SELECT
  USING (true);

-- Users can register themselves for tournaments
CREATE POLICY "Users can register for tournaments"
  ON gamebox.tournament_registrations FOR INSERT
  WITH CHECK (player_id = auth.uid());

-- Users can cancel their own registrations
CREATE POLICY "Users can cancel their own registrations"
  ON gamebox.tournament_registrations FOR UPDATE
  USING (player_id = auth.uid())
  WITH CHECK (player_id = auth.uid() AND status = 'cancelled');

-- Admins can manage all registrations
CREATE POLICY "Admins can manage all tournament registrations"
  ON gamebox.tournament_registrations FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM gamebox.user_profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

