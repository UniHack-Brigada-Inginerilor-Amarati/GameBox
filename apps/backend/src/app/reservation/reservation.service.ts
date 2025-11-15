import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { Reservation, UpdateReservationRequest, TIME_SLOTS } from '@gamebox/shared';
import { SupabaseService } from '../supabase/supabase.service';

@Injectable()
export class ReservationService {
  constructor(private readonly supabaseService: SupabaseService) {}
  private readonly logger = new Logger(ReservationService.name);

  async createReservation(createReservationDto: any, userId: string): Promise<any> {
    try {
      // Use supabaseAdmin to bypass RLS policies
      const { data: reservation, error: reservationError } = await this.supabaseService.supabaseAdmin
        .schema('gamebox')
        .from('reservations')
        .insert({
          owner_id: userId, // userId is a UUID from auth.users
          date: createReservationDto.date,
          slot_time: createReservationDto.slot_time,
          game_mode: createReservationDto.game_mode,
          level: createReservationDto.level || 'beginner',
          is_public: createReservationDto.is_public !== false,
          max_participants: createReservationDto.max_participants || 4,
        })
        .select()
        .single();

      if (reservationError) {
        this.logger.error('Error creating reservation:', reservationError);
        throw new Error('Failed to create reservation');
      }

      this.logger.debug('Adding owner as participant with:', {
        reservation_uuid: reservation.id,
        participant_email: createReservationDto.owner_email,
        participant_name: createReservationDto.owner_name,
        added_by_user_id: userId,
      });

      try {
        await this.addParticipant(
          reservation.id,
          createReservationDto.owner_email,
          createReservationDto.owner_name,
          userId,
        );

        this.logger.debug('Owner added as participant successfully');
      } catch (participantError) {
        this.logger.error('Exception while adding owner as participant:', participantError);
      }

      return reservation;
    } catch (error) {
      this.logger.error('Error in createReservation:', error);
      throw error;
    }
  }

  async getReservations(userId: string | null): Promise<Reservation[]> {
    try {
      if (!userId) {
        return [];
      }

      this.logger.debug(`Fetching all reservations for user: ${userId}`);

      // Use supabaseAdmin to bypass RLS policies
      const { data: ownedReservations, error: ownedError } = await this.supabaseService.supabaseAdmin
        .schema('gamebox')
        .from('reservations')
        .select('*')
        .eq('owner_id', userId)
        .order('date', { ascending: false })
        .order('slot_time', { ascending: false });

      if (ownedError) {
        this.logger.error('Supabase error fetching owned reservations:', ownedError);
        throw new Error(`Failed to fetch owned reservations: ${ownedError.message}`);
      }

      const { data: participantReservations, error: participantError } = await this.supabaseService.supabaseAdmin
        .schema('gamebox')
        .from('reservation_participants')
        .select(
          `
          reservation_id,
          reservations (*)
        `,
        )
        .eq('email', (await this.getUserEmail(userId)) || '')
        .neq('reservations.owner_id', userId);

      if (participantError) {
        this.logger.error('Supabase error fetching participant reservations:', participantError);
      }

      const allReservations = [...(ownedReservations || [])];

      if (participantReservations) {
        const participantReservationData = participantReservations
          .map((p: any) => p.reservations)
          .filter((r: any) => r !== null);

        participantReservationData.forEach((participantReservation: any) => {
          if (!allReservations.some((r: any) => r.id === participantReservation.id)) {
            allReservations.push(participantReservation);
          }
        });
      }

      allReservations.sort((a: any, b: any) => {
        const dateComparison = new Date(b.date).getTime() - new Date(a.date).getTime();
        if (dateComparison !== 0) return dateComparison;
        return b.slot_time.localeCompare(a.slot_time);
      });

      this.logger.debug(
        `🔍 Found ${ownedReservations?.length || 0} owned reservations and ${
          participantReservations?.length || 0
        } participant reservations`,
      );

      const reservationsWithData = await Promise.all(
        allReservations.map(async (reservation: any) => {
          try {
            const { data: participants, error: participantsError } = await this.supabaseService.supabaseAdmin
              .schema('gamebox')
              .from('reservation_participants')
              .select('*')
              .eq('reservation_id', reservation.id)
              .order('created_at', { ascending: true });

            if (participantsError) {
              this.logger.error(
                `Error fetching participants for reservation ${reservation.id}:`,
                participantsError,
              );
            }

            const reservationWithData = {
              ...reservation,
              participants: participants || [],
              is_owner: reservation.owner_id === userId,
            };

            if (participants && participants.length > 0) {
              const allConfirmed = participants.every((p) => p.confirmed);
              if (allConfirmed && reservation.status === 'pending') {
                await this.updateReservationStatusIfAllConfirmed(reservation.id);

                reservationWithData.status = 'confirmed';
              }
            }

            this.logger.debug(`Reservation ${reservation.id} processed:`, {
              id: reservationWithData.id,
              game_mode: reservationWithData.game_mode,
              date: reservationWithData.date,
              slot_time: reservationWithData.slot_time,
              participants_count: reservationWithData.participants.length,
              has_token: !!reservationWithData.share_token,
              status: reservationWithData.status,
              is_owner: reservation.owner_id === userId,
            });

            return reservationWithData;
          } catch (error) {
            this.logger.error(`Error processing reservation ${reservation.id}:`, error);
            return {
              ...reservation,
              participants: [],
              share_token: null,
            };
          }
        }),
      );

      this.logger.debug(`Returning ${reservationsWithData.length} total reservations to frontend`);
      return reservationsWithData;
    } catch (error) {
      this.logger.error('Error fetching reservations:', error);
      throw new Error(error.message || 'Failed to fetch reservations');
    }
  }

