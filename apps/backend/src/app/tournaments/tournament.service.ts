import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { PayloadService } from '../payload/payload.service';
import { SupabaseService } from '../supabase/supabase.service';
import { Tournament, TournamentRegistration } from '@gamebox/shared';

@Injectable()
export class TournamentService {
  constructor(
    private readonly payloadService: PayloadService,
    private readonly supabaseService: SupabaseService,
  ) {}
  private readonly logger = new Logger(TournamentService.name);

  async getTournaments(userId?: string): Promise<Tournament[]> {
    this.logger.debug('Fetching all tournaments from Payload CMS');
    const response = await this.payloadService.makeRequest<{ docs: Tournament[] }>(
      'tournaments?limit=100&sort=-date&depth=2',
    );

    const tournaments = response.docs || [];
    const enrichedTournaments = await Promise.all(
      tournaments.map((tournament) => this.enrichTournamentWithPlayerCount(tournament, userId)),
    );
    return enrichedTournaments.map((tournament) => this.processTournamentMedia(tournament));
  }

  async getTournament(slug: string, userId?: string): Promise<Tournament> {
    this.logger.debug('Fetching tournament by slug from Payload CMS', { slug });
    const response = await this.payloadService.makeRequest<{ docs: Tournament[] }>(
      `tournaments?where[slug][equals]=${slug}&depth=2`,
    );

    if (!response.docs || response.docs.length === 0) {
      throw new NotFoundException(`Tournament with slug '${slug}' not found`);
    }

    const tournament = await this.enrichTournamentWithPlayerCount(response.docs[0], userId);
    return this.processTournamentMedia(tournament);
  }

  async getTournamentById(id: number, userId?: string): Promise<Tournament> {
    this.logger.debug('Fetching tournament by ID from Payload CMS', { id });
    const response = await this.payloadService.makeRequest<{ docs: Tournament[] }>(
      `tournaments?where[id][equals]=${id}&depth=2`,
    );

    if (!response.docs || response.docs.length === 0) {
      throw new NotFoundException(`Tournament with ID '${id}' not found`);
    }

    const tournament = await this.enrichTournamentWithPlayerCount(response.docs[0], userId);
    return this.processTournamentMedia(tournament);
  }

  async joinTournament(tournamentId: number, userId: string): Promise<TournamentRegistration> {
    this.logger.debug('Joining tournament', { tournamentId, userId });

    // First, verify tournament exists and get max players
    const tournament = await this.getTournamentById(tournamentId);
    
    // Check current player count
    const currentCount = await this.getTournamentPlayerCount(tournamentId);
    
    if (currentCount >= tournament.maxPlayers) {
      throw new BadRequestException('Tournament is full');
    }

    // Check if user is already registered
    const isRegistered = await this.isUserRegistered(tournamentId, userId);
    if (isRegistered) {
      throw new ConflictException('You are already registered for this tournament');
    }

    // Register the user
    const { data, error } = await this.supabaseService.supabaseAdmin
      .schema('gamebox')
      .from('tournament_registrations')
      .insert({
        tournament_id: tournamentId,
        player_id: userId,
        status: 'registered',
      })
      .select()
      .single();

    if (error) {
      this.logger.error('Error joining tournament', error);
      this.supabaseService.handleSupabaseError('joinTournament', error, {
        tournamentId,
        userId,
      });
    }

    if (!data) {
      throw new BadRequestException('Failed to register for tournament');
    }

    this.logger.log(`User ${userId} successfully joined tournament ${tournamentId}`);
    return {
      id: data.id,
      tournamentId: data.tournament_id,
      playerId: data.player_id,
      registeredAt: data.registered_at,
      status: data.status,
    };
  }

  async leaveTournament(tournamentId: number, userId: string): Promise<void> {
    this.logger.debug('Leaving tournament', { tournamentId, userId });

    // Check if user is registered
    const isRegistered = await this.isUserRegistered(tournamentId, userId);
    if (!isRegistered) {
      throw new BadRequestException('You are not registered for this tournament');
    }

    // Delete the registration record
    const { error } = await this.supabaseService.supabaseAdmin
      .schema('gamebox')
      .from('tournament_registrations')
      .delete()
      .eq('tournament_id', tournamentId)
      .eq('player_id', userId)
      .eq('status', 'registered');

    if (error) {
      this.logger.error('Error leaving tournament', error);
      this.supabaseService.handleSupabaseError('leaveTournament', error, {
        tournamentId,
        userId,
      });
    }

    this.logger.log(`User ${userId} successfully left tournament ${tournamentId}`);
  }

  async getTournamentPlayerCount(tournamentId: number): Promise<number> {
    const { count, error } = await this.supabaseService.supabaseAdmin
      .schema('gamebox')
      .from('tournament_registrations')
      .select('*', { count: 'exact', head: true })
      .eq('tournament_id', tournamentId)
      .eq('status', 'registered');

    if (error) {
      this.logger.warn('Error getting tournament player count', error);
      return 0;
    }

    return count || 0;
  }

  async isUserRegistered(tournamentId: number, userId: string): Promise<boolean> {
    const { data, error } = await this.supabaseService.supabaseAdmin
      .schema('gamebox')
      .from('tournament_registrations')
      .select('id')
      .eq('tournament_id', tournamentId)
      .eq('player_id', userId)
      .eq('status', 'registered')
      .maybeSingle();

    if (error) {
      this.logger.warn('Error checking registration status', error);
      return false;
    }

    return !!data;
  }

  private async enrichTournamentWithPlayerCount(
    tournament: Tournament,
    userId?: string,
  ): Promise<Tournament> {
    const currentPlayers = await this.getTournamentPlayerCount(tournament.id);
    tournament.currentPlayers = currentPlayers;

    if (userId) {
      tournament.isRegistered = await this.isUserRegistered(tournament.id, userId);
    }

    return tournament;
  }

  private getPayloadUrl(): string {
    return process.env.PAYLOAD_URL || 'http://localhost:3000';
  }

  private processTournamentMedia(tournament: Tournament): Tournament {
    // Process game media if needed
    if (tournament.game?.picture && !tournament.game.picture.startsWith('http')) {
      const payloadUrl = this.getPayloadUrl();
      tournament.game.picture = `${payloadUrl}${tournament.game.picture}`;
    }

    if (tournament.game?.thumbnail && !tournament.game.thumbnail.startsWith('http')) {
      const payloadUrl = this.getPayloadUrl();
      tournament.game.thumbnail = `${payloadUrl}${tournament.game.thumbnail}`;
    }

    return tournament;
  }
}

