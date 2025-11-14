import { Injectable, Logger } from '@nestjs/common';
import { GameService } from '../games/game.service';
import { SupabaseService } from '../supabase/supabase.service';
import { Game, ScratchCard } from '@gamebox/shared';

@Injectable()
export class ScratchCardService {
  constructor(
    private readonly gamesService: GameService,
    private readonly supabaseService: SupabaseService,
  ) {}
  private readonly logger = new Logger(ScratchCardService.name);

  async getScratchCard(userId?: string): Promise<ScratchCard> {
    this.logger.debug('Fetching scratch card data', { userId });

    try {
      const games = await this.gamesService.getGames();
      this.logger.debug('Successfully fetched games from GamesService', {
        count: games.length,
      });

      const userProgress = userId ? await this.getUserProgress(userId) : new Map();

      const totalGames = games.length;
      const completedGames = this.calculateCompletedGames(games, userProgress);
      const completionRate = totalGames > 0 ? (completedGames / totalGames) * 100 : 0;

      const gameStatus: { [gameSlug: string]: { isPlayed: boolean } } = {};
      games.forEach((game) => {
        if (game.slug) {
          gameStatus[game.slug] = {
            isPlayed: userProgress.has(game.slug) && userProgress.get(game.slug).isCompleted,
          };
        }
      });

      const scratchCard: ScratchCard = {
        id: `scratch-card-${userId || 'anonymous'}`,
        name: 'Game Progress Dashboard',
        description: 'Track your achievements across all available games',
        games: games,
        totalGames,
        completedGames,
        completionRate: Math.round(completionRate * 100) / 100,
        isCompleted: completionRate === 100,
        gameStatus: gameStatus,
      };

      this.logger.debug('Scratch card data prepared successfully', {
        totalGames,
        completedGames,
        completionRate: `${scratchCard.completionRate}%`,
      });

      return scratchCard;
    } catch (error) {
      this.logger.error('Failed to fetch scratch card data', error);
      throw error;
    }
  }

  private async getUserProgress(
    userId: string,
  ): Promise<Map<string, { isCompleted: boolean; score: number; completedAt: string }>> {
    this.logger.debug('Fetching user progress from Supabase', { userId });

    try {
      // Query player_results joined with game_results to get game_slug and score
      const { data, error } = await this.supabaseService.supabase
        .from('player_results')
        .select(
          `
          score,
          game_results (
            game_slug
          )
        `,
        )
        .eq('player_name', userId);

      if (error) {
        this.logger.warn('Failed to fetch user progress from Supabase, using empty progress', {
          error: error.message,
        });
        return new Map();
      }

      const progressMap = new Map();
      data?.forEach((result: any) => {
        if (result.game_results?.game_slug) {
          const gameSlug = result.game_results.game_slug;
          const score = result.score || 0;
          progressMap.set(gameSlug, {
            isCompleted: true,
            score: score,
            completedAt: new Date().toISOString(),
          });
        }
      });

      this.logger.debug('User progress fetched successfully', {
        userId,
        completedGames: progressMap.size,
      });

      return progressMap;
    } catch (error) {
      this.logger.warn(
        'Exception while fetching user progress from Supabase, using empty progress',
        { error: error.message },
      );
      return new Map();
    }
  }

  private calculateCompletedGames(
    games: Game[],
    userProgress: Map<string, { isCompleted: boolean; score: number; completedAt: string }>,
  ): number {
    return games.filter(
      (game) => game.slug && userProgress.has(game.slug) && userProgress.get(game.slug).isCompleted,
    ).length;
  }
}
