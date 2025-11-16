import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { PayloadService } from '../payload/payload.service';
import { SupabaseService } from '../supabase/supabase.service';
import { ProfileService } from '../profile/profile.service';
import { LeagueScoreService } from '../profile/league-score.service';
import { Game, Mission, UserProfileDTO, AbilityRank, ABILITY_RANK_MODIFIERS, RANK_THRESHOLDS, GameScore, RichTextUtils } from '@gamebox/shared';

export interface MissionPlayer {
  player_id: string;
  username: string;
  email: string;
  avatar_url: string | null;
  score: number | null;
  mental_fortitude_composure_score?: number | null;
  adaptability_decision_making_score?: number | null;
  aim_mechanical_skill_score?: number | null;
  game_sense_awareness_score?: number | null;
  teamwork_communication_score?: number | null;
  strategy_score?: number | null;
  state?: 'playing' | 'completed';
  created_at: string;
  updated_at: string;
}

@Injectable()
export class MissionService {
  constructor(
    private readonly payloadService: PayloadService,
    private readonly supabaseService: SupabaseService,
    private readonly profileService: ProfileService,
    private readonly leagueScoreService: LeagueScoreService,
  ) {}
  private readonly logger = new Logger(MissionService.name);

  async getMissions(userId?: string): Promise<Mission[]> {
    this.logger.debug('Fetching all missions from Payload CMS', { userId });
    const response = await this.payloadService.makeRequest<{ docs: Mission[] }>(
      'missions?limit=100&sort=-createdAt&depth=1',
    );

    const missions = response.docs || [];
    const processedMissions = missions.map((mission) => this.processMissionMedia(mission));
    
    // Enrich missions with player status if userId is provided
    if (userId) {
      return Promise.all(
        processedMissions.map((mission) => this.enrichMissionWithPlayerStatus(mission, userId)),
      );
    }
    
    return processedMissions;
  }

  private async enrichMissionWithPlayerStatus(mission: Mission, userId: string): Promise<Mission> {
    // Check if user has joined this mission in missions_players table
    const { data, error } = await this.supabaseService.supabaseAdmin
      .schema('gamebox')
      .from('missions_players')
      .select('player_id, score, state')
      .eq('mission_slug', mission.slug)
      .eq('player_id', userId)
      .maybeSingle();

    if (error) {
      this.logger.warn('Error checking mission player status', { error, missionSlug: mission.slug, userId });
      return mission;
    }

    // Add player status to mission object
    (mission as any).hasJoined = !!data;
    (mission as any).playerScore = data?.score || null;
    // Determine state: 'completed' if score is not null, otherwise use state from database or default to 'playing'
    const playerState = data?.score !== null ? 'completed' : (data?.state || 'playing');
    (mission as any).playerState = playerState;

    return mission;
  }

  async getMission(slug: string): Promise<Mission> {
    this.logger.debug('Fetching mission by slug from Payload CMS', { slug });
    const response = await this.payloadService.makeRequest<{ docs: Mission[] }>(
      `missions?where[slug][equals]=${slug}&depth=2&populate=games`,
    );

    if (!response.docs || response.docs.length === 0) {
      throw new NotFoundException(`Mission with slug '${slug}' not found`);
    }

    return this.processMissionMedia(response.docs[0]);
  }

  async getMissionGames(slug: string): Promise<Game[]> {
    const mission = await this.getMission(slug);
    const games = [
      mission.games.mentalFortitudeComposure,
      mission.games.adaptabilityDecisionMaking,
      mission.games.aimMechanicalSkill,
      mission.games.gameSenseAwareness,
      mission.games.teamworkCommunication,
      mission.games.strategy,
    ];
    // Filter out undefined/null games since missions can now have 1-6 games
    return games.filter((game): game is Game => game !== null && game !== undefined);
  }

  private getPayloadUrl(): string {
    return process.env.PAYLOAD_URL || 'http://localhost:3000';
  }

  async getMissionPlayers(slug: string): Promise<MissionPlayer[]> {
    this.logger.debug('Fetching players for mission', { slug });

    // Get all players who joined this mission from missions_players table
    const { data: missionPlayers, error } = await this.supabaseService.supabaseAdmin
      .schema('gamebox')
      .from('missions_players')
      .select('player_id, score, mental_fortitude_composure_score, adaptability_decision_making_score, aim_mechanical_skill_score, game_sense_awareness_score, teamwork_communication_score, strategy_score, state, created_at, updated_at')
      .eq('mission_slug', slug)
      .order('created_at', { ascending: false });

    if (error) {
      this.logger.error('Error fetching mission players', error);
      this.supabaseService.handleSupabaseError('getMissionPlayers', error, { slug });
    }

    if (!missionPlayers || missionPlayers.length === 0) {
      return [];
    }

    // Get player profiles for all player IDs
    const playerIds = missionPlayers.map((mp) => mp.player_id);
    const profiles = await this.profileService.getProfilesByIds(playerIds);

    // Combine mission player data with profile data
    const players: MissionPlayer[] = missionPlayers.map((mp) => {
      const profile = profiles.find((p) => p.id === mp.player_id);
      
      // Determine state: 'completed' if score is not null, otherwise 'playing'
      const state = mp.score !== null ? 'completed' : (mp.state || 'playing');
      
      return {
        player_id: mp.player_id,
        username: profile?.username || 'Unknown',
        email: profile?.email || '',
        avatar_url: profile?.avatar_url || null,
        score: mp.score,
        mental_fortitude_composure_score: mp.mental_fortitude_composure_score ?? null,
        adaptability_decision_making_score: mp.adaptability_decision_making_score ?? null,
        aim_mechanical_skill_score: mp.aim_mechanical_skill_score ?? null,
        game_sense_awareness_score: mp.game_sense_awareness_score ?? null,
        teamwork_communication_score: mp.teamwork_communication_score ?? null,
        strategy_score: mp.strategy_score ?? null,
        state: state as 'playing' | 'completed',
        created_at: mp.created_at,
        updated_at: mp.updated_at,
      };
    });

    this.logger.debug('Mission players fetched successfully', {
      slug,
      count: players.length,
    });

    return players;
  }

