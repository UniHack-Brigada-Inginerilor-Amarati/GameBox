import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { ScoreCalculationService, PlayerRanks } from './score-calculation.service';
import { GameService } from '../games/game.service';
import { PlayerGameResult, GameScore, Difficulty } from '@gamebox/shared';

export interface CreatePlayerResultDto {
  gameResultId: string;
  playerName: string;
  baseScore: number;
  isWin: boolean;
  playerRanks: PlayerRanks;
}


@Injectable()
export class PlayerResultService {
  private readonly logger = new Logger(PlayerResultService.name);

  constructor(
    private readonly supabaseService: SupabaseService,
    private readonly scoreCalculationService: ScoreCalculationService,
    private readonly gameService: GameService,
  ) {}

  async createPlayerResult(dto: CreatePlayerResultDto): Promise<PlayerGameResult> {
    const { gameResultId, playerName, baseScore, isWin, playerRanks } = dto;

    const gameResult = await this.getGameResult(gameResultId);
    
    const game = await this.gameService.getGame(gameResult.game_slug);
    const gameAbilityRatios = this.scoreCalculationService.convertPayloadAbilitiesToRatios(
      game.abilities || []
    );

    const gameScore = this.scoreCalculationService.calculateGameScore({
      baseScore,
      difficulty: gameResult.difficulty as Difficulty,
      isWin,
      playerRanks,
      gameAbilityRatios,
    });

    const totalScore = this.scoreCalculationService.calculateTotalScore(gameScore);

    const { data, error } = await this.supabaseService.supabaseAdmin
      .from('player_results')
      .insert({
        player_game_result_id: crypto.randomUUID(),
        game_result_id: gameResultId,
        player_name: playerName,
        score: totalScore,
      })
      .select()
      .single();

    if (error) {
      this.logger.error(`Failed to create player result: ${error.message}`);
      throw new Error(`Failed to create player result: ${error.message}`);
    }

    this.logger.log(`Created player result for ${playerName} with total score: ${totalScore}`);

    return {
      player_game_result_id: data.player_game_result_id,
      game_result_id: data.game_result_id,
      player_name: data.player_name,
      game_score: gameScore,
      totalScore,
    };
  }

  async getPlayerResults(
    playerName: string,
  ): Promise<PlayerGameResult[]> {
    const { data, error } = await this.supabaseService.supabaseAdmin
      .from('player_results')
      .select(`
        player_game_result_id,
        game_result_id,
        player_name,
        score,
        game_results (
          game_slug,
          difficulty,
          session_id,
          game_result
        )
      `)
      .eq('player_name', playerName)
      .order('created_at', { ascending: false });

    if (error) {
      this.logger.error(`Failed to get player results: ${error.message}`);
      throw new Error(`Failed to get player results: ${error.message}`);
    }

    return data.map(result => ({
      player_game_result_id: result.player_game_result_id,
      game_result_id: result.game_result_id,
      player_name: result.player_name,
      game_score: this.convertScoreToGameScore(result.score), // For now, simplified
      totalScore: result.score,
    }));
  }

  async getPlayerResult(playerGameResultId: string): Promise<PlayerGameResult> {
    const { data, error } = await this.supabaseService.supabaseAdmin
      .from('player_results')
      .select(`
        player_game_result_id,
        game_result_id,
        player_name,
        score,
        game_results (
          game_slug,
          difficulty,
          session_id,
          game_result
        )
      `)
      .eq('player_game_result_id', playerGameResultId)
      .single();

    if (error) {
      this.logger.error(`Failed to get player result: ${error.message}`);
      throw new NotFoundException(`Player result not found: ${playerGameResultId}`);
    }

    return {
      player_game_result_id: data.player_game_result_id,
      game_result_id: data.game_result_id,
      player_name: data.player_name,
      game_score: this.convertScoreToGameScore(data.score),
      totalScore: data.score,
    };
  }

  async updatePlayerResult(
    playerGameResultId: string,
    newScore: number,
  ): Promise<PlayerGameResult> {
    const { data, error } = await this.supabaseService.supabaseAdmin
      .from('player_results')
      .update({ score: newScore })
      .eq('player_game_result_id', playerGameResultId)
      .select()
      .single();

    if (error) {
      this.logger.error(`Failed to update player result: ${error.message}`);
      throw new Error(`Failed to update player result: ${error.message}`);
    }

    this.logger.log(`Updated player result ${playerGameResultId} with new score: ${newScore}`);

    return {
      player_game_result_id: data.player_game_result_id,
      game_result_id: data.game_result_id,
      player_name: data.player_name,
      game_score: this.convertScoreToGameScore(data.score),
      totalScore: data.score,
    };
  }
  async getPlayerStats(playerName: string): Promise<{
    totalGames: number;
    averageScore: number;
    bestScore: number;
    totalScore: number;
  }> {
    const { data, error } = await this.supabaseService.supabaseAdmin
      .from('player_results')
      .select('score')
      .eq('player_name', playerName);

    if (error) {
      this.logger.error(`Failed to get player stats: ${error.message}`);
      throw new Error(`Failed to get player stats: ${error.message}`);
    }

    const scores = data.map(result => result.score);
    const totalGames = scores.length;
    const totalScore = scores.reduce((sum, score) => sum + score, 0);
    const averageScore = totalGames > 0 ? totalScore / totalGames : 0;
    const bestScore = totalGames > 0 ? Math.max(...scores) : 0;

    return {
      totalGames,
      averageScore: Math.round(averageScore * 100) / 100, // Round to 2 decimal places
      bestScore,
      totalScore,
    };
  }

  private async getGameResult(gameResultId: string): Promise<{ game_slug: string; difficulty: string; session_id: string; game_result: unknown }> {
    const { data, error } = await this.supabaseService.supabaseAdmin
      .from('game_results')
      .select('*')
      .eq('game_result_id', gameResultId)
      .single();

    if (error) {
      this.logger.error(`Failed to get game result: ${error.message}`);
      throw new NotFoundException(`Game result not found: ${gameResultId}`);
    }

    return data;
  }

  private convertScoreToGameScore(totalScore: number): GameScore {
    return {
      strengthEndurance: Math.round(totalScore / 6),
      agilitySpeed: Math.round(totalScore / 6),
      aimPrecision: Math.round(totalScore / 6),
      memoryAttention: Math.round(totalScore / 6),
      communication: Math.round(totalScore / 6),
      logicProblemSolving: Math.round(totalScore / 6),
    };
  }
  async createMultiplePlayerResults(
    gameResultId: string,
    playerResults: Array<{
      playerName: string;
      baseScore: number;
      isWin: boolean;
      playerRanks: PlayerRanks;
    }>,
  ): Promise<PlayerGameResult[]> {
    const results: PlayerGameResult[] = [];

    for (const playerResult of playerResults) {
      const result = await this.createPlayerResult({
        gameResultId,
        ...playerResult,
      });
      results.push(result);
    }

    this.logger.log(`Created ${results.length} player results for game ${gameResultId}`);
    return results;
  }
}
