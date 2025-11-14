import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import {
  GameResult,
  MissionSession,
  UserProfileDTO,
  PlayerGameResult,
  GameScore,
} from '@gamebox/shared';
import { MissionService } from '../missions/mission.service';
import { ProfileService } from '../profile/profile.service';

// this is a placeholder for the dynamic time zone feature
function getRomaniaTime(): Date {
  const now = new Date();
  return new Date(now.getTime() + 3 * 60 * 60 * 1000);
}

@Injectable()
export class SessionService {
  constructor(
    private readonly db: SupabaseService,
    private readonly profileService: ProfileService,
    private readonly missionService: MissionService,
  ) {}
  private readonly logger = new Logger(SessionService.name);

  async createSession(mission_slug: string, game_master: string): Promise<MissionSession> {
    this.logger.debug('Creating mission session', { game_master, mission_slug });

    const sessionData: Partial<MissionSession> = {
      mission_slug,
      game_master,
      progress: 'not_started',
    };

    const { data, error } = await this.db.supabaseAdmin
      .from('sessions')
      .insert(sessionData)
      .select()
      .single();

    if (error) {
      this.db.handleSupabaseError('createSession', error, { game_master, mission_slug });
    }

    this.logger.log('Mission session created successfully', {
      sessionId: data.session_id,
      game_master,
      mission_slug,
    });

    return data;
  }

  async setStartTime(sessionId: string): Promise<MissionSession> {
    this.logger.debug('Setting start time', { sessionId });
    const { data, error } = await this.db.supabaseAdmin
      .from('sessions')
      .update({ start_time: getRomaniaTime() })
      .eq('session_id', sessionId)
      .select()
      .single();

    if (error) {
      this.db.handleSupabaseError('updateSessionTime', error, { sessionId });
    }

    if (!data) {
      throw new NotFoundException('Session not found');
    }

    return data;
  }

  async setEndTime(sessionId: string): Promise<MissionSession> {
    this.logger.debug('Setting end time', { sessionId });
    const { data, error } = await this.db.supabaseAdmin
      .from('sessions')
      .update({ end_time: getRomaniaTime() })
      .eq('session_id', sessionId)
      .select()
      .single();

    if (error) {
      this.db.handleSupabaseError('setEndTime', error, { sessionId });
    }

    if (!data) {
      throw new NotFoundException('Session not found');
    }

    return data;
  }

  async getSessions(): Promise<MissionSession[]> {
    this.logger.debug('Fetching all sessions');
    const { data, error } = await this.db.supabaseAdmin.from('sessions').select('*');

    if (error) {
      this.db.handleSupabaseError('getSessions', error);
    }

    if (!data) {
      throw new NotFoundException('Sessions not found');
    }

    this.logger.debug('Sessions fetched successfully', { data });

    return data;
  }

  async getSession(sessionId: string): Promise<MissionSession> {
    this.logger.debug('Fetching session by ID', { sessionId });

    const { data: session, error } = await this.db.supabaseAdmin
      .from('sessions')
      .select('*')
      .eq('session_id', sessionId)
      .single();

    if (error) {
      this.db.handleSupabaseError('getSession', error, {
        sessionId,
      });
    }

    if (!session) {
      throw new NotFoundException('Session not found');
    }

    return session;
  }

  async getSessionPlayers(sessionId: string): Promise<UserProfileDTO[]> {
    this.logger.debug('Fetching session players', { sessionId });

    // Query player_results joined with game_results to get unique player names for this session
    const { data, error } = await this.db.supabaseAdmin
      .from('player_results')
      .select(
        `
        player_name,
        game_results!inner (
          session_id
        )
      `,
      )
      .eq('game_results.session_id', sessionId);

    if (error) {
      this.db.handleSupabaseError('getSessionPlayers', error, {
        sessionId,
      });
    }

    // Return empty array if no players found (instead of throwing error)
    if (!data || data.length === 0) {
      this.logger.debug('No players found for session', { sessionId });
      return [];
    }

    // Get unique player names
    interface PlayerResultWithGame {
      player_name: string;
      game_results: { session_id: string }[];
    }
    const uniquePlayerNames = [
      ...new Set(data.map((result: PlayerResultWithGame) => result.player_name)),
    ];

    // Get user profiles by usernames
    const userProfiles = await this.profileService.getProfilesByUsernames(uniquePlayerNames);

    return userProfiles.map((profile) => this.profileService.mapUserProfileToDTO(profile));
  }