  async updatePlayerScore(slug: string, playerId: string, score: number | null): Promise<MissionPlayer> {
    this.logger.debug('Updating player score', { slug, playerId, score });

    // Ensure score is an integer if provided
    const integerScore = score !== null ? Math.floor(score) : null;

    // Get the old score before updating (to calculate the difference)
    const { data: oldData } = await this.supabaseService.supabaseAdmin
      .schema('gamebox')
      .from('missions_players')
      .select('score')
      .eq('mission_slug', slug)
      .eq('player_id', playerId)
      .maybeSingle();

    const oldScore = oldData?.score || null;

    // Don't change state - only update score. State can only be set to 'completed' via completeMission endpoint
    // Update only the score in missions_players table (keep existing state)
    const { data, error } = await this.supabaseService.supabaseAdmin
      .schema('gamebox')
      .from('missions_players')
      .update({ score: integerScore })
      .eq('mission_slug', slug)
      .eq('player_id', playerId)
      .select('player_id, score, mental_fortitude_composure_score, adaptability_decision_making_score, aim_mechanical_skill_score, game_sense_awareness_score, teamwork_communication_score, strategy_score, state, created_at, updated_at')
      .single();

    if (error) {
      this.logger.error('Error updating player score', error);
      this.supabaseService.handleSupabaseError('updatePlayerScore', error, { slug, playerId, score });
      throw error;
    }

    // Get player profile to enrich the response
    const profile = await this.profileService.getProfileById(playerId);
    if (!profile) {
      throw new NotFoundException(`Player with ID '${playerId}' not found`);
    }

    // Don't update spy card here - spy cards are only updated when mission is completed via completeMission endpoint

        return {
          player_id: data.player_id,
          username: profile.username,
          email: profile.email,
          avatar_url: profile.avatar_url || null,
          score: data.score,
          mental_fortitude_composure_score: data.mental_fortitude_composure_score ?? null,
          adaptability_decision_making_score: data.adaptability_decision_making_score ?? null,
          aim_mechanical_skill_score: data.aim_mechanical_skill_score ?? null,
          game_sense_awareness_score: data.game_sense_awareness_score ?? null,
          teamwork_communication_score: data.teamwork_communication_score ?? null,
          strategy_score: data.strategy_score ?? null,
          state: (data.state || 'playing') as 'playing' | 'completed',
          created_at: data.created_at,
          updated_at: data.updated_at,
        };
  }

  async completeMission(
    slug: string,
    playerScores: Array<{
      playerId: string;
      score: number | null;
      mental_fortitude_composure_score?: number | null;
      adaptability_decision_making_score?: number | null;
      aim_mechanical_skill_score?: number | null;
      game_sense_awareness_score?: number | null;
      teamwork_communication_score?: number | null;
      strategy_score?: number | null;
    }>,
  ): Promise<MissionPlayer[]> {
    this.logger.debug('Completing mission', { slug, playerCount: playerScores.length });

    const updatedPlayers: MissionPlayer[] = [];

    // Process each player's scores
    for (const playerScore of playerScores) {
      const integerScore = playerScore.score !== null ? Math.floor(playerScore.score) : null;

      // Prepare updates object
      const updates: Record<string, any> = {
        score: integerScore,
        state: 'completed',
      };

      // Add ability scores if provided
      if (playerScore.mental_fortitude_composure_score !== undefined) {
        updates.mental_fortitude_composure_score = playerScore.mental_fortitude_composure_score !== null
          ? Math.floor(playerScore.mental_fortitude_composure_score)
          : null;
      }
      if (playerScore.adaptability_decision_making_score !== undefined) {
        updates.adaptability_decision_making_score = playerScore.adaptability_decision_making_score !== null
          ? Math.floor(playerScore.adaptability_decision_making_score)
          : null;
      }
      if (playerScore.aim_mechanical_skill_score !== undefined) {
        updates.aim_mechanical_skill_score = playerScore.aim_mechanical_skill_score !== null
          ? Math.floor(playerScore.aim_mechanical_skill_score)
          : null;
      }
      if (playerScore.game_sense_awareness_score !== undefined) {
        updates.game_sense_awareness_score = playerScore.game_sense_awareness_score !== null
          ? Math.floor(playerScore.game_sense_awareness_score)
          : null;
      }
      if (playerScore.teamwork_communication_score !== undefined) {
        updates.teamwork_communication_score = playerScore.teamwork_communication_score !== null
          ? Math.floor(playerScore.teamwork_communication_score)
          : null;
      }
      if (playerScore.strategy_score !== undefined) {
        updates.strategy_score = playerScore.strategy_score !== null
          ? Math.floor(playerScore.strategy_score)
          : null;
      }

      // Get old scores before updating
      const { data: oldData } = await this.supabaseService.supabaseAdmin
        .schema('gamebox')
        .from('missions_players')
        .select('score, mental_fortitude_composure_score, adaptability_decision_making_score, aim_mechanical_skill_score, game_sense_awareness_score, teamwork_communication_score, strategy_score')
        .eq('mission_slug', slug)
        .eq('player_id', playerScore.playerId)
        .maybeSingle();

      // Update the player's scores and state
      const { data, error } = await this.supabaseService.supabaseAdmin
        .schema('gamebox')
        .from('missions_players')
        .update(updates)
        .eq('mission_slug', slug)
        .eq('player_id', playerScore.playerId)
        .select('player_id, score, mental_fortitude_composure_score, adaptability_decision_making_score, aim_mechanical_skill_score, game_sense_awareness_score, teamwork_communication_score, strategy_score, state, created_at, updated_at')
        .single();

      if (error) {
        this.logger.error('Error updating player score in completeMission', {
          slug,
          playerId: playerScore.playerId,
          error: error.message,
        });
        continue; // Skip this player but continue with others
      }

      // Get player profile
      const profile = await this.profileService.getProfileById(playerScore.playerId);
      if (!profile) {
        this.logger.warn('Player profile not found', { playerId: playerScore.playerId });
        continue;
      }

      // Update spy card if score changed
      if (integerScore !== null) {
        const oldScore = oldData?.score || null;
        if (integerScore !== oldScore) {
          await this.updateSpyCardWithMissionScore(
            profile.username,
            integerScore,
            oldScore,
            data,
          );
        }
      }

      // Update spy card with ability scores if they changed
      if (
        playerScore.mental_fortitude_composure_score !== undefined ||
        playerScore.adaptability_decision_making_score !== undefined ||
        playerScore.aim_mechanical_skill_score !== undefined ||
        playerScore.game_sense_awareness_score !== undefined ||
        playerScore.teamwork_communication_score !== undefined ||
        playerScore.strategy_score !== undefined
      ) {
        const abilityScoreUpdates: Record<string, number | null> = {};
        if (playerScore.mental_fortitude_composure_score !== undefined) {
          abilityScoreUpdates.mental_fortitude_composure_score = updates.mental_fortitude_composure_score;
        }
        if (playerScore.adaptability_decision_making_score !== undefined) {
          abilityScoreUpdates.adaptability_decision_making_score = updates.adaptability_decision_making_score;
        }
        if (playerScore.aim_mechanical_skill_score !== undefined) {
          abilityScoreUpdates.aim_mechanical_skill_score = updates.aim_mechanical_skill_score;
        }
        if (playerScore.game_sense_awareness_score !== undefined) {
          abilityScoreUpdates.game_sense_awareness_score = updates.game_sense_awareness_score;
        }
        if (playerScore.teamwork_communication_score !== undefined) {
          abilityScoreUpdates.teamwork_communication_score = updates.teamwork_communication_score;
        }
        if (playerScore.strategy_score !== undefined) {
          abilityScoreUpdates.strategy_score = updates.strategy_score;
        }

        await this.updateSpyCardWithAbilityScores(
          profile.username,
          abilityScoreUpdates,
          oldData || {},
        );
      }

      updatedPlayers.push({
        player_id: data.player_id,
        username: profile.username,
        email: profile.email,
        avatar_url: profile.avatar_url || null,
        score: data.score,
        mental_fortitude_composure_score: data.mental_fortitude_composure_score ?? null,
        adaptability_decision_making_score: data.adaptability_decision_making_score ?? null,
        aim_mechanical_skill_score: data.aim_mechanical_skill_score ?? null,
        game_sense_awareness_score: data.game_sense_awareness_score ?? null,
        teamwork_communication_score: data.teamwork_communication_score ?? null,
        strategy_score: data.strategy_score ?? null,
        state: 'completed' as 'playing' | 'completed',
        created_at: data.created_at,
        updated_at: data.updated_at,
      });
    }

    this.logger.debug('Mission completed', {
      slug,
      updatedPlayersCount: updatedPlayers.length,
    });

    return updatedPlayers;
  }

