export interface AbilityScore {
    abilitySlug: string;
    abilityName: string;
    score: number; // 0-100
    gameCount: number; // Number of games played for this ability
    averageScore: number; // Average raw score
  }
  
  export interface AbilityScores {
    strengthEndurance: AbilityScore;
    agilitySpeed: AbilityScore;
    aimPrecision: AbilityScore;
    memoryAttention: AbilityScore;
    communication: AbilityScore;
    logicProblemSolving: AbilityScore;
    overall: {
      averageScore: number; // Average of all abilities
      totalGames: number;
    };
  }
  