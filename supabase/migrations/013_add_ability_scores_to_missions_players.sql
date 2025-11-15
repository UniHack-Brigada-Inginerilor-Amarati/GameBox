-- Migration: Add Ability Scores and State to Missions Players
-- Description: Adds 6 ability-specific score columns and a state column to track mission completion status

-- Add ability score columns
ALTER TABLE gamebox.missions_players
  ADD COLUMN IF NOT EXISTS mental_fortitude_composure_score INTEGER DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS adaptability_decision_making_score INTEGER DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS aim_mechanical_skill_score INTEGER DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS game_sense_awareness_score INTEGER DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS teamwork_communication_score INTEGER DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS strategy_score INTEGER DEFAULT NULL;

-- Add state column (can be 'playing' or 'completed')
ALTER TABLE gamebox.missions_players
  ADD COLUMN IF NOT EXISTS state TEXT DEFAULT 'playing' CHECK (state IN ('playing', 'completed'));

-- Create indexes for the new ability score columns
CREATE INDEX IF NOT EXISTS idx_missions_players_mental_fortitude_composure_score
  ON gamebox.missions_players(mental_fortitude_composure_score)
  WHERE mental_fortitude_composure_score IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_missions_players_adaptability_decision_making_score
  ON gamebox.missions_players(adaptability_decision_making_score)
  WHERE adaptability_decision_making_score IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_missions_players_aim_mechanical_skill_score
  ON gamebox.missions_players(aim_mechanical_skill_score)
  WHERE aim_mechanical_skill_score IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_missions_players_game_sense_awareness_score
  ON gamebox.missions_players(game_sense_awareness_score)
  WHERE game_sense_awareness_score IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_missions_players_teamwork_communication_score
  ON gamebox.missions_players(teamwork_communication_score)
  WHERE teamwork_communication_score IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_missions_players_strategy_score
  ON gamebox.missions_players(strategy_score)
  WHERE strategy_score IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_missions_players_state
  ON gamebox.missions_players(state);

-- Update existing rows: set state to 'completed' if score is not null, otherwise 'playing'
UPDATE gamebox.missions_players
SET state = CASE
  WHEN score IS NOT NULL THEN 'completed'
  ELSE 'playing'
END
WHERE state IS NULL OR state = 'playing';

-- Add comments
COMMENT ON COLUMN gamebox.missions_players.mental_fortitude_composure_score IS 'Score for Mental Fortitude / Composure ability';
COMMENT ON COLUMN gamebox.missions_players.adaptability_decision_making_score IS 'Score for Adaptability / Decision Making ability';
COMMENT ON COLUMN gamebox.missions_players.aim_mechanical_skill_score IS 'Score for Aim / Mechanical Skill ability';
COMMENT ON COLUMN gamebox.missions_players.game_sense_awareness_score IS 'Score for Game Sense / Awareness ability';
COMMENT ON COLUMN gamebox.missions_players.teamwork_communication_score IS 'Score for Teamwork / Communication ability';
COMMENT ON COLUMN gamebox.missions_players.strategy_score IS 'Score for Strategy ability';
COMMENT ON COLUMN gamebox.missions_players.state IS 'Mission state: playing or completed';

