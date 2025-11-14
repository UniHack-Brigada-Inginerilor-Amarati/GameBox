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
  mental_fortitude_composure_result_id?: string;
  adaptability_decision_making_result_id?: string;
  aim_mechanical_skill_result_id?: string;
  game_sense_awareness_result_id?: string;
  teamwork_communication_result_id?: string;
  strategy_result_id?: string;
}

export interface GameResult {
  game_result_id: string;
  game_slug: string;
  player_name: string;
  session_id: string;
  game_result: any; // JSONB field for game-specific results
}
