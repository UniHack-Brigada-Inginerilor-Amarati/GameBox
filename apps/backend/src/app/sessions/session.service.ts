import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { Session, PlayerGameResult, UserProfileDTO } from '@gamebox/shared';
import { MissionService } from '../missions/mission.service';
import { ProfileService } from '../profile/profile.service';
import { randomUUID } from 'crypto';

// Helper function for Romania timezone
function getRomaniaTime(): Date {
  const now = new Date();
  return new Date(now.getTime() + 3 * 60 * 60 * 1000);
}

// Generate random score between -100 and 100
function generateRandomScore(): number {
  return Math.floor(Math.random() * 201) - 100; // Range: -100 to 100
}

@Injectable()
export class SessionService {
  constructor(
    private readonly db: SupabaseService,
    private readonly profileService: ProfileService,
    private readonly missionService: MissionService,
  ) {}
  private readonly logger = new Logger(SessionService.name);

  /**
   * Create a new session and automatically create game results for all games in the mission
   */
  async createSession(mission_slug: string, game_master: string): Promise<Session> {
    this.logger.debug('Creating mission session', { game_master, mission_slug });

    // Step 1: Convert username to user ID
    const profile = await this.profileService.getProfileByUsername(game_master);
    const gameMasterId = profile.id;

    if (!gameMasterId) {
      throw new NotFoundException(`User profile not found for username: ${game_master}`);
    }

    // Step 2: Create the session entry with user ID
    const sessionData: Partial<Session> = {
      mission_slug,
      game_master: gameMasterId, // Use user ID (UUID) instead of username
      progress: 'not_started',
      start_time: getRomaniaTime(),
    };

    const { data: session, error: sessionError } = await this.db.supabaseAdmin
      .from('sessions')
      .insert(sessionData)
      .select()
      .single();

    if (sessionError) {
      this.db.handleSupabaseError('createSession', sessionError, { game_master, mission_slug });
    }

    if (!session) {
      throw new NotFoundException('Failed to create session');
    }

    this.logger.log('Session created successfully', {
      sessionId: session.session_id,
      game_master,
      mission_slug,
    });

    // Step 2: Fetch mission to get all games
    const games = await this.missionService.getMissionGames(mission_slug);

    if (!games || games.length === 0) {
      this.logger.warn('No games found for mission', { mission_slug });
      // Still return the session even if no games found
      return session;
    }

    // Step 3: Create game results for each game in the mission
    const gameResultsToInsert = games.map((game) => ({
      session_id: session.session_id,
      game_slug: game.slug,
    }));

    const { data: gameResults, error: gameResultsError } = await this.db.supabaseAdmin
      .from('game_results')
      .insert(gameResultsToInsert)
      .select();

    if (gameResultsError) {
      this.logger.error('Failed to create game results', {
        error: gameResultsError,
        sessionId: session.session_id,
        mission_slug,
      });
      // Log error but don't fail the session creation
      // The session was created successfully, game results can be added later if needed
    } else {
      this.logger.log('Game results created successfully', {
        sessionId: session.session_id,
        gameResultsCount: gameResults?.length || 0,
      });
    }

    return session;
  }

