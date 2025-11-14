import { Injectable, Logger } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';

@Injectable()
export class AdminService {
  private readonly logger = new Logger(AdminService.name);

  constructor(private readonly supabaseService: SupabaseService) {}
  private supabase = this.supabaseService.supabaseAdmin;

  async updateReservationStatus(id: string, status: string) {
    this.logger.debug(`Updating reservation ${id} to status ${status}`);

    try {
      const { data, error } = await this.supabase
        .schema('gamebox')
        .from('reservations')
        .update({
          status,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select();

      if (error) {
        this.logger.error(`Error updating reservation status:`, error);
        throw new Error(`Failed to update reservation status: ${error.message}`);
      }

      this.logger.debug(`Successfully updated reservation ${id} to status ${status}`, { data });
      return data;
    } catch (error) {
      this.logger.error(`Exception updating reservation status:`, error);
      throw error;
    }
  }

  async updateReservation(id: string, updateData: any) {
    this.logger.debug(`Updating reservation ${id} with data:`, updateData);

    try {
      const { data, error } = await this.supabase
        .schema('gamebox')
        .from('reservations')
        .update({
          ...updateData,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select();

      if (error) {
        this.logger.error(`Error updating reservation:`, error);
        throw new Error(`Failed to update reservation: ${error.message}`);
      }

      this.logger.debug(`Successfully updated reservation ${id}`, { data });
      return data;
    } catch (error) {
      this.logger.error(`Exception updating reservation:`, error);
      throw error;
    }
  }

  async deleteReservation(id: string) {
    this.logger.debug(`Deleting reservation ${id}`);

    try {
      const { data, error } = await this.supabase
        .schema('gamebox')
        .from('reservations')
        .delete()
        .eq('id', id)
        .select();

      if (error) {
        this.logger.error(`Error deleting reservation:`, error);
        throw new Error(`Failed to delete reservation: ${error.message}`);
      }

      this.logger.debug(`Successfully deleted reservation ${id}`, { data });
      return data;
    } catch (error) {
      this.logger.error(`Exception deleting reservation:`, error);
      throw error;
    }
  }

  async getReservations() {
    // First, get all reservations
    const { data: reservations, error: reservationsError } = await this.supabase
      .schema('gamebox')
      .from('reservations')
      .select('*')
      .order('created_at', { ascending: false });

    if (reservationsError) {
      throw new Error(`Failed to fetch reservations: ${reservationsError.message}`);
    }

    if (!reservations || reservations.length === 0) {
      this.logger.debug('No reservations found');
      return [];
    }

    // Get unique owner IDs
    const ownerIds = [...new Set(reservations.map((r) => r.owner_id))];

    // Fetch owner profiles
    const { data: ownerProfiles, error: profilesError } = await this.supabase
      .schema('gamebox')
      .from('user_profiles')
      .select('id, name, email')
      .in('id', ownerIds);

    if (profilesError) {
      this.logger.warn('Failed to fetch owner profiles:', profilesError);
    }

    // Create owner profile map
    const ownerMap = new Map();
    ownerProfiles?.forEach((profile) => {
      ownerMap.set(profile.id, profile);
    });

    // Get reservation IDs for participants
    const reservationIds = reservations.map((r) => r.id);

    // Fetch participants
    const { data: participants, error: participantsError } = await this.supabase
      .schema('gamebox')
      .from('reservation_participants')
      .select('*')
      .in('reservation_id', reservationIds);

    if (participantsError) {
      this.logger.warn('Failed to fetch participants:', participantsError);
    }

    // Create participants map
    const participantsMap = new Map();
    participants?.forEach((participant) => {
      if (!participantsMap.has(participant.reservation_id)) {
        participantsMap.set(participant.reservation_id, []);
      }
      participantsMap.get(participant.reservation_id).push(participant);
    });

    // Combine the data
    const enrichedReservations = reservations.map((reservation) => {
      const owner = ownerMap.get(reservation.owner_id);
      const reservationParticipants = participantsMap.get(reservation.id) || [];

      return {
        ...reservation,
        owner_name: owner?.name || 'Unknown',
        owner_email: owner?.email || 'No email',
        participants: reservationParticipants,
      };
    });

    this.logger.debug(`Successfully fetched ${enrichedReservations.length} reservations`);
    return enrichedReservations;
  }

  async getAdminStats() {
    const { data: reservations, error: reservationsError } = await this.supabase
      .schema('gamebox')
      .from('reservations')
      .select('*');

    if (reservationsError) {
      throw new Error(`Failed to fetch reservations for stats: ${reservationsError.message}`);
    }

    const today = new Date().toISOString().split('T')[0];
    const todayBookings = reservations?.filter((r: any) => r.date === today).length || 0;
    const totalReservations = reservations?.length || 0;

    // Get unique confirmed participants
    const { data: participants, error: participantsError } = await this.supabase
      .schema('gamebox')
      .from('reservation_participants')
      .select('user_id')
      .eq('confirmed', true);

    if (participantsError) {
      this.logger.warn('Failed to fetch participants for stats:', participantsError);
    }

    const uniqueParticipants = new Set(participants?.map((p) => p.user_id).filter(Boolean));
    const activeUsers = uniqueParticipants.size;

    // Simple revenue calculation (can be made more sophisticated)
    const revenue = totalReservations * 25; // Assuming $25 per reservation

    const stats = {
      totalReservations,
      todayBookings,
      activeUsers,
      revenue,
    };

    this.logger.debug('Successfully calculated stats:', stats);
    return stats;
  }

  async getReservationParticipants(reservationId: string) {
    this.logger.debug(`Fetching participants for reservation ${reservationId}`);

    try {
      const { data: participants, error } = await this.supabase
        .schema('gamebox')
        .from('reservation_participants')
        .select('id, reservation_id, user_id, email, name, confirmed, added_at, created_at')
        .eq('reservation_id', reservationId)
        .order('created_at', { ascending: true });

      if (error) {
        this.logger.error(`Error fetching participants:`, error);
        throw new Error(`Failed to fetch participants: ${error.message}`);
      }

      this.logger.debug(`Successfully fetched ${participants?.length || 0} participants for reservation ${reservationId}`);
      return participants || [];
    } catch (error) {
      this.logger.error(`Exception fetching participants:`, error);
      throw error;
    }
  }
}
