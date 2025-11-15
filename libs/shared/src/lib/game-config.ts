/**
 * Global Game Configuration
 * Contains difficulty multipliers, ranking system, and rank modifiers for the Spy Card scoring system
 */


export enum AbilityRank {
  S = 1, // S-tier (highest)
  A = 2, // A-tier
  B = 3, // B-tier
  C = 4, // C-tier
  D = 5, // D-tier (lowest)
}

export enum AbilityType {
  MENTAL_FORTITUDE_COMPOSURE = 'mentalFortitudeComposure',
  ADAPTABILITY_DECISION_MAKING = 'adaptabilityDecisionMaking',
  AIM_MECHANICAL_SKILL = 'aimMechanicalSkill',
  GAME_SENSE_AWARENESS = 'gameSenseAwareness',
  TEAMWORK_COMMUNICATION = 'teamworkCommunication',
  STRATEGY = 'strategy',
}


/**
 * Ability Rank Modifiers
 * Inverse relationship: Lower ability rank = higher score multiplier
 * S-tier gets lower multiplier (already skilled), D-tier gets higher multiplier (more room for improvement)
 */
export const ABILITY_RANK_MODIFIERS = {
  [AbilityRank.S]: 1.0, // S-tier: base multiplier
  [AbilityRank.A]: 1.2, // A-tier: 20% bonus
  [AbilityRank.B]: 1.4, // B-tier: 40% bonus
  [AbilityRank.C]: 1.6, // C-tier: 60% bonus
  [AbilityRank.D]: 1.8, // D-tier: 80% bonus (most improvement potential)
} as const;

/**
 * Score Range Configuration
 */
export const SCORE_CONFIG = {
  MIN_SCORE: -100,
  MAX_SCORE: 100,
  BASE_XP_BONUS: 10, // Fixed XP bonus regardless of game result
} as const;

/**
 * Rank Thresholds
 * Total score thresholds for determining overall player rank
 */
export const RANK_THRESHOLDS = {
  [AbilityRank.S]: 80, // 80+ points = S-tier
  [AbilityRank.A]: 60, // 60-79 points = A-tier
  [AbilityRank.B]: 40, // 40-59 points = B-tier
  [AbilityRank.C]: 20, // 20-39 points = C-tier
  [AbilityRank.D]: 0, // 0-19 points = D-tier
} as const;