  async updatePlayerAbilityScores(
    slug: string,
    playerId: string,
    abilityScores: {
      mental_fortitude_composure_score?: number | null;
      adaptability_decision_making_score?: number | null;
      aim_mechanical_skill_score?: number | null;
      game_sense_awareness_score?: number | null;
      teamwork_communication_score?: number | null;
      strategy_score?: number | null;
    },
  ): Promise<MissionPlayer> {
    this.logger.debug('Updating player ability scores', { slug, playerId, abilityScores });

    // Convert all scores to integers if provided
    const updates: Record<string, number | null> = {};
    if (abilityScores.mental_fortitude_composure_score !== undefined) {
      updates.mental_fortitude_composure_score = abilityScores.mental_fortitude_composure_score !== null 
        ? Math.floor(abilityScores.mental_fortitude_composure_score) 
        : null;
    }
    if (abilityScores.adaptability_decision_making_score !== undefined) {
      updates.adaptability_decision_making_score = abilityScores.adaptability_decision_making_score !== null 
        ? Math.floor(abilityScores.adaptability_decision_making_score) 
        : null;
    }
    if (abilityScores.aim_mechanical_skill_score !== undefined) {
      updates.aim_mechanical_skill_score = abilityScores.aim_mechanical_skill_score !== null 
        ? Math.floor(abilityScores.aim_mechanical_skill_score) 
        : null;
    }
    if (abilityScores.game_sense_awareness_score !== undefined) {
      updates.game_sense_awareness_score = abilityScores.game_sense_awareness_score !== null 
        ? Math.floor(abilityScores.game_sense_awareness_score) 
        : null;
    }
    if (abilityScores.teamwork_communication_score !== undefined) {
      updates.teamwork_communication_score = abilityScores.teamwork_communication_score !== null 
        ? Math.floor(abilityScores.teamwork_communication_score) 
        : null;
    }
    if (abilityScores.strategy_score !== undefined) {
      updates.strategy_score = abilityScores.strategy_score !== null 
        ? Math.floor(abilityScores.strategy_score) 
        : null;
    }

    // Get old ability scores before updating
    const { data: oldData } = await this.supabaseService.supabaseAdmin
      .schema('gamebox')
      .from('missions_players')
      .select('mental_fortitude_composure_score, adaptability_decision_making_score, aim_mechanical_skill_score, game_sense_awareness_score, teamwork_communication_score, strategy_score')
      .eq('mission_slug', slug)
      .eq('player_id', playerId)
      .maybeSingle();

    // Update the ability scores in missions_players table
    const { data, error } = await this.supabaseService.supabaseAdmin
      .schema('gamebox')
      .from('missions_players')
      .update(updates)
      .eq('mission_slug', slug)
      .eq('player_id', playerId)
      .select('player_id, score, mental_fortitude_composure_score, adaptability_decision_making_score, aim_mechanical_skill_score, game_sense_awareness_score, teamwork_communication_score, strategy_score, state, created_at, updated_at')
      .single();

    if (error) {
      this.logger.error('Error updating player ability scores', error);
      this.supabaseService.handleSupabaseError('updatePlayerAbilityScores', error, { slug, playerId, abilityScores });
      throw error;
    }

    // Get player profile to enrich the response
    const profile = await this.profileService.getProfileById(playerId);
    if (!profile) {
      throw new NotFoundException(`Player with ID '${playerId}' not found`);
    }

    // Don't update spy card here - spy cards are only updated when mission is completed via completeMission endpoint

    return {
      player_id: data.player_id,
      username: profile.username,
      email: profile.email,
      avatar_url: profile.avatar_url || null,
      score: data.score,
      mental_fortitude_composure_score: data.mental_fortitude_composure_score ?? null,
      adaptability_decision_making_score: data.adaptability_decision_making_score ?? null,
      aim_mechanical_skill_score: data.aim_mechanical_skill_score ?? null,
      game_sense_awareness_score: data.game_sense_awareness_score ?? null,
      teamwork_communication_score: data.teamwork_communication_score ?? null,
      strategy_score: data.strategy_score ?? null,
      state: (data.state || 'playing') as 'playing' | 'completed',
      created_at: data.created_at,
      updated_at: data.updated_at,
    };
  }

