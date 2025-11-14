/**
 * TypeScript interfaces for the Spy Card scoring system
 * Based on the design document in docs/SPY_CARD.md
 */

import { AbilityRank, AbilityType } from './game-config';

/**
 * Game result data structure
 * Stores the raw result data from a completed game
 */
export interface GameResult {
  game_result_id: string; // primary key
  game_slug: string;
  session_id: string;
  game_result: any; // JSONB field for game-specific results
}

/**
 * Individual player's result for a specific game
 * Links a player to a game result with their computed score
 */
export interface PlayerGameResult {
  player_game_result_id: string; // primary key
  game_result_id: string; // foreign key to game_results table
  player_name: string;
  game_score: GameScore;
}

/**
 * Computed scores for each ability type
 * Score is computed from the game_result after the game is completed
 */
export interface GameScore {
  mentalFortitudeComposure?: number;
  adaptabilityDecisionMaking?: number;
  aimMechanicalSkill?: number;
  gameSenseAwareness?: number;
  teamworkCommunication?: number;
  strategy?: number;
}

/**
 * User's Spy Card profile
 * Linked to user profile, contains all ranking and progression data
 */
export interface SpyCard {
  username: string;

  // Standalone stats
  xp_points: number;

  // Spider card ranks (1-5 where 1=S-tier, 5=D-tier)
  overallRank: AbilityRank;
  mentalFortitudeComposureRank: AbilityRank;
  adaptabilityDecisionMakingRank: AbilityRank;
  aimMechanicalSkillRank: AbilityRank;
  gameSenseAwarenessRank: AbilityRank;
  teamworkCommunicationRank: AbilityRank;
  strategyRank: AbilityRank;

  // Optional fields for additional features
  profilePicture?: string;
  badges?: Badge[];
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Badge system for achievements and milestones
 */
export interface Badge {
  badge_id: string;
  name: string;
  description: string;
  tier: 'silver' | 'gold' | 'diamond';
  icon?: string;
  earnedAt: Date;
}

/**
 * Radar chart data for visual representation
 */
export interface RadarChartData {
  mentalFortitudeComposure: number;
  adaptabilityDecisionMaking: number;
  aimMechanicalSkill: number;
  gameSenseAwareness: number;
  teamworkCommunication: number;
  strategy: number;
}

/**
 * Score calculation input parameters
 */
export interface ScoreCalculationInput {
  baseScore: number;
  difficulty: 'easy' | 'medium' | 'hard';
  playerRank: AbilityRank;
  gameAbilityRatio: number;
  isWin: boolean;
}

/**
 * Complete game session scoring result
 */
export interface GameSessionScore {
  sessionId: string;
  gameSlug: string;
  playerName: string;
  difficulty: 'easy' | 'medium' | 'hard';
  isWin: boolean;
  abilityScores: GameScore;
  xpGained: number;
  totalScore: number;
  timestamp: Date;
}

/**
 * User statistics aggregation
 */
export interface UserStats {
  username: string;
  totalGamesPlayed: number;
  totalXP: number;
  winRate: number;
  averageScore: number;
  bestGame: {
    gameSlug: string;
    score: number;
    date: Date;
  };
  abilityAverages: GameScore;
  rankHistory: Array<{
    ability: AbilityType;
    rank: AbilityRank;
    achievedAt: Date;
  }>;
}

/**
 * Leaderboard entry
 */
export interface LeaderboardEntry {
  rank: number;
  username: string;
  totalScore: number;
  totalXP: number;
  overallRank: AbilityRank;
  gamesPlayed: number;
}
