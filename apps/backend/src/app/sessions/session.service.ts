import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import {
  GameResult,
  MissionSession,
  SessionPlayer,
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

    const { data, error } = await this.db.supabase
      .from('mission_sessions')
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
    const { data, error } = await this.db.supabase
      .from('mission_sessions')
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
    const { data, error } = await this.db.supabase
      .from('mission_sessions')
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

  async addSessionPlayers(sessionId: string, playerNames: string[]): Promise<SessionPlayer[]> {
    const uuids = await this.profileService.getProfilesByUsernames(playerNames);

    const sessionPlayers = uuids.map((uuid) => ({
      sessionId: sessionId,
      playerId: uuid,
    }));

    this.logger.debug('Adding session player', { sessionId, playerNames });
    const { data, error } = await this.db.supabase
      .from('session_players')
      .insert(sessionPlayers)
      .select();

    if (error) {
      this.db.handleSupabaseError('addSessionPlayers', error, { sessionId, playerNames });
    }

    if (!data) {
      throw new NotFoundException('Session players not found');
    }

    return data;
  }

  async addSessionPlayersByIds(sessionId: string, playerIds: string[]): Promise<SessionPlayer[]> {
    const sessionPlayers = playerIds.map((playerId) => ({
      session_id: sessionId,
      player_id: playerId,
    }));

    this.logger.debug('Adding session players by IDs', { sessionId, playerIds });
    const { data, error } = await this.db.supabase
      .from('session_players')
      .insert(sessionPlayers)
      .select();

    if (error) {
      this.db.handleSupabaseError('addSessionPlayersByIds', error, { sessionId, playerIds });
    }

    if (!data) {
      throw new NotFoundException('Session players not found');
    }

    return data;
  }

  async removeSessionPlayers(sessionId: string, playerNames: string[]): Promise<void> {
    const profiles = await this.profileService.getProfilesByUsernames(playerNames);
    const uuids = profiles.map((profile) => profile.id);

    this.logger.debug('Removing session player', { sessionId, playerNames });

    const { error } = await this.db.supabase
      .from('session_players')
      .delete()
      .eq('session_id', sessionId)
      .in('player_id', uuids);

    if (error) {
      this.db.handleSupabaseError('removeSessionPlayer', error, { sessionId, playerNames });
    }
  }

  async getSessions(): Promise<MissionSession[]> {
    this.logger.debug('Fetching all sessions');
    const { data, error } = await this.db.supabase.from('mission_sessions').select('*');

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

    const { data: session, error } = await this.db.supabase
      .from('mission_sessions')
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

    const { data, error } = await this.db.supabase
      .from('session_players')
      .select('player_id')
      .eq('session_id', sessionId);

    if (error) {
      this.db.handleSupabaseError('getSessionPlayers', error, {
        sessionId,
      });
    }

    if (!data) {
      throw new NotFoundException('Session players not found');
    }

    const uuids = data.map((player) => player.player_id);
    const userProfiles = await this.profileService.getProfilesByIds(uuids);

    return userProfiles.map((profile) => this.profileService.mapUserProfileToDTO(profile));
  }

  async getMissionSlug(sessionId: string): Promise<string> {
    this.logger.debug('Fetching mission slug', { sessionId });
    const { data, error } = await this.db.supabase
      .from('mission_sessions')
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

  async createGameResultsForPlayer(
    sessionId: string,
    playerName: string,
    gameSlugs: string[],
  ): Promise<GameResult[]> {
    this.logger.debug('Creating game results', { sessionId, playerName });

    const profile = await this.profileService.getProfileById(playerName);

    const { data, error } = await this.db.supabase
      .from('game_results')
      .insert(
        gameSlugs.map((gameSlug) => ({
          session_id: sessionId,
          player_id: profile.id,
          game_slug: gameSlug,
        })),
      )
      .select();

    if (error) {
      this.db.handleSupabaseError('createGameResults', error, { sessionId, playerName });
    }

    if (!data) {
      throw new NotFoundException('Game results not found');
    }

    return data;
  }

  async getGameResults(sessionId: string): Promise<PlayerGameResult[]> {
    this.logger.debug('Fetching player game results for session', { sessionId });
    const { data, error } = await this.db.supabase
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
    return data.map((result: any) => ({
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

    const profiles = await this.profileService.getProfilesByUsernames(playerNames);
    const uuids = profiles.map((profile) => profile.id);

    const resultsToInsert = uuids.map((uuid) => ({
      session_id: sessionId,
      player_id: uuid,
      game_slug: gameSlug,
      game_result: this.generateRandomGameResult(),
    }));

    const { data, error } = await this.db.supabase
      .from('game_results')
      .insert(resultsToInsert)
      .select();

    if (error) {
      this.db.handleSupabaseError('createGameResults', error, {
        sessionId,
        gameSlug,
        playerNames,
      });
    }

    if (!data) {
      throw new NotFoundException('Game results not created');
    }

    return data;
  }
}
