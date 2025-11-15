import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PayloadService } from '../payload/payload.service';
import { SupabaseService } from '../supabase/supabase.service';
import { ProfileService } from '../profile/profile.service';
import { Game, Mission, UserProfileDTO } from '@gamebox/shared';

export interface MissionPlayer {
  player_id: string;
  username: string;
  email: string;
  avatar_url: string | null;
  score: number | null;
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
      .select('player_id, score, created_at, updated_at')
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
      return {
        player_id: mp.player_id,
        username: profile?.username || 'Unknown',
        email: profile?.email || '',
        avatar_url: profile?.avatar_url || null,
        score: mp.score,
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

    // Update the score in missions_players table
    const { data, error } = await this.supabaseService.supabaseAdmin
      .schema('gamebox')
      .from('missions_players')
      .update({ score: integerScore })
      .eq('mission_slug', slug)
      .eq('player_id', playerId)
      .select('player_id, score, created_at, updated_at')
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

    return {
      player_id: data.player_id,
      username: profile.username,
      email: profile.email,
      avatar_url: profile.avatar_url || null,
      score: data.score,
      created_at: data.created_at,
      updated_at: data.updated_at,
    };
  }

  private processMissionMedia(mission: Mission): Mission {
    if (mission.media?.url && !mission.media.url.startsWith('http')) {
      const payloadUrl = this.getPayloadUrl();
      mission.media.url = `${payloadUrl}${mission.media.url}`;
    }
    return mission;
  }
}
