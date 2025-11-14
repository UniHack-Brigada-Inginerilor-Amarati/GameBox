export type Progress = 'not_started' | 'in_progress' | 'completed' | 'failed';

export interface MissionSession {
  session_id: string;
  mission_slug: string;
  game_master: string;
  progress: Progress;
  start_time: Date;
  end_time?: Date;
  created_at?: Date;
  updated_at?: Date;
}

export interface SessionPlayer {
  session_id: string;
  player_name: string;
  strength_endurance_result_id?: string;
  agility_speed_result_id?: string;
  aim_precision_result_id?: string;
  memory_attention_result_id?: string;
  communication_result_id?: string;
  logic_problem_solving_result_id?: string;
}

export interface GameResult {
  game_result_id: string; // primary key
  game_slug: string;
  session_id: string;
  game_result: any; // JSONB field for game-specific results
}

export interface PlayerGameResult {
  player_game_result_id: string; // primary key
  game_result_id: string; // foreign key to game_results table
  player_name: string;
  game_score: GameScore;
  totalScore: number;
}

// Score is computed from the game_result, after the game is completed
export interface GameScore {
  strengthEndurance?: number;
  agilitySpeed?: number;
  aimPrecision?: number;
  memoryAttention?: number;
  communication?: number;
  logicProblemSolving?: number;
}
