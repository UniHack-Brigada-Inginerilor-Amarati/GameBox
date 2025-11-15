-- Mission Flow Tables Migration
-- Creates the session, session_player, and game_result tables

-- Create the SESSION table
CREATE TABLE IF NOT EXISTS gamebox.mission_sessions (
  session_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mission_slug TEXT NOT NULL,
  game_master_id UUID NOT NULL,
  progress TEXT DEFAULT 'not_started', -- 'not_started', 'in_progress', 'completed', 'failed'
  start_time TIMESTAMPTZ DEFAULT NOW(),
  end_time TIMESTAMPTZ,

  -- Foreign key to game master
  CONSTRAINT fk_mission_session_game_master
    FOREIGN KEY (game_master_id)
    REFERENCES gamebox.user_profiles(id)
    ON DELETE SET NULL
);

-- Create the GAME_RESULT table
CREATE TABLE IF NOT EXISTS gamebox.game_results (
  game_result_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_slug TEXT NOT NULL,
  player_id UUID NOT NULL,
  session_id UUID NOT NULL,
  game_result JSONB, -- Store game-specific results

  -- Foreign key to player
  CONSTRAINT fk_game_result_player
    FOREIGN KEY (player_id)
    REFERENCES gamebox.user_profiles(id)
    ON DELETE SET NULL,

  -- Foreign key to session
  CONSTRAINT fk_game_result_session
    FOREIGN KEY (session_id)
    REFERENCES gamebox.mission_sessions(session_id)
    ON DELETE SET NULL
);

-- Create the SESSION_PLAYER table (junction table)
CREATE TABLE IF NOT EXISTS gamebox.session_players (
  session_id UUID NOT NULL,
  player_id UUID NOT NULL,

  strength_endurance_result_id UUID,
  agility_speed_result_id UUID,
  aim_precision_result_id UUID,
  memory_attention_result_id UUID,
  communication_result_id UUID,
  logic_problem_solving_result_id UUID,

  -- Composite primary key
  PRIMARY KEY (session_id, player_id),

  -- Foreign key to session
  CONSTRAINT fk_session_player_session
    FOREIGN KEY (session_id)
    REFERENCES gamebox.mission_sessions(session_id)
    ON DELETE SET NULL,

  -- Foreign key to player
  CONSTRAINT fk_session_player_player
    FOREIGN KEY (player_id)
    REFERENCES gamebox.user_profiles(id)
    ON DELETE SET NULL,

  -- Foreign keys to game results by category (optional - can be NULL)
  CONSTRAINT fk_session_player_strength_endurance
    FOREIGN KEY (strength_endurance_result_id)
    REFERENCES gamebox.game_results(game_result_id)
    ON DELETE SET NULL,
  CONSTRAINT fk_session_player_agility_speed
    FOREIGN KEY (agility_speed_result_id)
    REFERENCES gamebox.game_results(game_result_id)
    ON DELETE SET NULL,
  CONSTRAINT fk_session_player_aim_precision
    FOREIGN KEY (aim_precision_result_id)
    REFERENCES gamebox.game_results(game_result_id)
    ON DELETE SET NULL,
  CONSTRAINT fk_session_player_memory_attention
    FOREIGN KEY (memory_attention_result_id)
    REFERENCES gamebox.game_results(game_result_id)
    ON DELETE SET NULL,
  CONSTRAINT fk_session_player_communication
    FOREIGN KEY (communication_result_id)
    REFERENCES gamebox.game_results(game_result_id)
    ON DELETE SET NULL,
  CONSTRAINT fk_session_player_logic_problem_solving
    FOREIGN KEY (logic_problem_solving_result_id)
    REFERENCES gamebox.game_results(game_result_id)
    ON DELETE SET NULL
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_mission_sessions_mission_slug ON gamebox.mission_sessions(mission_slug);
CREATE INDEX IF NOT EXISTS idx_mission_sessions_game_master_id ON gamebox.mission_sessions(game_master_id);
CREATE INDEX IF NOT EXISTS idx_mission_sessions_progress ON gamebox.mission_sessions(progress);

CREATE INDEX IF NOT EXISTS idx_game_results_session_id ON gamebox.game_results(session_id);
CREATE INDEX IF NOT EXISTS idx_game_results_player_id ON gamebox.game_results(player_id);
CREATE INDEX IF NOT EXISTS idx_game_results_game_slug ON gamebox.game_results(game_slug);

CREATE INDEX IF NOT EXISTS idx_session_players_session_id ON gamebox.session_players(session_id);
CREATE INDEX IF NOT EXISTS idx_session_players_player_id ON gamebox.session_players(player_id);

-- Enable Row Level Security
ALTER TABLE gamebox.mission_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE gamebox.game_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE gamebox.session_players ENABLE ROW LEVEL SECURITY;

-- Add comments for documentation
COMMENT ON TABLE gamebox.mission_sessions IS 'Tracks mission sessions with game master and progress';
COMMENT ON TABLE gamebox.game_results IS 'Stores individual game results for players in sessions';
COMMENT ON TABLE gamebox.session_players IS 'Junction table linking players to sessions with their game results by category';

-- Add comments for game category fields
COMMENT ON COLUMN gamebox.session_players.strength_endurance_result_id IS 'Game result for Strength & Endurance category';
COMMENT ON COLUMN gamebox.session_players.agility_speed_result_id IS 'Game result for Agility & Speed category';
COMMENT ON COLUMN gamebox.session_players.aim_precision_result_id IS 'Game result for Aim & Precision category';
COMMENT ON COLUMN gamebox.session_players.memory_attention_result_id IS 'Game result for Memory & Attention to Detail category';
COMMENT ON COLUMN gamebox.session_players.communication_result_id IS 'Game result for Communication category';
COMMENT ON COLUMN gamebox.session_players.logic_problem_solving_result_id IS 'Game result for Logic & Problem Solving category';


CREATE OR REPLACE VIEW gamebox.player_mission_sessions AS
  SELECT
    ms.session_id,
    ms.mission_slug,
    ms.progress,
    ms.start_time,
    ms.end_time,
    sp.player_id
  FROM
    gamebox.mission_sessions ms
  JOIN
    gamebox.session_players sp ON ms.session_id = sp.session_id;

COMMENT ON VIEW gamebox.player_mission_sessions IS 'View combining mission sessions with their associated players';