import { Injectable, Logger } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { MissionService } from '../missions/mission.service';
import { GameService } from '../games/game.service';
import { AbilityScores, AbilityScore, Mission, Game, PlayerGameResult } from '@gamebox/shared';

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
  private async getUserGameResults(username: string): Promise<PlayerGameResult[]> {
    const { data, error } = await this.db.supabase
      .from('player_results')
      .select('*')
      .eq('player_name', username);

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

    // Create ability name mapping (new ability names from mission structure)
    const abilityNames: Record<string, string> = {
      mentalFortitudeComposure: 'Mental Fortitude & Composure',
      adaptabilityDecisionMaking: 'Adaptability & Decision Making',
      aimMechanicalSkill: 'Aim & Mechanical Skill',
      gameSenseAwareness: 'Game Sense & Awareness',
      teamworkCommunication: 'Teamwork & Communication',
      strategy: 'Strategy',
    };

    // Map games from missions to their ability categories
    for (const mission of missions) {
      if (mission.games) {
        // Map each game in the mission to its ability using new property names
        if (mission.games.mentalFortitudeComposure) {
          const game = this.getGameFromMission(mission.games.mentalFortitudeComposure, allGames);
          if (game?.slug) {
            map.set(game.slug, {
              slug: 'mentalFortitudeComposure',
              name: abilityNames.mentalFortitudeComposure,
            });
          }
        }
        if (mission.games.adaptabilityDecisionMaking) {
          const game = this.getGameFromMission(mission.games.adaptabilityDecisionMaking, allGames);
          if (game?.slug) {
            map.set(game.slug, {
              slug: 'adaptabilityDecisionMaking',
              name: abilityNames.adaptabilityDecisionMaking,
            });
          }
        }
        if (mission.games.aimMechanicalSkill) {
          const game = this.getGameFromMission(mission.games.aimMechanicalSkill, allGames);
          if (game?.slug) {
            map.set(game.slug, {
              slug: 'aimMechanicalSkill',
              name: abilityNames.aimMechanicalSkill,
            });
          }
        }
        if (mission.games.gameSenseAwareness) {
          const game = this.getGameFromMission(mission.games.gameSenseAwareness, allGames);
          if (game?.slug) {
            map.set(game.slug, {
              slug: 'gameSenseAwareness',
              name: abilityNames.gameSenseAwareness,
            });
          }
        }
        if (mission.games.teamworkCommunication) {
          const game = this.getGameFromMission(mission.games.teamworkCommunication, allGames);
          if (game?.slug) {
            map.set(game.slug, {
              slug: 'teamworkCommunication',
              name: abilityNames.teamworkCommunication,
            });
          }
        }
        if (mission.games.strategy) {
          const game = this.getGameFromMission(mission.games.strategy, allGames);
          if (game?.slug) {
            map.set(game.slug, {
              slug: 'strategy',
              name: abilityNames.strategy,
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
    gameResults: PlayerGameResult[],
    gameToAbilityMap: Map<string, { slug: string; name: string }>,
  ): Omit<AbilityScores, 'overall'> {
    const abilityData: Record<string, { scores: number[]; name: string; slug: string }> = {
      mentalFortitudeComposure: {
        scores: [],
        name: 'Mental Fortitude / Composure',
        slug: 'mentalFortitudeComposure',
      },
      adaptabilityDecisionMaking: {
        scores: [],
        name: 'Adaptability / Decision Making',
        slug: 'adaptabilityDecisionMaking',
      },
      aimMechanicalSkill: {
        scores: [],
        name: 'Aim / Mechanical Skill',
        slug: 'aimMechanicalSkill',
      },
      gameSenseAwareness: {
        scores: [],
        name: 'Game Sense / Awareness',
        slug: 'gameSenseAwareness',
      },
      teamworkCommunication: {
        scores: [],
        name: 'Teamwork / Communication',
        slug: 'teamworkCommunication',
      },
      strategy: {
        scores: [],
        name: 'Strategy',
        slug: 'strategy',
      },
    };

    // Collect scores for each ability
    for (const result of gameResults) {
      const abilityInfo = gameToAbilityMap.get(result.game_result_id);
      if (abilityInfo) {
        abilityData[abilityInfo.slug].scores.push(result.total_score);
      }
    }

    // Calculate ability scores
    const calculateAbilityScore = (data: {
      scores: number[];
      name: string;
      slug: string;
    }): AbilityScore => {
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
      mentalFortitudeComposure: calculateAbilityScore(abilityData.mentalFortitudeComposure),
      adaptabilityDecisionMaking: calculateAbilityScore(abilityData.adaptabilityDecisionMaking),
      aimMechanicalSkill: calculateAbilityScore(abilityData.aimMechanicalSkill),
      gameSenseAwareness: calculateAbilityScore(abilityData.gameSenseAwareness),
      teamworkCommunication: calculateAbilityScore(abilityData.teamworkCommunication),
      strategy: calculateAbilityScore(abilityData.strategy),
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
      abilityScores.mentalFortitudeComposure,
      abilityScores.adaptabilityDecisionMaking,
      abilityScores.aimMechanicalSkill,
      abilityScores.gameSenseAwareness,
      abilityScores.teamworkCommunication,
      abilityScores.strategy,
    ];

    const totalGames = scores.reduce((sum, score) => sum + score.gameCount, 0);
    const averageScore = scores.reduce((sum, score) => sum + score.score, 0) / scores.length;

    return {
      averageScore: Math.round(averageScore * 100) / 100,
      totalGames,
    };
  }

  /**
   * Get ability scores from spy_cards table
   * Retrieves stored scores from the database and maps them to AbilityScores format
   */
  async getAbilityScoresFromSpyCard(username: string): Promise<AbilityScores> {
    this.logger.debug('Getting ability scores from spy card', { username });

    // Query spy_cards table - try gamebox schema first, then default schema
    let { data: spyCard, error } = await this.db.supabaseAdmin
      .schema('gamebox')
      .from('spy_cards')
      .select('*')
      .eq('username', username)
      .maybeSingle();

    // If not found in gamebox schema, try default schema
    if (error || !spyCard) {
      this.logger.debug('Spy card not found in gamebox schema, trying default schema', { username });
      const result = await this.db.supabaseAdmin
        .from('spy_cards')
        .select('*')
        .eq('username', username)
        .maybeSingle();
      spyCard = result.data;
      error = result.error;
    }

    if (error) {
      if (error.code === 'PGRST116') {
        // Spy card doesn't exist
        this.logger.warn('Spy card not found for user', { username });
        throw new Error(`Spy card not found for user: ${username}`);
      }
      this.logger.error('Error fetching spy card', { username, error: error.message });
      throw new Error(`Failed to get spy card: ${error.message}`);
    }

    if (!spyCard) {
      throw new Error(`Spy card not found for user: ${username}`);
    }

    // Get game counts per ability from player_results
    const gameCounts = await this.getGameCountsPerAbility(username);

    // Map ability names
    const abilityNames: Record<string, string> = {
      mentalFortitudeComposure: 'Mental Fortitude / Composure',
      adaptabilityDecisionMaking: 'Adaptability / Decision Making',
      aimMechanicalSkill: 'Aim / Mechanical Skill',
      gameSenseAwareness: 'Game Sense / Awareness',
      teamworkCommunication: 'Teamwork / Communication',
      strategy: 'Strategy',
    };

    // Map database columns to AbilityScores structure
    const abilityScores: Omit<AbilityScores, 'overall'> = {
      mentalFortitudeComposure: {
        abilitySlug: 'mentalFortitudeComposure',
        abilityName: abilityNames.mentalFortitudeComposure,
        score: Number(spyCard.mental_fortitude_composure_score) || 0,
        gameCount: gameCounts.mentalFortitudeComposure || 0,
        averageScore: Number(spyCard.mental_fortitude_composure_score) || 0,
      },
      adaptabilityDecisionMaking: {
        abilitySlug: 'adaptabilityDecisionMaking',
        abilityName: abilityNames.adaptabilityDecisionMaking,
        score: Number(spyCard.adaptability_decision_making_score) || 0,
        gameCount: gameCounts.adaptabilityDecisionMaking || 0,
        averageScore: Number(spyCard.adaptability_decision_making_score) || 0,
      },
      aimMechanicalSkill: {
        abilitySlug: 'aimMechanicalSkill',
        abilityName: abilityNames.aimMechanicalSkill,
        score: Number(spyCard.aim_mechanical_skill_score) || 0,
        gameCount: gameCounts.aimMechanicalSkill || 0,
        averageScore: Number(spyCard.aim_mechanical_skill_score) || 0,
      },
      gameSenseAwareness: {
        abilitySlug: 'gameSenseAwareness',
        abilityName: abilityNames.gameSenseAwareness,
        score: Number(spyCard.game_sense_awareness_score) || 0,
        gameCount: gameCounts.gameSenseAwareness || 0,
        averageScore: Number(spyCard.game_sense_awareness_score) || 0,
      },
      teamworkCommunication: {
        abilitySlug: 'teamworkCommunication',
        abilityName: abilityNames.teamworkCommunication,
        score: Number(spyCard.teamwork_communication_score) || 0,
        gameCount: gameCounts.teamworkCommunication || 0,
        averageScore: Number(spyCard.teamwork_communication_score) || 0,
      },
      strategy: {
        abilitySlug: 'strategy',
        abilityName: abilityNames.strategy,
        score: Number(spyCard.strategy_score) || 0,
        gameCount: gameCounts.strategy || 0,
        averageScore: Number(spyCard.strategy_score) || 0,
      },
    };

    // Calculate overall stats
    const overall = this.calculateOverall(abilityScores);

    return {
      ...abilityScores,
      overall,
    };
  }

  /**
   * Get game counts per ability for a user
   * Queries player_results with a join to game_results to get game_slug, then maps to abilities
   */
  private async getGameCountsPerAbility(username: string): Promise<Record<string, number>> {
    this.logger.debug('Getting game counts per ability', { username });

    // Query player_results with join to game_results to get game_slug
    const { data: playerResults, error } = await this.db.supabaseAdmin
      .from('player_results')
      .select(
        `
        game_result_id,
        game_results (
          game_slug
        )
      `,
      )
      .eq('player_name', username);

    if (error) {
      this.logger.error('Error fetching player results for game counts', error);
      throw error;
    }

    // Get missions and games to create the ability map
    const missions = await this.missionService.getMissions();
    const allGames = await this.gameService.getGames();
    const gameToAbilityMap = this.createGameToAbilityMap(missions, allGames);

    // Initialize counts
    const counts: Record<string, number> = {
      mentalFortitudeComposure: 0,
      adaptabilityDecisionMaking: 0,
      aimMechanicalSkill: 0,
      gameSenseAwareness: 0,
      teamworkCommunication: 0,
      strategy: 0,
    };

    // Count games per ability using game_slug from the joined game_results
    if (playerResults) {
      for (const result of playerResults) {
        // Handle the joined game_results structure (can be array or object)
        const gameResult = Array.isArray(result.game_results)
          ? result.game_results[0]
          : result.game_results;
        const gameSlug = gameResult?.game_slug;

        if (gameSlug) {
          const abilityInfo = gameToAbilityMap.get(gameSlug);
          if (abilityInfo) {
            counts[abilityInfo.slug] = (counts[abilityInfo.slug] || 0) + 1;
          }
        }
      }
    }

    return counts;
  }
}
