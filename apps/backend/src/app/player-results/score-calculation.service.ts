import { Injectable, Logger } from '@nestjs/common';
import {
  AbilityRank,
  ABILITY_RANK_MODIFIERS,
  SCORE_CONFIG,
  GameScore,
  GameAbility,
} from '@gamebox/shared';

export interface GameAbilityRatios {
  mentalFortitudeComposure?: number;
  adaptabilityDecisionMaking?: number;
  aimMechanicalSkill?: number;
  gameSenseAwareness?: number;
  teamworkCommunication?: number;
  strategy?: number;
}

export interface PlayerRanks {
  mentalFortitudeComposureRank: AbilityRank;
  adaptabilityDecisionMakingRank: AbilityRank;
  aimMechanicalSkillRank: AbilityRank;
  gameSenseAwarenessRank: AbilityRank;
  teamworkCommunicationRank: AbilityRank;
  strategyRank: AbilityRank;
}

export interface ScoreCalculationInput {
  baseScore: number;
  isWin: boolean;
  playerRanks: PlayerRanks;
  gameAbilityRatios: GameAbilityRatios;
}

@Injectable()
export class ScoreCalculationService {
  private readonly logger = new Logger(ScoreCalculationService.name);

  calculateAbilityScore(
    baseScore: number,
    playerRank: AbilityRank,
    gameAbilityRatio: number,
    isWin: boolean,
  ): number {
    const rankModifier = ABILITY_RANK_MODIFIERS[playerRank];

    const finalScore = Math.round(
      baseScore * rankModifier * gameAbilityRatio,
    );

    return Math.max(SCORE_CONFIG.MIN_SCORE, Math.min(SCORE_CONFIG.MAX_SCORE, finalScore));
  }

  calculateGameScore(input: ScoreCalculationInput): GameScore {
    const { baseScore, isWin, playerRanks, gameAbilityRatios } = input;

    const gameScore: GameScore = {};

    if (gameAbilityRatios.mentalFortitudeComposure) {
      gameScore.mentalFortitudeComposure = this.calculateAbilityScore(
        baseScore,
        playerRanks.mentalFortitudeComposureRank,
        gameAbilityRatios.mentalFortitudeComposure,
        isWin,
      );
    }

    if (gameAbilityRatios.adaptabilityDecisionMaking) {
      gameScore.adaptabilityDecisionMaking = this.calculateAbilityScore(
        baseScore,
        playerRanks.adaptabilityDecisionMakingRank,
        gameAbilityRatios.adaptabilityDecisionMaking,
        isWin,
      );
    }

    if (gameAbilityRatios.aimMechanicalSkill) {
      gameScore.aimMechanicalSkill = this.calculateAbilityScore(
        baseScore,
        playerRanks.aimMechanicalSkillRank,
        gameAbilityRatios.aimMechanicalSkill,
        isWin,
      );
    }

    if (gameAbilityRatios.gameSenseAwareness) {
      gameScore.gameSenseAwareness = this.calculateAbilityScore(
        baseScore,
        playerRanks.gameSenseAwarenessRank,
        gameAbilityRatios.gameSenseAwareness,
        isWin,
      );
    }

    if (gameAbilityRatios.teamworkCommunication) {
      gameScore.teamworkCommunication = this.calculateAbilityScore(
        baseScore,
        playerRanks.teamworkCommunicationRank,
        gameAbilityRatios.teamworkCommunication,
        isWin,
      );
    }

    if (gameAbilityRatios.strategy) {
      gameScore.strategy = this.calculateAbilityScore(
        baseScore,
        playerRanks.strategyRank,
        gameAbilityRatios.strategy,
        isWin,
      );
    }

    this.logger.debug(`Calculated game score: ${JSON.stringify(gameScore)}`);
    return gameScore;
  }

  calculateTotalScore(gameScore: GameScore): number {
    const scores = [
      gameScore.mentalFortitudeComposure || 0,
      gameScore.adaptabilityDecisionMaking || 0,
      gameScore.aimMechanicalSkill || 0,
      gameScore.gameSenseAwareness || 0,
      gameScore.teamworkCommunication || 0,
      gameScore.strategy || 0,
    ];

    return scores.reduce((total, score) => total + score, 0);
  }
  convertPayloadAbilitiesToRatios(payloadAbilities: GameAbility[]): GameAbilityRatios {
    const ratios: GameAbilityRatios = {};

    for (const item of payloadAbilities) {
      const abilitySlug = item.slug;
      const score = item.score;

      switch (abilitySlug) {
        case 'mental-fortitude-composure':
        case 'mental_fortitude_composure':
        case 'mentalFortitudeComposure':
          ratios.mentalFortitudeComposure = score;
          break;
        case 'adaptability-decision-making':
        case 'adaptability_decision_making':
        case 'adaptabilityDecisionMaking':
          ratios.adaptabilityDecisionMaking = score;
          break;
        case 'aim-mechanical-skill':
        case 'aim_mechanical_skill':
        case 'aimMechanicalSkill':
          ratios.aimMechanicalSkill = score;
          break;
        case 'game-sense-awareness':
        case 'game_sense_awareness':
        case 'gameSenseAwareness':
          ratios.gameSenseAwareness = score;
          break;
        case 'teamwork-communication':
        case 'teamwork_communication':
        case 'teamworkCommunication':
          ratios.teamworkCommunication = score;
          break;
        case 'strategy':
          ratios.strategy = score;
          break;
        default:
          this.logger.warn(`Unknown ability slug: ${abilitySlug}`);
      }
    }

    return ratios;
  }
}