  async getReservation(id: string): Promise<any> {
    try {
      // Use supabaseAdmin to bypass RLS policies
      const { data: reservation, error: reservationError } = await this.supabaseService.supabaseAdmin
        .schema('gamebox')
        .from('reservations')
        .select('*')
        .eq('id', id)
        .single();

      if (reservationError) {
        this.logger.error('Error fetching reservation:', reservationError);
        throw new Error('Reservation not found');
      }

      const { data: participants, error: participantsError } = await this.supabaseService.supabaseAdmin
        .schema('gamebox')
        .from('reservation_participants')
        .select('*')
        .eq('reservation_id', id)
        .order('added_at', { ascending: true });

      if (participantsError) {
        this.logger.error('Error fetching participants:', participantsError);
      }

      return {
        ...reservation,
        participants: participants || [],
      };
    } catch (error) {
      this.logger.error('Error in getReservation:', error);
      throw error;
    }
  }

  async getReservationByID(reservationId: string): Promise<Reservation> {
    try {
      // Directly get reservation by ID (no more tokens) - public access
      // Use supabaseAdmin to bypass RLS policies for public access
      const { data: reservation, error } = await this.supabaseService.supabaseAdmin
        .schema('gamebox')
        .from('reservations')
        .select('*')
        .eq('id', reservationId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          throw new NotFoundException('Reservation not found');
        }
        this.logger.error('Reservation lookup error:', error);
        throw new Error(`Failed to fetch reservation: ${error.message}`);
      }

      if (!reservation) {
        throw new NotFoundException('Reservation not found');
      }

      const { data: participants, error: participantsError } = await this.supabaseService.supabaseAdmin
        .schema('gamebox')
        .from('reservation_participants')
        .select('*')
        .eq('reservation_id', reservation.id)
        .order('created_at', { ascending: true });

      if (participantsError) {
        this.logger.error('Error fetching participants:', participantsError);
      }

      return {
        ...reservation,
        participants: participants || [],
      };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error('Error getting reservation by ID:', error);
      throw new Error(error.message || 'Failed to fetch reservation');
    }
  }

  async updateReservation(
    reservationId: string,
    request: UpdateReservationRequest,
  ): Promise<Reservation> {
    try {
      await this.getReservationByID(reservationId);

      // Use supabaseAdmin to bypass RLS policies
      const { data: reservation, error } = await this.supabaseService.supabaseAdmin
        .schema('gamebox')
        .from('reservations')
        .update(request)
        .eq('id', reservationId)
        .select()
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          throw new NotFoundException('Reservation not found');
        }
        this.logger.error('Supabase error:', error);
        throw new Error(`Failed to update reservation: ${error.message}`);
      }

      if (!reservation) {
        throw new NotFoundException('Reservation not found');
      }

      return reservation;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error('Error updating reservation:', error);
      throw new Error(error.message || 'Failed to update reservation');
    }
  }

  async updateReservationStatusIfAllConfirmed(reservationId: string): Promise<void> {
    try {
      const { data: reservation, error: reservationError } = await this.supabaseService.supabaseAdmin
        .schema('gamebox')
        .from('reservations')
        .select('status')
        .eq('id', reservationId)
        .single();

      if (reservationError) {
        this.logger.error('Error fetching reservation for status update:', reservationError);
        return;
      }

      if (reservation.status !== 'pending') {
        return;
      }

      const { data: participants, error: participantsError } = await this.supabaseService.supabaseAdmin
        .schema('gamebox')
        .from('reservation_participants')
        .select('confirmed')
        .eq('reservation_id', reservationId);

      if (participantsError) {
        this.logger.error('Error fetching participants for status update:', participantsError);
        return;
      }

      if (participants && participants.length > 0) {
        const allConfirmed = participants.every((p) => p.confirmed);

        if (allConfirmed) {
          this.logger.debug(
            `All participants confirmed for reservation ${reservationId}, updating status to confirmed`,
          );

          const { error: statusUpdateError } = await this.supabaseService.supabaseAdmin
            .schema('gamebox')
            .from('reservations')
            .update({ status: 'confirmed' })
            .eq('id', reservationId);

          if (statusUpdateError) {
            this.logger.error('Error updating reservation status:', statusUpdateError);
          } else {
            this.logger.debug(`Reservation ${reservationId} status updated to confirmed`);
          }
        }
      }
    } catch (error) {
      this.logger.error('Error in updateReservationStatusIfAllConfirmed:', error);
    }
  }

  async cancelReservation(reservationId: string): Promise<Reservation> {
    return this.updateReservation(reservationId, { status: 'cancelled' });
  }

  async confirmParticipation(
    reservationId: string,
    participantEmail: string,
  ): Promise<Reservation> {
    try {
      const reservation = await this.getReservationByID(reservationId);

      const { data: existingParticipant, error: checkError } =
        await this.supabaseService.supabaseAdmin
          .schema('gamebox')
          .from('reservation_participants')
          .select('*')
          .eq('reservation_id', reservation.id)
          .eq('email', participantEmail)
          .single();

      if (checkError && checkError.code !== 'PGRST116') {
        this.logger.error('Supabase error checking participant:', checkError);
        throw new Error(`Failed to check participant: ${checkError.message}`);
      }

      if (!existingParticipant) {
        this.logger.debug(
          `Adding new participant: ${participantEmail} to reservation: ${reservation.id}`,
        );

        const { error: addError } = await this.supabaseService.supabaseAdmin
          .schema('gamebox')
          .from('reservation_participants')
          .insert({
            reservation_id: reservation.id,
            email: participantEmail,
            name: participantEmail.split('@')[0],
            confirmed: true, // Set to confirmed immediately
            added_by: null,
          });

        if (addError) {
          this.logger.error('Supabase error adding participant:', addError);
          throw new Error(`Failed to add participant: ${addError.message}`);
        }

        this.logger.debug(`New participant added and confirmed: ${participantEmail}`);
      } else {
        // Update existing participant to confirmed
        const { error: updateError } = await this.supabaseService.supabaseAdmin
          .schema('gamebox')
          .from('reservation_participants')
          .update({ confirmed: true })
          .eq('reservation_id', reservation.id)
          .eq('email', participantEmail);

        if (updateError) {
          this.logger.error('Supabase error updating participant:', updateError);
          throw new Error(`Failed to confirm participation: ${updateError.message}`);
        }

        this.logger.debug(`Participation confirmed for existing participant: ${participantEmail}`);
      }

      this.logger.debug(`Participation confirmed for: ${participantEmail}`);

      const { data: allParticipants, error: participantsError } =
        await this.supabaseService.supabaseAdmin
          .schema('gamebox')
          .from('reservation_participants')
          .select('confirmed')
          .eq('reservation_id', reservation.id);

      if (participantsError) {
        this.logger.error('Error fetching participants for status update:', participantsError);
      } else if (allParticipants && allParticipants.length > 0) {
        const allConfirmed = allParticipants.every((p) => p.confirmed);

        if (allConfirmed && reservation.status === 'pending') {
          this.logger.debug('All participants confirmed, updating reservation status to confirmed');

          const { error: statusUpdateError } = await this.supabaseService.supabaseAdmin
            .schema('gamebox')
            .from('reservations')
            .update({ status: 'confirmed' })
            .eq('id', reservation.id);

          if (statusUpdateError) {
            this.logger.error('Error updating reservation status:', statusUpdateError);
          } else {
            this.logger.debug('Reservation status updated to confirmed');
          }
        }
      }

      const updatedReservation = await this.getReservationByID(reservationId);

      if (!updatedReservation) {
        throw new NotFoundException('Reservation not found');
      }

      return updatedReservation;
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof BadRequestException) {
        throw error;
      }
      this.logger.error('Error confirming participation:', error);
      throw new Error(error.message || 'Failed to confirm participation');
    }
  }

  private normalizeTimeFormat(timeStr: string): string {
    if (typeof timeStr === 'string' && timeStr.includes(':')) {
      const parts = timeStr.split(':');
      if (parts.length >= 2) {
        return `${parts[0]}:${parts[1]}`;
      }
    }
    return timeStr;
  }

  async getAvailableTimeSlots(date: string): Promise<any[]> {
    try {
      const { data: reservations, error } = await this.supabaseService.supabaseAdmin
        .schema('gamebox')
        .from('reservations')
        .select('id, slot_time, status, owner_id')
        .eq('date', date);

      if (error) {
        this.logger.error('Supabase error:', error);
        throw new Error(`Failed to fetch time slots: ${error.message}`);
      }

      const activeReservations = (reservations || []).filter((r: any) => r.status !== 'cancelled');

      const bookedSlots = activeReservations.map((r: any) => {
        return this.normalizeTimeFormat(r.slot_time);
      });

      const allSlots = TIME_SLOTS;

      const todayString = new Date().toISOString().split('T')[0];
      const isToday = date === todayString;
      const currentTime = new Date();

      this.logger.debug(
        `Backend: Checking date ${date}, today is ${todayString}, isToday: ${isToday}`,
      );
      this.logger.debug(`Backend: Current time: ${currentTime.toISOString()}`);

      const result = allSlots.map((time) => {
        const isBooked = bookedSlots.includes(time);
        const reservation = activeReservations.find((r: any) => {
          const normalizedReservationTime = this.normalizeTimeFormat(r.slot_time);
          return normalizedReservationTime === time;
        });

        let isPast = false;
        if (isToday) {
          const [hours, minutes] = time.split(':').map(Number);
          const slotTime = new Date();
          slotTime.setHours(hours, minutes, 0, 0);
          isPast = slotTime < currentTime;
        }

        let available = false;
        let status = 'available';

        if (isPast) {
          status = 'past';
          available = false;
        } else if (isBooked) {
          status = 'booked';
          available = false;
        } else {
          status = 'available';
          available = true;
        }

        return {
          time,
          available,
          reservation_id: reservation?.id,
          status,
          owner_id: reservation?.owner_id,
          isPast,
          isBooked,
        };
      });

      return result;
    } catch (error) {
      this.logger.error('Error fetching time slots:', error);
      throw new Error(error.message || 'Failed to fetch time slots');
    }
  }

  async getAvailableDates(startDate?: string): Promise<string[]> {
    try {
      const start = startDate || new Date().toISOString().split('T')[0];
      const endDate = new Date();
      endDate.setDate(endDate.getDate() + 30);

      const { data: reservations, error } = await this.supabaseService.supabaseAdmin
        .schema('gamebox')
        .from('reservations')
        .select('date, slot_time, status')
        .gte('date', start)
        .lte('date', endDate.toISOString().split('T')[0]);

      if (error) {
        this.logger.error('Supabase error:', error);
        throw new Error(`Failed to fetch available dates: ${error.message}`);
      }

      const activeReservations = (reservations || []).filter((r: any) => r.status !== 'cancelled');

      const availableDates: string[] = [];
      const currentDate = new Date(start);

      for (let i = 0; i < 30; i++) {
        const dateString = currentDate.toISOString().split('T')[0];

        const dateReservations = activeReservations.filter((r: any) => r.date === dateString);
        const bookedSlotsCount = dateReservations.length;

        if (bookedSlotsCount < 12) {
          availableDates.push(dateString);
        }

        currentDate.setDate(currentDate.getDate() + 1);
      }

      return availableDates;
    } catch (error) {
      this.logger.error('Error fetching available dates:', error);
      throw new Error(error.message || 'Failed to fetch available dates');
    }
  }

  async checkSlotAvailability(date: string, time: string): Promise<boolean> {
    try {
      const todayString = new Date().toISOString().split('T')[0];

      if (date < todayString) {
        return false;
      }

      this.logger.debug(
        `Backend checkSlotAvailability: Date ${date}, today is ${todayString}, isPast: ${
          date < todayString
        }`,
      );

      const { data: reservation, error } = await this.supabaseService.supabaseAdmin
        .schema('gamebox')
        .from('reservations')
        .select('id, status, owner_id, slot_time')
        .eq('date', date)
        .neq('status', 'cancelled');

      if (error) {
        this.logger.error('Supabase error checking availability:', error);
        throw new Error(`Failed to check slot availability: ${error.message}`);
      }

      const matchingReservation = (reservation || []).find((r: any) => {
        const normalizedReservationTime = this.normalizeTimeFormat(r.slot_time);
        return normalizedReservationTime === time;
      });

      return !matchingReservation;
    } catch (error) {
      this.logger.error('Error checking slot availability:', error);
      return false;
    }
  }

  // Note: generateShareToken method removed - using direct reservation IDs

  // Note: ensureShareToken method removed - using direct reservation IDs

  async addParticipantToReservation(
    reservationId: string,
    participantData: any,
    userId?: string,
  ): Promise<any> {
    try {
      const { data: reservation, error: reservationError } = await this.supabaseService.supabaseAdmin
        .schema('gamebox')
        .from('reservations')
        .select('is_public, owner_id')
        .eq('id', reservationId)
        .single();

      if (reservationError) {
        throw new Error('Reservation not found');
      }

      if (!reservation.is_public && userId !== reservation.owner_id) {
        throw new Error('Only the owner can add participants to private reservations');
      }

      await this.addParticipant(
        reservationId,
        participantData.email,
        participantData.name,
        userId || undefined,
      );

      return { success: true, message: 'Participant added successfully' };
    } catch (error) {
      this.logger.error('Error in addParticipantToReservation:', error);
      throw error;
    }
  }

  private async getUserEmail(userId: string): Promise<string | null> {
    const { data: user, error } = await this.supabaseService.supabaseAdmin
      .schema('gamebox')
      .from('user_profiles')
      .select('email')
      .eq('id', userId)
      .single();

    if (error) {
      this.logger.error('Error fetching user email:', error);
      return null;
    }
    return user?.email || null;
  }

  async createPublicReservation(createReservationDto: any): Promise<any> {
    try {
      const anonymousUserId = '00000000-0000-0000-0000-000000000000';

      this.logger.debug('🔓 Creating public reservation with anonymous user:', anonymousUserId);
      this.logger.debug('🔓 Reservation data to insert:', {
        owner_id: anonymousUserId,
        date: createReservationDto.date,
        slot_time: createReservationDto.slot_time,
        game_mode: createReservationDto.game_mode,
        level: createReservationDto.level || 'beginner',
        is_public: true,
        max_participants: createReservationDto.max_participants || 4,
      });

      // Use supabaseAdmin to bypass RLS policies
      const { data: reservation, error: reservationError } = await this.supabaseService.supabaseAdmin
        .schema('gamebox')
        .from('reservations')
        .insert({
          owner_id: anonymousUserId,
          date: createReservationDto.date,
          slot_time: createReservationDto.slot_time,
          game_mode: createReservationDto.game_mode,
          level: createReservationDto.level || 'beginner',
          is_public: true,
          max_participants: createReservationDto.max_participants || 4,
        })
        .select()
        .single();

      if (reservationError) {
        this.logger.error('🔓 Error creating public reservation:', reservationError);
        this.logger.error('🔓 Error details:', {
          code: reservationError.code,
          message: reservationError.message,
          details: reservationError.details,
          hint: reservationError.hint,
        });
        throw new Error(`Failed to create public reservation: ${reservationError.message}`);
      }

      this.logger.debug('🔓 Public reservation created successfully:', reservation);

      this.logger.debug('🔓 Adding first participant for public reservation:', {
        reservation_uuid: reservation.id,
        participant_email: createReservationDto.owner_email,
        participant_name: createReservationDto.owner_name,
      });

      try {
        const { error: participantError } = await this.supabaseService.supabaseAdmin
          .schema('gamebox')
          .from('reservation_participants')
          .insert({
            reservation_id: reservation.id,
            email: createReservationDto.owner_email,
            name: createReservationDto.owner_name,
            added_by: null,
            confirmed: true,
          });

        if (participantError) {
          this.logger.error(
            '🔓 Error adding first participant for public reservation:',
            participantError,
          );
          this.logger.error('🔓 Participant error details:', {
            code: participantError.code,
            message: participantError.message,
            details: participantError.details,
            hint: participantError.hint,
          });
          throw new Error(`Failed to add first participant: ${participantError.message}`);
        } else {
          this.logger.debug('🔓 First participant added successfully for public reservation');
        }
      } catch (participantError) {
        this.logger.error(
          '🔓 Exception while adding first participant for public reservation:',
          participantError,
        );
        throw participantError;
      }

      // Note: Share token generation removed - using direct reservation IDs for share links

      return reservation;
    } catch (error) {
      this.logger.error('🔓 Error in createPublicReservation:', error);
      throw error;
    }
  }

  async updateParticipantConfirmation(
    reservationId: string,
    participantEmail: string,
    confirmed: boolean,
  ): Promise<any> {
    try {
      const { data, error } = await this.supabaseService.supabaseAdmin
        .schema('gamebox')
        .from('reservation_participants')
        .update({ confirmed })
        .eq('reservation_id', reservationId)
        .eq('email', participantEmail)
        .select()
        .single();

      if (error) {
        this.logger.error('Error updating participant confirmation:', error);
        throw new Error('Failed to update participant confirmation');
      }

      if (confirmed) {
        const { data: participants } = await this.supabaseService.supabaseAdmin
          .schema('gamebox')
          .from('reservation_participants')
          .select('confirmed')
          .eq('reservation_id', reservationId);

        if (participants && participants.every((p) => p.confirmed)) {
          await this.updateReservationStatusIfAllConfirmed(reservationId);
        }
      }

      return data;
    } catch (error) {
      this.logger.error('Error in updateParticipantConfirmation:', error);
      throw error;
    }
  }

  // ========================================
  // DATABASE HELPER METHODS (formerly in DatabaseService)
  // ========================================

  /**
   * Handle new user creation - replaces gamebox.handle_new_user() trigger
   */
  async handleNewUser(userId: string, email: string, userMetadata: any): Promise<void> {
    try {
      const name = userMetadata?.name || email.split('@')[0];
      const avatarUrl = userMetadata?.avatar_url || null;
      
      // Generate username from name or email
      // Remove special characters, convert to lowercase, replace spaces with underscores
      let username = (userMetadata?.username || name || email.split('@')[0])
        .toLowerCase()
        .replace(/[^a-z0-9_]/g, '_')
        .replace(/_+/g, '_')
        .replace(/^_|_$/g, '');
      
      // Ensure username is not empty and has valid length
      if (!username || username.length < 3) {
        username = `user_${userId.substring(0, 8)}`;
      }
      
      // Check if username is available, if not append a suffix
      let finalUsername = username;
      let suffix = 1;
      while (true) {
        const { data: existing } = await this.supabaseService.supabaseAdmin
          .schema('gamebox')
          .from('user_profiles')
          .select('id')
          .eq('username', finalUsername)
          .limit(1);
        
        if (!existing || existing.length === 0) {
          break; // Username is available
        }
        
        finalUsername = `${username}_${suffix}`;
        suffix++;
      }

      const { error } = await this.supabaseService.supabaseAdmin
        .schema('gamebox')
        .from('user_profiles')
        .insert({
          id: userId,
          username: finalUsername,
          email,
          avatar_url: avatarUrl,
          role: 'user',
        });

      if (error) {
        this.logger.error('Error creating user profile:', error);
        throw new BadRequestException('Failed to create user profile');
      }

      this.logger.log(`User profile created for: ${email} with username: ${finalUsername}`);
    } catch (error) {
      this.logger.error('Error in handleNewUser:', error);
      throw error;
    }
  }

  // Note: generateReservationToken method removed - using direct reservation IDs

  /**
   * Add participant to reservation - replaces gamebox.add_participant()
   */
  async addParticipant(
    reservationId: string,
    participantEmail: string,
    participantName: string,
    addedByUserId?: string,
  ): Promise<boolean> {
    try {
      // Get reservation details
      const { data: reservation, error: reservationError } =
        await this.supabaseService.supabaseAdmin
          .schema('gamebox')
          .from('reservations')
          .select('*')
          .eq('id', reservationId)
          .single();

      if (reservationError || !reservation) {
        throw new NotFoundException(`Reservation not found: ${reservationId}`);
      }

      // Check if user can add participants
      if (!reservation.is_public && addedByUserId && addedByUserId !== reservation.owner_id) {
        throw new BadRequestException(
          'Only the owner can add participants to private reservations',
        );
      }

      // Check current participant count
      const { count: currentCount, error: countError } = await this.supabaseService.supabaseAdmin
        .schema('gamebox')
        .from('reservation_participants')
        .select('*', { count: 'exact', head: true })
        .eq('reservation_id', reservationId);

      if (countError) {
        this.logger.error('Error counting participants:', countError);
        throw new BadRequestException('Failed to check participant count');
      }

      if (currentCount >= reservation.max_participants) {
        throw new BadRequestException('Maximum participants reached for this reservation');
      }

      // Add participant (upsert)
      const { error: insertError } = await this.supabaseService.supabaseAdmin
        .schema('gamebox')
        .from('reservation_participants')
        .upsert(
          {
            reservation_id: reservationId,
            user_id: null,
            email: participantEmail,
            name: participantName,
            added_by: addedByUserId,
            added_at: new Date().toISOString(),
          },
          {
            onConflict: 'reservation_id,email',
          },
        );

      if (insertError) {
        this.logger.error('Error adding participant:', insertError);
        throw new BadRequestException('Failed to add participant');
      }

      this.logger.log(`Participant added: ${participantEmail} to reservation: ${reservationId}`);
      return true;
    } catch (error) {
      this.logger.error('Error in addParticipant:', error);
      throw error;
    }
  }

  // Note: cleanupExpiredTokens method removed - no more tokens to clean up

  /**
   * Update updated_at column - replaces gamebox.update_updated_at_column()
   * This is handled automatically by the database trigger, but we can add it here for completeness
   */
  async updateUpdatedAt(tableName: string, recordId: string): Promise<void> {
    try {
      const { error } = await this.supabaseService.supabaseAdmin
        .schema('gamebox')
        .from(tableName)
        .update({ updated_at: new Date().toISOString() })
        .eq('id', recordId);

      if (error) {
        this.logger.error(`Error updating ${tableName} updated_at:`, error);
        throw new BadRequestException(`Failed to update ${tableName} timestamp`);
      }
    } catch (error) {
      this.logger.error(`Error in updateUpdatedAt for ${tableName}:`, error);
      throw error;
    }
  }
}
