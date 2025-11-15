export type Progress = 'not_started' | 'in_progress' | 'completed' | 'failed';

export interface Session {
  session_id: string;
  mission_slug: string;
  game_master: string;
  progress: Progress;
  start_time: Date;
  end_time?: Date;
  created_at?: Date;
  updated_at?: Date;
}

export interface GameResult {
  game_result_id: string; // primary key
  game_slug: string;
  session_id: string;
  game_result?: any; // JSONB field for game-specific results (optional)
}

export interface PlayerGameResult {
  player_game_result_id: string; // primary key
  game_result_id: string; // foreign key to game_results table
  player_name: string;
  game_score?: GameScore;
  total_score: number;
}

// Score is computed from the game_result, after the game is completed
export interface GameScore {
  mentalFortitudeComposure?: number;
  adaptabilityDecisionMaking?: number;
  aimMechanicalSkill?: number;
  gameSenseAwareness?: number;
  teamworkCommunication?: number;
  strategy?: number;
}
