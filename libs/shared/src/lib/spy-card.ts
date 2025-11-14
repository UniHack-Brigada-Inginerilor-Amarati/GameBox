import { AbilityRank } from './game-config';

export interface SpyCard {
  username: string;

  // standalone stats
  xp_points: number;

  // spider card ranks (1-5 where 1=S-tier, 5=D-tier)
  overallRank: AbilityRank;
  strengthEnduranceRank: AbilityRank;
  agilitySpeedRank: AbilityRank;
  aimPrecisionRank: AbilityRank;
  memoryAttentionRank: AbilityRank;
  communicationRank: AbilityRank;
  logicProblemSolvingRank: AbilityRank;
}