  async getMissionSlug(sessionId: string): Promise<string> {
    this.logger.debug('Fetching mission slug', { sessionId });
    const { data, error } = await this.db.supabaseAdmin
      .from('sessions')
      .select('mission_slug')
      .eq('session_id', sessionId)
      .single();

    if (error) {
      this.db.handleSupabaseError('getMissionSlug', error, {
        sessionId,
      });
    }

    if (!data) {
      throw new NotFoundException('Mission slug not found');
    }

    return data.mission_slug;
  }

  async getGameResults(sessionId: string): Promise<PlayerGameResult[]> {
    this.logger.debug('Fetching player game results for session', { sessionId });
    const { data, error } = await this.db.supabaseAdmin
      .from('player_results')
      .select(
        `
        player_game_result_id,
        game_result_id,
        player_name,
        score,
        game_results (
          game_slug,
          session_id,
          difficulty,
          game_result
        )
      `,
      )
      .eq('game_results.session_id', sessionId);

    if (error) {
      this.logger.error('Error fetching game results', { error, sessionId });
      this.db.handleSupabaseError('getGameResults', error, {
        sessionId,
      });
    }

    // Return empty array if no results exist (instead of throwing error)
    if (!data || data.length === 0) {
      this.logger.debug('No game results found for session', { sessionId });
      return [];
    }

    // Transform to PlayerGameResult format
    interface PlayerResultWithGameResult {
      player_game_result_id: string;
      game_result_id: string;
      player_name: string;
      score: number;
      game_results: {
        game_slug: string;
        session_id: string;
        difficulty: string;
        game_result: unknown;
      }[];
    }
    return data.map((result: PlayerResultWithGameResult) => ({
      player_game_result_id: result.player_game_result_id,
      game_result_id: result.game_result_id,
      player_name: result.player_name,
      game_score: this.convertScoreToGameScore(result.score),
      total_score: result.score,
    }));
  }

  private convertScoreToGameScore(totalScore: number): GameScore {
    // Distribute score evenly across all abilities
    const scorePerAbility = Math.round(totalScore / 6);
    return {
      mentalFortitudeComposure: scorePerAbility,
      adaptabilityDecisionMaking: scorePerAbility,
      aimMechanicalSkill: scorePerAbility,
      gameSenseAwareness: scorePerAbility,
      teamworkCommunication: scorePerAbility,
      strategy: scorePerAbility,
    };
  }

  private generateRandomGameResult() {
    return {
      score: Math.floor(Math.random() * 1000) + 1,
      time: Math.floor(Math.random() * 300) + 30,
      completed: Math.random() > 0.2,
      timestamp: new Date().toISOString(),
    };
  }

  async createGameResults(
    sessionId: string,
    gameSlug: string,
    playerNames: string[],
  ): Promise<GameResult[]> {
    this.logger.debug('Creating game results with random data', {
      sessionId,
      gameSlug,
      playerNames,
    });

    // Step 1: Create ONE game_result per game per session (not per player)
    const gameResultToInsert = {
      session_id: sessionId,
      game_slug: gameSlug,
      difficulty: 'medium', // Default difficulty, can be enhanced later
      game_result: this.generateRandomGameResult(),
    };

    const { data: gameResultData, error: gameResultError } = await this.db.supabaseAdmin
      .from('game_results')
      .insert(gameResultToInsert)
      .select()
      .single();

    if (gameResultError) {
      this.db.handleSupabaseError('createGameResults', gameResultError, {
        sessionId,
        gameSlug,
        playerNames,
      });
    }

    if (!gameResultData) {
      throw new NotFoundException('Game result not created');
    }

    const gameResultId = gameResultData.game_result_id;

    // Step 2: Create player_results for each player referencing the game_result_id
    const playerResultsToInsert = playerNames.map((playerName) => ({
      game_result_id: gameResultId,
      player_name: playerName,
      score: 0, // Initial score, will be calculated/updated later
    }));

    const { data: playerResultsData, error: playerResultsError } = await this.db.supabaseAdmin
      .from('player_results')
      .insert(playerResultsToInsert)
      .select();

    if (playerResultsError) {
      this.logger.error('Error creating player results', {
        error: playerResultsError,
        gameResultId,
        playerNames,
      });
      // Don't fail completely, but log the error
      // The game_result was created successfully
    }

    this.logger.debug('Game results created successfully', {
      gameResultId,
      playerResultsCount: playerResultsData?.length || 0,
    });

    // Return the created game_result
    return [gameResultData];
  }
}