  /**
   * Calculate League of Legends score using Gemini AI and update player's ability scores
   * @param slug - Mission slug
   * @param playerId - Player ID
   * @param region - Region for Riot API (default: 'europe')
   * @returns Updated MissionPlayer with new ability scores
   */
  async calculateAndUpdateLeagueScore(
    slug: string,
    playerId: string,
    region: string = 'europe',
  ): Promise<MissionPlayer> {
    this.logger.debug('Calculating and updating League score for player', {
      slug,
      playerId,
      region,
    });

    // Verify the player is in this mission
    const { data: missionPlayer } = await this.supabaseService.supabaseAdmin
      .schema('gamebox')
      .from('missions_players')
      .select('player_id')
      .eq('mission_slug', slug)
      .eq('player_id', playerId)
      .maybeSingle();

    if (!missionPlayer) {
      throw new NotFoundException(
        `Player with ID '${playerId}' is not part of mission '${slug}'`,
      );
    }

    // Get mission details including description
    const mission = await this.getMission(slug);
    const missionDescription = this.extractMissionDescription(mission);

    this.logger.debug('Mission description extracted', {
      slug,
      description: missionDescription,
    });

    // Calculate League score using Gemini AI with mission context
    const gameScore: GameScore = await this.leagueScoreService.calculateScoreFromLastMatch(
      playerId,
      region,
      missionDescription,
    );

    // Map GameScore (camelCase) to mission player ability scores (snake_case)
    const abilityScores = {
      mental_fortitude_composure_score: gameScore.mentalFortitudeComposure ?? null,
      adaptability_decision_making_score: gameScore.adaptabilityDecisionMaking ?? null,
      aim_mechanical_skill_score: gameScore.aimMechanicalSkill ?? null,
      game_sense_awareness_score: gameScore.gameSenseAwareness ?? null,
      teamwork_communication_score: gameScore.teamworkCommunication ?? null,
      strategy_score: gameScore.strategy ?? null,
    };

    this.logger.debug('Calculated League scores', { playerId, gameScore, abilityScores });

    // Update player ability scores
    return this.updatePlayerAbilityScores(slug, playerId, abilityScores);
  }

  /**
   * Extract mission description from mission object
   * Handles both plain string and rich text description formats
   */
  private extractMissionDescription(mission: Mission): string {
    if (!mission.description) {
      return '';
    }

    // Use RichTextUtils to extract text from description (handles both string and rich text)
    return RichTextUtils.getDescriptionText(mission.description);
  }

