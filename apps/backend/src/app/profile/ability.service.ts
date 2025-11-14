import { Injectable, Logger } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { MissionService } from '../missions/mission.service';
import { GameService } from '../games/game.service';
import { AbilityScores, AbilityScore } from '@gamebox/shared';
import { Mission, Game } from '@gamebox/shared';

interface GameResultData {
  game_slug: string;
  game_result: {
    score?: number;
    [key: string]: any;
  };
}

@Injectable()
export class AbilityService {
  constructor(
    private readonly db: SupabaseService,
    private readonly missionService: MissionService,
    private readonly gameService: GameService,
  ) {}
  private readonly logger = new Logger(AbilityService.name);

  /**
   * Calculate ability scores for a user based on their game results
   */
  async calculateAbilityScores(userId: string): Promise<AbilityScores> {
    this.logger.debug('Calculating ability scores', { userId });

    // Get all game results for the user
    const gameResults = await this.getUserGameResults(userId);
    this.logger.debug('Fetched game results', { count: gameResults.length });

    // Get all missions to map games to abilities
    // Use depth=2 to ensure games are populated, not just IDs
    const missions = await this.missionService.getMissions();
    this.logger.debug('Fetched missions', { count: missions.length });

    // Get all games to get ability relationships
    const allGames = await this.gameService.getGames();
    this.logger.debug('Fetched games', { count: allGames.length });

    // Create a map of game slug to ability category
    const gameToAbilityMap = this.createGameToAbilityMap(missions, allGames);

    // Aggregate scores by ability
    const abilityScores = this.aggregateScoresByAbility(gameResults, gameToAbilityMap);

    // Calculate overall stats
    const overall = this.calculateOverall(abilityScores);

    return {
      ...abilityScores,
      overall,
    };
  }

  /**
   * Get all game results for a user
   */
  private async getUserGameResults(userId: string): Promise<GameResultData[]> {
    const { data, error } = await this.db.supabase
      .from('game_results')
      .select('game_slug, game_result')
      .eq('player_id', userId);

    if (error) {
      this.logger.error('Error fetching game results', error);
      throw error;
    }

    return data || [];
  }

  /**
   * Create a map from game slug to ability category
   * Uses mission structure to determine which ability each game tests
   */
  private createGameToAbilityMap(
    missions: Mission[],
    allGames: Game[],
  ): Map<string, { slug: string; name: string }> {
    const map = new Map<string, { slug: string; name: string }>();

    // Create ability name mapping
    const abilityNames: Record<string, string> = {
      strengthEndurance: 'Strength & Endurance',
      agilitySpeed: 'Agility & Speed',
      aimPrecision: 'Aim & Precision',
      memoryAttention: 'Memory & Attention',
      communication: 'Communication',
      logicProblemSolving: 'Logic & Problem Solving',
    };

    // Map games from missions to their ability categories
    for (const mission of missions) {
      if (mission.games) {
        // Map each game in the mission to its ability
        if (mission.games.strengthEndurance) {
          const game = this.getGameFromMission(mission.games.strengthEndurance, allGames);
          if (game?.slug) {
            map.set(game.slug, { slug: 'strengthEndurance', name: abilityNames.strengthEndurance });
          }
        }
        if (mission.games.agilitySpeed) {
          const game = this.getGameFromMission(mission.games.agilitySpeed, allGames);
          if (game?.slug) {
            map.set(game.slug, { slug: 'agilitySpeed', name: abilityNames.agilitySpeed });
          }
        }
        if (mission.games.aimPrecision) {
          const game = this.getGameFromMission(mission.games.aimPrecision, allGames);
          if (game?.slug) {
            map.set(game.slug, { slug: 'aimPrecision', name: abilityNames.aimPrecision });
          }
        }
        if (mission.games.memoryAttention) {
          const game = this.getGameFromMission(mission.games.memoryAttention, allGames);
          if (game?.slug) {
            map.set(game.slug, { slug: 'memoryAttention', name: abilityNames.memoryAttention });
          }
        }
        if (mission.games.communication) {
          const game = this.getGameFromMission(mission.games.communication, allGames);
          if (game?.slug) {
            map.set(game.slug, { slug: 'communication', name: abilityNames.communication });
          }
        }
        if (mission.games.logicProblemSolving) {
          const game = this.getGameFromMission(mission.games.logicProblemSolving, allGames);
          if (game?.slug) {
            map.set(game.slug, {
              slug: 'logicProblemSolving',
              name: abilityNames.logicProblemSolving,
            });
          }
        }
      }
    }

    this.logger.debug('Created game to ability map', { size: map.size });
    return map;
  }

