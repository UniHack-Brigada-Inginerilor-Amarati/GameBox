export interface AbilityScore {
    abilitySlug: string;
    abilityName: string;
    score: number; // 0-100
    gameCount: number; // Number of games played for this ability
    averageScore: number; // Average raw score
  }
  
  export interface AbilityScores {
    mentalFortitudeComposure: AbilityScore;
    adaptabilityDecisionMaking: AbilityScore;
    aimMechanicalSkill: AbilityScore;
    gameSenseAwareness: AbilityScore;
    teamworkCommunication: AbilityScore;
    strategy: AbilityScore;
    overall: {
      averageScore: number; // Average of all abilities
      totalGames: number;
    };
  }
  