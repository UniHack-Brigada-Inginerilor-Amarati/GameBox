import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PayloadService } from '../payload/payload.service';
import { SupabaseService } from '../supabase/supabase.service';
import { ProfileService } from '../profile/profile.service';
import { Game, Mission, UserProfileDTO, AbilityRank, ABILITY_RANK_MODIFIERS, RANK_THRESHOLDS } from '@gamebox/shared';

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
      .select('player_id, score')
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

    // Determine state: 'completed' if score is not null, otherwise 'playing'
    const newState = integerScore !== null ? 'completed' : 'playing';

    // Update the score and state in missions_players table
    const { data, error } = await this.supabaseService.supabaseAdmin
      .schema('gamebox')
      .from('missions_players')
      .update({ score: integerScore, state: newState })
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

    // Update spy card if score changed and is not null
    if (integerScore !== null && integerScore !== oldScore) {
      await this.updateSpyCardWithMissionScore(profile.username, integerScore, oldScore);
    }

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
          state: (data.state || newState) as 'playing' | 'completed',
          created_at: data.created_at,
          updated_at: data.updated_at,
        };
  }

  /**
   * Update spy card with mission score multiplied by rank modifier
   */
  private async updateSpyCardWithMissionScore(
    username: string,
    newScore: number,
    oldScore: number | null,
  ): Promise<void> {
    try {
      // Get current spy card
      const { data: spyCard, error: spyCardError } = await this.supabaseService.supabaseAdmin
        .from('spy_cards')
        .select('total_score, overall_rank')
        .eq('username', username)
        .single();

      if (spyCardError) {
        this.logger.warn('Spy card not found or error fetching', {
          username,
          error: spyCardError.message,
        });
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

      // Update spy card
      const { error: updateError } = await this.supabaseService.supabaseAdmin
        .from('spy_cards')
        .update({
          total_score: newTotalScore,
          overall_rank: newOverallRank,
        })
        .eq('username', username);

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
        });
      }
    } catch (error) {
      this.logger.error('Exception updating spy card with mission score', {
        username,
        error: error instanceof Error ? error.message : String(error),
      });
      // Don't throw - mission score update succeeded, spy card update is secondary
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
