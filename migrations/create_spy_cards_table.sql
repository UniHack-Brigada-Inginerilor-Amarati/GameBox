-- Create spy_cards table
-- This table stores ability scores and ranks for each player

CREATE TABLE IF NOT EXISTS spy_cards (
  username TEXT PRIMARY KEY,
  xp_points INTEGER DEFAULT 0 NOT NULL,
  
  -- Ability scores (numeric to support decimals)
  mental_fortitude_composure_score NUMERIC DEFAULT 0 NOT NULL,
  adaptability_decision_making_score NUMERIC DEFAULT 0 NOT NULL,
  aim_mechanical_skill_score NUMERIC DEFAULT 0 NOT NULL,
  game_sense_awareness_score NUMERIC DEFAULT 0 NOT NULL,
  teamwork_communication_score NUMERIC DEFAULT 0 NOT NULL,
  strategy_score NUMERIC DEFAULT 0 NOT NULL,
  
  -- Ability ranks (will be calculated based on final score count)
  mental_fortitude_composure_rank INTEGER DEFAULT 0,
  adaptability_decision_making_rank INTEGER DEFAULT 0,
  aim_mechanical_skill_rank INTEGER DEFAULT 0,
  game_sense_awareness_rank INTEGER DEFAULT 0,
  teamwork_communication_rank INTEGER DEFAULT 0,
  strategy_rank INTEGER DEFAULT 0,
  
  -- Overall rank and total score
  overall_rank INTEGER DEFAULT 0,
  total_score NUMERIC DEFAULT 0 NOT NULL,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Create index on username for faster lookups (though it's already the primary key)
-- Create index on total_score for leaderboard queries
CREATE INDEX IF NOT EXISTS idx_spy_cards_total_score ON spy_cards(total_score DESC);
CREATE INDEX IF NOT EXISTS idx_spy_cards_overall_rank ON spy_cards(overall_rank);

-- Create function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_spy_cards_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update updated_at
CREATE TRIGGER trigger_update_spy_cards_updated_at
  BEFORE UPDATE ON spy_cards
  FOR EACH ROW
  EXECUTE FUNCTION update_spy_cards_updated_at();