  /**
   * Update spy card with ability scores from missions_players
   */
  private async updateSpyCardWithAbilityScores(
    username: string,
    newAbilityScores: Record<string, number | null>,
    oldAbilityScores: Record<string, number | null>,
  ): Promise<void> {
    try {
      this.logger.debug('Updating spy card with ability scores', { username, newAbilityScores });

      // Get current spy card
      let { data: spyCard, error: spyCardError } = await this.supabaseService.supabaseAdmin
        .schema('gamebox')
        .from('spy_cards')
        .select('total_score, overall_rank, mental_fortitude_composure_score, adaptability_decision_making_score, aim_mechanical_skill_score, game_sense_awareness_score, teamwork_communication_score, strategy_score')
        .eq('username', username)
        .maybeSingle();

      if (spyCardError || !spyCard) {
        const result = await this.supabaseService.supabaseAdmin
          .from('spy_cards')
          .select('total_score, overall_rank, mental_fortitude_composure_score, adaptability_decision_making_score, aim_mechanical_skill_score, game_sense_awareness_score, teamwork_communication_score, strategy_score')
          .eq('username', username)
          .maybeSingle();
        spyCard = result.data;
        spyCardError = result.error;
      }

      if (spyCardError || !spyCard) {
        this.logger.warn('Spy card not found for user', { username });
        return;
      }

      // Determine current overall rank
      let currentRank: AbilityRank;
      if (spyCard.overall_rank && spyCard.overall_rank >= 1 && spyCard.overall_rank <= 5) {
        currentRank = spyCard.overall_rank as AbilityRank;
      } else {
        const totalScore = Number(spyCard.total_score) || 0;
        if (totalScore >= RANK_THRESHOLDS[AbilityRank.S]) {
          currentRank = AbilityRank.S;
        } else if (totalScore >= RANK_THRESHOLDS[AbilityRank.A]) {
          currentRank = AbilityRank.A;
        } else if (totalScore >= RANK_THRESHOLDS[AbilityRank.B]) {
          currentRank = AbilityRank.B;
        } else if (totalScore >= RANK_THRESHOLDS[AbilityRank.C]) {
          currentRank = AbilityRank.C;
        } else {
          currentRank = AbilityRank.D;
        }
      }

      const rankModifier = ABILITY_RANK_MODIFIERS[currentRank];

      // Calculate differences and update spy card ability scores
      const abilityScoreUpdates: Record<string, number> = {};
      const currentAbilityScores = {
        mental_fortitude_composure_score: Number(spyCard.mental_fortitude_composure_score) || 0,
        adaptability_decision_making_score: Number(spyCard.adaptability_decision_making_score) || 0,
        aim_mechanical_skill_score: Number(spyCard.aim_mechanical_skill_score) || 0,
        game_sense_awareness_score: Number(spyCard.game_sense_awareness_score) || 0,
        teamwork_communication_score: Number(spyCard.teamwork_communication_score) || 0,
        strategy_score: Number(spyCard.strategy_score) || 0,
      };

      // For each updated ability score, calculate the difference and apply rank modifier
      if (newAbilityScores.mental_fortitude_composure_score !== undefined) {
        const oldValue = oldAbilityScores.mental_fortitude_composure_score ?? 0;
        const newValue = newAbilityScores.mental_fortitude_composure_score ?? 0;
        const diff = newValue - oldValue;
        const modifiedDiff = Math.round(diff * rankModifier);
        abilityScoreUpdates.mental_fortitude_composure_score = currentAbilityScores.mental_fortitude_composure_score + modifiedDiff;
      }
      if (newAbilityScores.adaptability_decision_making_score !== undefined) {
        const oldValue = oldAbilityScores.adaptability_decision_making_score ?? 0;
        const newValue = newAbilityScores.adaptability_decision_making_score ?? 0;
        const diff = newValue - oldValue;
        const modifiedDiff = Math.round(diff * rankModifier);
        abilityScoreUpdates.adaptability_decision_making_score = currentAbilityScores.adaptability_decision_making_score + modifiedDiff;
      }
      if (newAbilityScores.aim_mechanical_skill_score !== undefined) {
        const oldValue = oldAbilityScores.aim_mechanical_skill_score ?? 0;
        const newValue = newAbilityScores.aim_mechanical_skill_score ?? 0;
        const diff = newValue - oldValue;
        const modifiedDiff = Math.round(diff * rankModifier);
        abilityScoreUpdates.aim_mechanical_skill_score = currentAbilityScores.aim_mechanical_skill_score + modifiedDiff;
      }
      if (newAbilityScores.game_sense_awareness_score !== undefined) {
        const oldValue = oldAbilityScores.game_sense_awareness_score ?? 0;
        const newValue = newAbilityScores.game_sense_awareness_score ?? 0;
        const diff = newValue - oldValue;
        const modifiedDiff = Math.round(diff * rankModifier);
        abilityScoreUpdates.game_sense_awareness_score = currentAbilityScores.game_sense_awareness_score + modifiedDiff;
      }
      if (newAbilityScores.teamwork_communication_score !== undefined) {
        const oldValue = oldAbilityScores.teamwork_communication_score ?? 0;
        const newValue = newAbilityScores.teamwork_communication_score ?? 0;
        const diff = newValue - oldValue;
        const modifiedDiff = Math.round(diff * rankModifier);
        abilityScoreUpdates.teamwork_communication_score = currentAbilityScores.teamwork_communication_score + modifiedDiff;
      }
      if (newAbilityScores.strategy_score !== undefined) {
        const oldValue = oldAbilityScores.strategy_score ?? 0;
        const newValue = newAbilityScores.strategy_score ?? 0;
        const diff = newValue - oldValue;
        const modifiedDiff = Math.round(diff * rankModifier);
        abilityScoreUpdates.strategy_score = currentAbilityScores.strategy_score + modifiedDiff;
      }

      // Recalculate total score from all ability scores
      // Sum up all updated ability scores, keeping existing ones that weren't updated
      let newTotalScore = Number(spyCard.total_score) || 0;
      for (const [key, newValue] of Object.entries(abilityScoreUpdates)) {
        const oldValue = currentAbilityScores[key as keyof typeof currentAbilityScores] || 0;
        newTotalScore = newTotalScore - oldValue + newValue;
      }

      // Recalculate overall rank
      let newOverallRank: AbilityRank;
      if (newTotalScore >= RANK_THRESHOLDS[AbilityRank.S]) {
        newOverallRank = AbilityRank.S;
      } else if (newTotalScore >= RANK_THRESHOLDS[AbilityRank.A]) {
        newOverallRank = AbilityRank.A;
      } else if (newTotalScore >= RANK_THRESHOLDS[AbilityRank.B]) {
        newOverallRank = AbilityRank.B;
      } else if (newTotalScore >= RANK_THRESHOLDS[AbilityRank.C]) {
        newOverallRank = AbilityRank.C;
      } else {
        newOverallRank = AbilityRank.D;
      }

      // Update spy card
      const updateData: Record<string, any> = {
        total_score: newTotalScore,
        overall_rank: newOverallRank,
        ...abilityScoreUpdates,
      };

      let { error: updateError } = await this.supabaseService.supabaseAdmin
        .schema('gamebox')
        .from('spy_cards')
        .update(updateData)
        .eq('username', username);

      if (updateError) {
        const result = await this.supabaseService.supabaseAdmin
          .from('spy_cards')
          .update(updateData)
          .eq('username', username);
        updateError = result.error;
      }

      if (updateError) {
        this.logger.error('Error updating spy card with ability scores', {
          username,
          error: updateError.message,
        });
      } else {
        this.logger.debug('Spy card updated with ability scores', {
          username,
          abilityScoreUpdates,
          newTotalScore,
          newOverallRank,
        });
      }
    } catch (error) {
      this.logger.error('Exception updating spy card with ability scores', {
        username,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * Update spy card with mission score multiplied by rank modifier
   * Also updates individual ability scores from mission player data
   */
  private async updateSpyCardWithMissionScore(
    username: string,
    newScore: number,
    oldScore: number | null,
    missionPlayerData?: {
      mental_fortitude_composure_score?: number | null;
      adaptability_decision_making_score?: number | null;
      aim_mechanical_skill_score?: number | null;
      game_sense_awareness_score?: number | null;
      teamwork_communication_score?: number | null;
      strategy_score?: number | null;
    },
  ): Promise<void> {
    try {
      this.logger.debug('Fetching spy card for update', { username });
      
      // Get current spy card - try gamebox schema first, then default schema
      let { data: spyCard, error: spyCardError } = await this.supabaseService.supabaseAdmin
        .schema('gamebox')
        .from('spy_cards')
        .select('total_score, overall_rank, mental_fortitude_composure_score, adaptability_decision_making_score, aim_mechanical_skill_score, game_sense_awareness_score, teamwork_communication_score, strategy_score')
        .eq('username', username)
        .maybeSingle();
      
      // If not found in gamebox schema, try default schema
      if (spyCardError || !spyCard) {
        this.logger.debug('Spy card not found in gamebox schema, trying default schema', { username });
        const result = await this.supabaseService.supabaseAdmin
          .from('spy_cards')
          .select('total_score, overall_rank, mental_fortitude_composure_score, adaptability_decision_making_score, aim_mechanical_skill_score, game_sense_awareness_score, teamwork_communication_score, strategy_score')
          .eq('username', username)
          .maybeSingle();
        spyCard = result.data;
        spyCardError = result.error;
      }

      if (spyCardError) {
        this.logger.error('Error fetching spy card', {
          username,
          error: spyCardError.message,
          code: spyCardError.code,
          details: spyCardError.details,
          hint: spyCardError.hint,
        });
        return; // Don't fail the mission score update if spy card doesn't exist
      }

      if (!spyCard) {
        this.logger.warn('Spy card not found for user', { username });
        return; // Don't fail the mission score update if spy card doesn't exist
      }

      // Calculate the difference in mission score
      const scoreDifference = newScore - (oldScore || 0);

      // Determine current overall rank (use stored rank or calculate from total_score)
      let currentRank: AbilityRank;
      if (spyCard.overall_rank && spyCard.overall_rank >= 1 && spyCard.overall_rank <= 5) {
        currentRank = spyCard.overall_rank as AbilityRank;
      } else {
        // Calculate rank from total_score using RANK_THRESHOLDS
        const totalScore = Number(spyCard.total_score) || 0;
        if (totalScore >= RANK_THRESHOLDS[AbilityRank.S]) {
          currentRank = AbilityRank.S;
        } else if (totalScore >= RANK_THRESHOLDS[AbilityRank.A]) {
          currentRank = AbilityRank.A;
        } else if (totalScore >= RANK_THRESHOLDS[AbilityRank.B]) {
          currentRank = AbilityRank.B;
        } else if (totalScore >= RANK_THRESHOLDS[AbilityRank.C]) {
          currentRank = AbilityRank.C;
        } else {
          currentRank = AbilityRank.D;
        }
      }

      // Apply rank modifier to the score difference
      const rankModifier = ABILITY_RANK_MODIFIERS[currentRank];
      const modifiedScoreDifference = Math.round(scoreDifference * rankModifier);

      // Update spy card total_score
      const currentTotalScore = Number(spyCard.total_score) || 0;
      const newTotalScore = currentTotalScore + modifiedScoreDifference;

      // Recalculate overall rank based on new total_score
      let newOverallRank: AbilityRank;
      if (newTotalScore >= RANK_THRESHOLDS[AbilityRank.S]) {
        newOverallRank = AbilityRank.S;
      } else if (newTotalScore >= RANK_THRESHOLDS[AbilityRank.A]) {
        newOverallRank = AbilityRank.A;
      } else if (newTotalScore >= RANK_THRESHOLDS[AbilityRank.B]) {
        newOverallRank = AbilityRank.B;
      } else if (newTotalScore >= RANK_THRESHOLDS[AbilityRank.C]) {
        newOverallRank = AbilityRank.C;
      } else {
        newOverallRank = AbilityRank.D;
      }

      // Recalculate all ability scores from all missions (not just this one)
      // This ensures ability scores are always in sync with missions_players table
      const profile = await this.profileService.getProfileByUsername(username);
      if (profile) {
        const { data: allMissionScores } = await this.supabaseService.supabaseAdmin
          .schema('gamebox')
          .from('missions_players')
          .select('mental_fortitude_composure_score, adaptability_decision_making_score, aim_mechanical_skill_score, game_sense_awareness_score, teamwork_communication_score, strategy_score')
          .eq('player_id', profile.id)
          .not('score', 'is', null);

        // Sum up all ability scores from all missions
        let mentalFortitudeComposureTotal = 0;
        let adaptabilityDecisionMakingTotal = 0;
        let aimMechanicalSkillTotal = 0;
        let gameSenseAwarenessTotal = 0;
        let teamworkCommunicationTotal = 0;
        let strategyTotal = 0;

        if (allMissionScores) {
          for (const missionScore of allMissionScores) {
            if (missionScore.mental_fortitude_composure_score !== null && missionScore.mental_fortitude_composure_score !== undefined) {
              mentalFortitudeComposureTotal += Math.round(Number(missionScore.mental_fortitude_composure_score) * rankModifier);
            }
            if (missionScore.adaptability_decision_making_score !== null && missionScore.adaptability_decision_making_score !== undefined) {
              adaptabilityDecisionMakingTotal += Math.round(Number(missionScore.adaptability_decision_making_score) * rankModifier);
            }
            if (missionScore.aim_mechanical_skill_score !== null && missionScore.aim_mechanical_skill_score !== undefined) {
              aimMechanicalSkillTotal += Math.round(Number(missionScore.aim_mechanical_skill_score) * rankModifier);
            }
            if (missionScore.game_sense_awareness_score !== null && missionScore.game_sense_awareness_score !== undefined) {
              gameSenseAwarenessTotal += Math.round(Number(missionScore.game_sense_awareness_score) * rankModifier);
            }
            if (missionScore.teamwork_communication_score !== null && missionScore.teamwork_communication_score !== undefined) {
              teamworkCommunicationTotal += Math.round(Number(missionScore.teamwork_communication_score) * rankModifier);
            }
            if (missionScore.strategy_score !== null && missionScore.strategy_score !== undefined) {
              strategyTotal += Math.round(Number(missionScore.strategy_score) * rankModifier);
            }
          }
        }

        // Update ability scores in spy card
        const abilityScoreUpdates: Record<string, number> = {
          mental_fortitude_composure_score: mentalFortitudeComposureTotal || Number(spyCard.mental_fortitude_composure_score) || 0,
          adaptability_decision_making_score: adaptabilityDecisionMakingTotal || Number(spyCard.adaptability_decision_making_score) || 0,
          aim_mechanical_skill_score: aimMechanicalSkillTotal || Number(spyCard.aim_mechanical_skill_score) || 0,
          game_sense_awareness_score: gameSenseAwarenessTotal || Number(spyCard.game_sense_awareness_score) || 0,
          teamwork_communication_score: teamworkCommunicationTotal || Number(spyCard.teamwork_communication_score) || 0,
          strategy_score: strategyTotal || Number(spyCard.strategy_score) || 0,
        };

        // Update spy card - try gamebox schema first, then default schema
        const updateData: Record<string, any> = {
          total_score: newTotalScore,
          overall_rank: newOverallRank,
          ...abilityScoreUpdates,
        };

        let { error: updateError } = await this.supabaseService.supabaseAdmin
          .schema('gamebox')
          .from('spy_cards')
          .update(updateData)
          .eq('username', username);

        // If update failed, try default schema
        if (updateError) {
          this.logger.debug('Update failed in gamebox schema, trying default schema', {
            username,
            error: updateError.message,
          });
          const result = await this.supabaseService.supabaseAdmin
            .from('spy_cards')
            .update(updateData)
            .eq('username', username);
          updateError = result.error;
        }

        if (updateError) {
          this.logger.error('Error updating spy card with mission score', {
            username,
            error: updateError.message,
          });
          // Don't throw - mission score update succeeded, spy card update is secondary
        } else {
          this.logger.debug('Spy card updated with mission score', {
            username,
            missionScore: newScore,
            oldMissionScore: oldScore,
            rankModifier,
            modifiedScoreDifference,
            oldTotalScore: currentTotalScore,
            newTotalScore,
            oldRank: currentRank,
            newRank: newOverallRank,
            abilityScoreUpdates,
          });
        }
      } else {
        // Fallback: update only total_score and overall_rank if profile not found
        const updateData: Record<string, any> = {
          total_score: newTotalScore,
          overall_rank: newOverallRank,
        };

        let { error: updateError } = await this.supabaseService.supabaseAdmin
          .schema('gamebox')
          .from('spy_cards')
          .update(updateData)
          .eq('username', username);

        if (updateError) {
          const result = await this.supabaseService.supabaseAdmin
            .from('spy_cards')
            .update(updateData)
            .eq('username', username);
          updateError = result.error;
        }

        if (updateError) {
          this.logger.error('Error updating spy card with mission score', {
            username,
            error: updateError.message,
          });
          // Don't throw - mission score update succeeded, spy card update is secondary
        } else {
          this.logger.debug('Spy card updated with mission score (fallback)', {
            username,
            newTotalScore,
            newOverallRank,
          });
        }
      }
    } catch (error) {
      this.logger.error('Exception updating spy card with mission score', {
        username,
        error: error instanceof Error ? error.message : String(error),
      });
      // Don't throw - mission score update succeeded, spy card update is secondary
    }
  }

  /**
   * Recalculate spy card for a user based on all their mission scores
   * This method sums up all mission scores (with rank modifiers) and updates the spy card
   */
  async recalculateSpyCardFromMissions(username: string): Promise<{
    success: boolean;
    totalScore: number;
    overallRank: AbilityRank;
    missionCount: number;
    message: string;
  }> {
    this.logger.debug('Recalculating spy card from missions', { username });

    try {
      // Get user profile to get player ID
      const profile = await this.profileService.getProfileByUsername(username);
      if (!profile) {
        throw new NotFoundException(`User with username '${username}' not found`);
      }

      // Get all mission scores for this user (including ability scores)
      const { data: missionScores, error } = await this.supabaseService.supabaseAdmin
        .schema('gamebox')
        .from('missions_players')
        .select('score, mission_slug, mental_fortitude_composure_score, adaptability_decision_making_score, aim_mechanical_skill_score, game_sense_awareness_score, teamwork_communication_score, strategy_score')
        .eq('player_id', profile.id)
        .not('score', 'is', null);

      if (error) {
        this.logger.error('Error fetching mission scores', { username, error: error.message });
        throw error;
      }

      if (!missionScores || missionScores.length === 0) {
        this.logger.warn('No mission scores found for user', { username });
        return {
          success: false,
          totalScore: 0,
          overallRank: AbilityRank.D,
          missionCount: 0,
          message: 'No mission scores found for this user',
        };
      }

      // Get current spy card to determine rank for each mission score
      let { data: spyCard, error: spyCardError } = await this.supabaseService.supabaseAdmin
        .schema('gamebox')
        .from('spy_cards')
        .select('total_score, overall_rank, mental_fortitude_composure_score, adaptability_decision_making_score, aim_mechanical_skill_score, game_sense_awareness_score, teamwork_communication_score, strategy_score')
        .eq('username', username)
        .maybeSingle();

      if (spyCardError || !spyCard) {
        // Try default schema
        const result = await this.supabaseService.supabaseAdmin
          .from('spy_cards')
          .select('total_score, overall_rank, mental_fortitude_composure_score, adaptability_decision_making_score, aim_mechanical_skill_score, game_sense_awareness_score, teamwork_communication_score, strategy_score')
          .eq('username', username)
          .maybeSingle();
        spyCard = result.data;
        spyCardError = result.error;
      }

      if (spyCardError || !spyCard) {
        this.logger.warn('Spy card not found, creating new one', { username });
        // Initialize with default values
        spyCard = {
          total_score: 0,
          overall_rank: AbilityRank.D,
          mental_fortitude_composure_score: 0,
          adaptability_decision_making_score: 0,
          aim_mechanical_skill_score: 0,
          game_sense_awareness_score: 0,
          teamwork_communication_score: 0,
          strategy_score: 0,
        };
      }

      // Calculate total score and individual ability scores from all missions
      // For recalculation, we'll use the current rank for all missions
      // (in practice, we'd need to track rank at time of each mission, but this is a simplification)
      const currentRank = spyCard.overall_rank && spyCard.overall_rank >= 1 && spyCard.overall_rank <= 5
        ? (spyCard.overall_rank as AbilityRank)
        : AbilityRank.D;

      const rankModifier = ABILITY_RANK_MODIFIERS[currentRank];
      let totalMissionScore = 0;
      
      // Initialize ability score totals
      let mentalFortitudeComposureTotal = 0;
      let adaptabilityDecisionMakingTotal = 0;
      let aimMechanicalSkillTotal = 0;
      let gameSenseAwarenessTotal = 0;
      let teamworkCommunicationTotal = 0;
      let strategyTotal = 0;

      for (const missionScore of missionScores) {
        const score = Number(missionScore.score) || 0;
        const modifiedScore = Math.round(score * rankModifier);
        totalMissionScore += modifiedScore;

        // Sum up individual ability scores (if they exist in missions_players)
        if (missionScore.mental_fortitude_composure_score !== null && missionScore.mental_fortitude_composure_score !== undefined) {
          mentalFortitudeComposureTotal += Math.round(Number(missionScore.mental_fortitude_composure_score) * rankModifier);
        }
        if (missionScore.adaptability_decision_making_score !== null && missionScore.adaptability_decision_making_score !== undefined) {
          adaptabilityDecisionMakingTotal += Math.round(Number(missionScore.adaptability_decision_making_score) * rankModifier);
        }
        if (missionScore.aim_mechanical_skill_score !== null && missionScore.aim_mechanical_skill_score !== undefined) {
          aimMechanicalSkillTotal += Math.round(Number(missionScore.aim_mechanical_skill_score) * rankModifier);
        }
        if (missionScore.game_sense_awareness_score !== null && missionScore.game_sense_awareness_score !== undefined) {
          gameSenseAwarenessTotal += Math.round(Number(missionScore.game_sense_awareness_score) * rankModifier);
        }
        if (missionScore.teamwork_communication_score !== null && missionScore.teamwork_communication_score !== undefined) {
          teamworkCommunicationTotal += Math.round(Number(missionScore.teamwork_communication_score) * rankModifier);
        }
        if (missionScore.strategy_score !== null && missionScore.strategy_score !== undefined) {
          strategyTotal += Math.round(Number(missionScore.strategy_score) * rankModifier);
        }
      }

      // Update spy card with new total
      const newTotalScore = totalMissionScore;
      let newOverallRank: AbilityRank;
      if (newTotalScore >= RANK_THRESHOLDS[AbilityRank.S]) {
        newOverallRank = AbilityRank.S;
      } else if (newTotalScore >= RANK_THRESHOLDS[AbilityRank.A]) {
        newOverallRank = AbilityRank.A;
      } else if (newTotalScore >= RANK_THRESHOLDS[AbilityRank.B]) {
        newOverallRank = AbilityRank.B;
      } else if (newTotalScore >= RANK_THRESHOLDS[AbilityRank.C]) {
        newOverallRank = AbilityRank.C;
      } else {
        newOverallRank = AbilityRank.D;
      }

      // Update spy card with total score and individual ability scores
      const updateData: Record<string, any> = {
        total_score: newTotalScore,
        overall_rank: newOverallRank,
        mental_fortitude_composure_score: mentalFortitudeComposureTotal || spyCard.mental_fortitude_composure_score || 0,
        adaptability_decision_making_score: adaptabilityDecisionMakingTotal || spyCard.adaptability_decision_making_score || 0,
        aim_mechanical_skill_score: aimMechanicalSkillTotal || spyCard.aim_mechanical_skill_score || 0,
        game_sense_awareness_score: gameSenseAwarenessTotal || spyCard.game_sense_awareness_score || 0,
        teamwork_communication_score: teamworkCommunicationTotal || spyCard.teamwork_communication_score || 0,
        strategy_score: strategyTotal || spyCard.strategy_score || 0,
      };

      let { error: updateError } = await this.supabaseService.supabaseAdmin
        .schema('gamebox')
        .from('spy_cards')
        .update(updateData)
        .eq('username', username);

      if (updateError) {
        const result = await this.supabaseService.supabaseAdmin
          .from('spy_cards')
          .update(updateData)
          .eq('username', username);
        updateError = result.error;
      }

      if (updateError) {
        this.logger.error('Error updating spy card', { username, error: updateError.message });
        throw updateError;
      }

      this.logger.debug('Spy card recalculated successfully', {
        username,
        totalScore: newTotalScore,
        overallRank: newOverallRank,
        missionCount: missionScores.length,
      });

      return {
        success: true,
        totalScore: newTotalScore,
        overallRank: newOverallRank,
        missionCount: missionScores.length,
        message: `Spy card recalculated from ${missionScores.length} mission(s)`,
      };
    } catch (error) {
      this.logger.error('Exception recalculating spy card', {
        username,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  private processMissionMedia(mission: Mission): Mission {
    if (mission.media?.url && !mission.media.url.startsWith('http')) {
      const payloadUrl = this.getPayloadUrl();
      mission.media.url = `${payloadUrl}${mission.media.url}`;
    }
    return mission;
  }
}
