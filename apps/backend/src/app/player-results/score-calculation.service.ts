import { Injectable, Logger } from '@nestjs/common';
import { Difficulty, AbilityRank, DIFFICULTY_MULTIPLIERS, ABILITY_RANK_MODIFIERS, SCORE_CONFIG, GameScore, GameAbility } from '@gamebox/shared';

export interface GameAbilityRatios {
  strengthEndurance?: number;
  agilitySpeed?: number;
  aimPrecision?: number;
  memoryAttention?: number;
  communication?: number;
  logicProblemSolving?: number;
}

export interface PlayerRanks {
  strengthEnduranceRank: AbilityRank;
  agilitySpeedRank: AbilityRank;
  aimPrecisionRank: AbilityRank;
  memoryAttentionRank: AbilityRank;
  communicationRank: AbilityRank;
  logicProblemSolvingRank: AbilityRank;
}

export interface ScoreCalculationInput {
  baseScore: number;
  difficulty: Difficulty;
  isWin: boolean;
  playerRanks: PlayerRanks;
  gameAbilityRatios: GameAbilityRatios;
}

@Injectable()
export class ScoreCalculationService {
  private readonly logger = new Logger(ScoreCalculationService.name);

  calculateAbilityScore(
    baseScore: number,
    difficulty: Difficulty,
    playerRank: AbilityRank,
    gameAbilityRatio: number,
    isWin: boolean,
  ): number {
    const difficultyMultiplier = isWin
      ? DIFFICULTY_MULTIPLIERS[difficulty].winMultiplier
      : DIFFICULTY_MULTIPLIERS[difficulty].lossMultiplier;

    const rankModifier = ABILITY_RANK_MODIFIERS[playerRank];

    const finalScore = Math.round(
      baseScore * difficultyMultiplier * rankModifier * gameAbilityRatio,
    );

    return Math.max(
      SCORE_CONFIG.MIN_SCORE,
      Math.min(SCORE_CONFIG.MAX_SCORE, finalScore),
    );
  }

  calculateGameScore(input: ScoreCalculationInput): GameScore {
    const { baseScore, difficulty, isWin, playerRanks, gameAbilityRatios } = input;

    const gameScore: GameScore = {};

    if (gameAbilityRatios.strengthEndurance) {
      gameScore.strengthEndurance = this.calculateAbilityScore(
        baseScore,
        difficulty,
        playerRanks.strengthEnduranceRank,
        gameAbilityRatios.strengthEndurance,
        isWin,
      );
    }

    if (gameAbilityRatios.agilitySpeed) {
      gameScore.agilitySpeed = this.calculateAbilityScore(
        baseScore,
        difficulty,
        playerRanks.agilitySpeedRank,
        gameAbilityRatios.agilitySpeed,
        isWin,
      );
    }

    if (gameAbilityRatios.aimPrecision) {
      gameScore.aimPrecision = this.calculateAbilityScore(
        baseScore,
        difficulty,
        playerRanks.aimPrecisionRank,
        gameAbilityRatios.aimPrecision,
        isWin,
      );
    }

    if (gameAbilityRatios.memoryAttention) {
      gameScore.memoryAttention = this.calculateAbilityScore(
        baseScore,
        difficulty,
        playerRanks.memoryAttentionRank,
        gameAbilityRatios.memoryAttention,
        isWin,
      );
    }

    if (gameAbilityRatios.communication) {
      gameScore.communication = this.calculateAbilityScore(
        baseScore,
        difficulty,
        playerRanks.communicationRank,
        gameAbilityRatios.communication,
        isWin,
      );
    }

    if (gameAbilityRatios.logicProblemSolving) {
      gameScore.logicProblemSolving = this.calculateAbilityScore(
        baseScore,
        difficulty,
        playerRanks.logicProblemSolvingRank,
        gameAbilityRatios.logicProblemSolving,
        isWin,
      );
    }

    this.logger.debug(`Calculated game score: ${JSON.stringify(gameScore)}`);
    return gameScore;
  }

  calculateTotalScore(gameScore: GameScore): number {
    const scores = [
      gameScore.strengthEndurance || 0,
      gameScore.agilitySpeed || 0,
      gameScore.aimPrecision || 0,
      gameScore.memoryAttention || 0,
      gameScore.communication || 0,
      gameScore.logicProblemSolving || 0,
    ];

    return scores.reduce((total, score) => total + score, 0);
  }
  convertPayloadAbilitiesToRatios(payloadAbilities: GameAbility[]): GameAbilityRatios {
    const ratios: GameAbilityRatios = {};

    for (const item of payloadAbilities) {
      const abilitySlug = item.ability?.slug;
      const score = item.score;

      switch (abilitySlug) {
        case 'strength-endurance':
        case 'strength_endurance':
          ratios.strengthEndurance = score;
          break;
        case 'agility-speed':
        case 'agility_speed':
          ratios.agilitySpeed = score;
          break;
        case 'aim-precision':
        case 'aim_precision':
          ratios.aimPrecision = score;
          break;
        case 'memory-attention':
        case 'memory_attention':
          ratios.memoryAttention = score;
          break;
        case 'communication':
          ratios.communication = score;
          break;
        case 'logic-problem-solving':
        case 'logic_problem_solving':
          ratios.logicProblemSolving = score;
          break;
        default:
          this.logger.warn(`Unknown ability slug: ${abilitySlug}`);
      }
    }

    return ratios;
  }
}