  /**
   * Add players to a session and create player results for all game results in the session
   */
  async addSessionPlayers(sessionId: string, playerNames: string[]): Promise<PlayerGameResult[]> {
    this.logger.debug('Adding players to session', { sessionId, playerNames });

    if (!playerNames || playerNames.length === 0) {
      throw new BadRequestException('At least one player name must be provided');
    }

    // Step 1: Validate that all player names exist
    try {
      const profiles = await this.profileService.getProfilesByUsernames(playerNames);
      const foundUsernames = profiles.map((p) => p.username);
      const missingUsernames = playerNames.filter((name) => !foundUsernames.includes(name));

      if (missingUsernames.length > 0) {
        throw new NotFoundException(
          `The following player names do not exist: ${missingUsernames.join(', ')}`,
        );
      }
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error('Error validating player names', { error, playerNames });
      throw new BadRequestException('Failed to validate player names');
    }

    // Step 2: Fetch all game results for this session
    const { data: gameResults, error: gameResultsError } = await this.db.supabaseAdmin
      .from('game_results')
      .select('game_result_id')
      .eq('session_id', sessionId);

    if (gameResultsError) {
      this.db.handleSupabaseError('addSessionPlayers', gameResultsError, {
        sessionId,
        playerNames,
      });
    }

    if (!gameResults || gameResults.length === 0) {
      this.logger.warn('No game results found for session', { sessionId });
      return [];
    }

    // Step 3: Create player results for each player and each game result
    const playerResultsToInsert: Array<{
      player_game_result_id: string;
      game_result_id: string;
      player_name: string;
      score: number;
    }> = [];

    for (const playerName of playerNames) {
      for (const gameResult of gameResults) {
        playerResultsToInsert.push({
          player_game_result_id: randomUUID(),
          game_result_id: gameResult.game_result_id,
          player_name: playerName,
          score: generateRandomScore(),
        });
      }
    }

    const { data: playerResults, error: playerResultsError } = await this.db.supabaseAdmin
      .from('player_results')
      .insert(playerResultsToInsert)
      .select();

    if (playerResultsError) {
      this.logger.error('Error creating player results', {
        error: playerResultsError,
        sessionId,
        playerNames,
      });
      this.db.handleSupabaseError('addSessionPlayers', playerResultsError, {
        sessionId,
        playerNames,
      });
    }

    this.logger.log('Player results created successfully', {
      sessionId,
      playerCount: playerNames.length,
      playerResultsCount: playerResults?.length || 0,
    });

    // Transform to PlayerGameResult format
    return (playerResults || []).map((result) => ({
      player_game_result_id: result.player_game_result_id,
      game_result_id: result.game_result_id,
      player_name: result.player_name,
      total_score: result.score,
    }));
  }

  /**
   * Add players to a session by their IDs
   */
  async addSessionPlayersByIds(
    sessionId: string,
    playerIds: string[],
  ): Promise<PlayerGameResult[]> {
    this.logger.debug('Adding players to session by IDs', { sessionId, playerIds });

    if (!playerIds || playerIds.length === 0) {
      throw new BadRequestException('At least one player ID must be provided');
    }

    // Step 1: Get profiles by IDs to get usernames
    const profiles = await this.profileService.getProfilesByIds(playerIds);
    const foundIds = profiles.map((p) => p.id);
    const missingIds = playerIds.filter((id) => !foundIds.includes(id));

    if (missingIds.length > 0) {
      throw new NotFoundException(
        `The following player IDs do not exist: ${missingIds.join(', ')}`,
      );
    }

    // Step 2: Extract usernames and call addSessionPlayers
    const playerNames = profiles.map((p) => p.username);
    return this.addSessionPlayers(sessionId, playerNames);
  }

  /**
   * Set the start time for a session
   */
  async setStartTime(sessionId: string): Promise<Session> {
    this.logger.debug('Setting start time', { sessionId });
    const { data, error } = await this.db.supabaseAdmin
      .from('sessions')
      .update({ start_time: getRomaniaTime() })
      .eq('session_id', sessionId)
      .select()
      .single();

    if (error) {
      this.db.handleSupabaseError('setStartTime', error, { sessionId });
    }

    if (!data) {
      throw new NotFoundException('Session not found');
    }

    return data;
  }

  /**
   * Set the end time for a session
   */
  async setEndTime(sessionId: string): Promise<Session> {
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

  /**
   * Get all sessions
   */
  async getSessions(): Promise<Session[]> {
    this.logger.debug('Fetching all sessions');
    const { data, error } = await this.db.supabaseAdmin.from('sessions').select('*');

    if (error) {
      this.db.handleSupabaseError('getSessions', error);
    }

    if (!data) {
      throw new NotFoundException('Sessions not found');
    }

    this.logger.debug('Sessions fetched successfully', { count: data.length });

    return data;
  }

  /**
   * Get a session by ID
   */
  async getSession(sessionId: string): Promise<Session> {
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

  /**
   * Get all players in a session
   */
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

  /**
   * Get the mission slug for a session
   */
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

  /**
   * Get all game results for a session
   */
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
        game_result: unknown;
      }[];
    }
    return data.map((result: PlayerResultWithGameResult) => ({
      player_game_result_id: result.player_game_result_id,
      game_result_id: result.game_result_id,
      player_name: result.player_name,
      total_score: result.score,
    }));
  }
}