  /**
   * Extract game object from mission game reference (can be ID or full object)
   */
  private getGameFromMission(gameRef: any, allGames: Game[]): Game | null {
    if (!gameRef) return null;

    // If it's already a full game object with slug
    if (typeof gameRef === 'object' && gameRef.slug) {
      return gameRef;
    }

    // If it's an ID (number), we need to look it up in allGames
    // Payload games have an id field, but our shared Game interface may not
    // Try to find by checking if the game object has an id property matching
    if (typeof gameRef === 'number') {
      // Look through allGames to find a match
      // Note: This assumes Payload returns games with id when fetched
      const found = allGames.find((g: any) => (g as any).id === gameRef);
      return found || null;
    }

    // If it's a slug string, find by slug
    if (typeof gameRef === 'string') {
      return allGames.find((g) => g.slug === gameRef) || null;
    }

    return null;
  }

  /**
   * Aggregate scores by ability category
   */
  private aggregateScoresByAbility(
    gameResults: GameResultData[],
    gameToAbilityMap: Map<string, { slug: string; name: string }>,
  ): Omit<AbilityScores, 'overall'> {
    const abilityData: Record<
      string,
      { scores: number[]; name: string; slug: string }
    > = {
      strengthEndurance: { scores: [], name: 'Strength & Endurance', slug: 'strengthEndurance' },
      agilitySpeed: { scores: [], name: 'Agility & Speed', slug: 'agilitySpeed' },
      aimPrecision: { scores: [], name: 'Aim & Precision', slug: 'aimPrecision' },
      memoryAttention: { scores: [], name: 'Memory & Attention', slug: 'memoryAttention' },
      communication: { scores: [], name: 'Communication', slug: 'communication' },
      logicProblemSolving: {
        scores: [],
        name: 'Logic & Problem Solving',
        slug: 'logicProblemSolving',
      },
    };

    // Collect scores for each ability
    for (const result of gameResults) {
      const abilityInfo = gameToAbilityMap.get(result.game_slug);
      if (abilityInfo) {
        const score = this.extractScore(result.game_result);
        if (score !== null) {
          abilityData[abilityInfo.slug].scores.push(score);
        }
      }
    }

    // Calculate ability scores
    const calculateAbilityScore = (data: { scores: number[]; name: string; slug: string }): AbilityScore => {
      const gameCount = data.scores.length;
      const averageScore = gameCount > 0 ? data.scores.reduce((a, b) => a + b, 0) / gameCount : 0;
      
      // Normalize to 0-100 scale
      // Assume max possible score is 100 for normalization
      // If scores exceed 100, we'll cap at 100
      const normalizedScore = Math.min(100, Math.max(0, averageScore));

      return {
        abilitySlug: data.slug,
        abilityName: data.name,
        score: Math.round(normalizedScore * 100) / 100, // Round to 2 decimals
        gameCount,
        averageScore: Math.round(averageScore * 100) / 100,
      };
    };

    return {
      strengthEndurance: calculateAbilityScore(abilityData.strengthEndurance),
      agilitySpeed: calculateAbilityScore(abilityData.agilitySpeed),
      aimPrecision: calculateAbilityScore(abilityData.aimPrecision),
      memoryAttention: calculateAbilityScore(abilityData.memoryAttention),
      communication: calculateAbilityScore(abilityData.communication),
      logicProblemSolving: calculateAbilityScore(abilityData.logicProblemSolving),
    };
  }

  /**
   * Extract score from game result JSONB
   */
  private extractScore(gameResult: any): number | null {
    if (!gameResult) return null;

    // Try different possible score fields
    if (typeof gameResult.score === 'number') {
      return gameResult.score;
    }
    if (typeof gameResult.points === 'number') {
      return gameResult.points;
    }
    if (typeof gameResult.totalScore === 'number') {
      return gameResult.totalScore;
    }

    // If score is a string, try to parse it
    if (typeof gameResult.score === 'string') {
      const parsed = parseFloat(gameResult.score);
      if (!isNaN(parsed)) return parsed;
    }

    return null;
  }

  /**
   * Calculate overall statistics
   */
  private calculateOverall(abilityScores: Omit<AbilityScores, 'overall'>): {
    averageScore: number;
    totalGames: number;
  } {
    const scores = [
      abilityScores.strengthEndurance,
      abilityScores.agilitySpeed,
      abilityScores.aimPrecision,
      abilityScores.memoryAttention,
      abilityScores.communication,
      abilityScores.logicProblemSolving,
    ];

    const totalGames = scores.reduce((sum, score) => sum + score.gameCount, 0);
    const averageScore =
      scores.reduce((sum, score) => sum + score.score, 0) / scores.length;

    return {
      averageScore: Math.round(averageScore * 100) / 100,
      totalGames,
    };
  }
}

