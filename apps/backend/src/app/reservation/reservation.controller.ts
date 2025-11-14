import {
  Controller,
  Post,
  Body,
  Get,
  Param,
  Put,
  Delete,
  Query,
  UseGuards,
  Request,
  BadRequestException,
  Logger,
  Patch,
} from '@nestjs/common';
import { ReservationService } from './reservation.service';
import { SupabaseService } from '../supabase/supabase.service';
import { AuthGuard } from '../auth/auth.guard';
import { Reservation } from '@gamebox/shared';
import { CreateReservationRequest, UpdateReservationRequest } from '@gamebox/shared';

@Controller('reservations')
export class ReservationController {
  private readonly logger = new Logger(ReservationController.name);

  constructor(
    private readonly reservationService: ReservationService,
    private readonly supabaseService: SupabaseService,
  ) {}

  @Post('public')
  async createPublicReservation(@Body() request: CreateReservationRequest): Promise<Reservation> {
    this.logger.debug('🔓 Public reservation request received:', request);
    this.logger.debug('🔓 Request body:', JSON.stringify(request, null, 2));

    let ownerEmail = 'anonymous@example.com';
    let ownerName = 'Anonymous User';

    if (request.participants && request.participants.length > 0) {
      const firstParticipant = request.participants[0];
      ownerEmail = firstParticipant.email || 'anonymous@example.com';
      ownerName = firstParticipant.name || 'Anonymous User';
      this.logger.debug('🔓 Using first participant as owner:', {
        email: ownerEmail,
        name: ownerName,
      });
    } else {
      this.logger.debug('🔓 No participants provided, using default anonymous values');
    }

    this.logger.debug('🔓 Public reservation - Owner email:', ownerEmail);
    this.logger.debug('🔓 Public reservation - Owner name:', ownerName);

    const createReservationDto = {
      ...request,
      owner_email: ownerEmail,
      owner_name: ownerName,
    };

    this.logger.debug(
      '🔓 Calling createPublicReservation with DTO:',
      JSON.stringify(createReservationDto, null, 2),
    );

    try {
      const result = await this.reservationService.createPublicReservation(createReservationDto);
      this.logger.debug('🔓 Public reservation created successfully:', result);
      return result;
    } catch (error) {
      console.error('🔓 Error creating public reservation:', error);
      throw error;
    }
  }

  @Post()
  @UseGuards(AuthGuard)
  async createReservation(
    @Body() request: CreateReservationRequest,
    @Request() req: any,
  ): Promise<Reservation> {
    const userId = req.user?.id;

    if (!userId) {
      throw new BadRequestException('User ID is required');
    }

    this.logger.debug('Authenticated reservation request:', request);
    this.logger.debug('User ID:', userId);
    this.logger.debug('Full user object:', JSON.stringify(req.user, null, 2));

    let ownerEmail = 'unknown@example.com';
    let ownerName = 'User';

    if (request.participants && request.participants.length > 0) {
      const firstParticipant = request.participants[0];
      ownerEmail = firstParticipant.email || 'unknown@example.com';
      ownerName = firstParticipant.name || 'User';
    }

    this.logger.debug('Extracted owner email from participants:', ownerEmail);
    this.logger.debug('Extracted owner name from participants:', ownerName);

    const createReservationDto = {
      ...request,
      owner_email: ownerEmail,
      owner_name: ownerName,
    };

    return this.reservationService.createReservation(createReservationDto, userId);
  }

  @Get()
  @UseGuards(AuthGuard)
  async getReservations(@Request() req: any): Promise<Reservation[]> {
    const userId = req.user?.id;
    return this.reservationService.getReservations(userId);
  }

  @Get(':id')
  @UseGuards(AuthGuard)
  async getReservation(@Param('id') id: string): Promise<Reservation> {
    return this.reservationService.getReservationByID(id);
  }

  @Patch(':id')
  @UseGuards(AuthGuard)
  async updateReservation(
    @Param('id') id: string,
    @Body() request: UpdateReservationRequest,
  ): Promise<Reservation> {
    return this.reservationService.updateReservation(id, request);
  }

  @Delete(':id')
  @UseGuards(AuthGuard)
  async cancelReservation(@Param('id') id: string): Promise<Reservation> {
    return this.reservationService.cancelReservation(id);
  }

  @Get('share/:id')
  async getReservationByToken(@Param('id') reservationId: string): Promise<Reservation> {
    return this.reservationService.getReservationByID(reservationId);
  }

  @Post('share/:id/confirm')
  async confirmParticipation(
    @Param('id') reservationId: string,
    @Body() body: { email: string },
  ): Promise<Reservation> {
    if (!body.email) {
      throw new BadRequestException('Email is required');
    }
    return this.reservationService.confirmParticipation(reservationId, body.email);
  }

  @Post(':id/participant/confirm')
  @UseGuards(AuthGuard)
  async updateParticipantConfirmation(
    @Param('id') id: string,
    @Body() body: { email: string; confirmed: boolean },
    @Request() req: any,
  ): Promise<any> {
    const userId = req.user?.id;
    if (!userId) {
      throw new BadRequestException('User ID is required');
    }
    if (!body.email || body.confirmed === undefined) {
      throw new BadRequestException('Email and confirmed status are required');
    }
    return this.reservationService.updateParticipantConfirmation(id, body.email, body.confirmed);
  }

  // Note: Token generation endpoints removed - using direct reservation IDs for share links

  @Get('availability/slots')
  async getAvailableTimeSlots(@Query('date') date: string): Promise<any[]> {
    if (!date) {
      throw new BadRequestException('Date parameter is required');
    }
    return this.reservationService.getAvailableTimeSlots(date);
  }

  @Get('availability/dates')
  async getAvailableDates(@Query('startDate') startDate?: string): Promise<string[]> {
    return this.reservationService.getAvailableDates(startDate);
  }

  @Get('availability/check')
  async checkSlotAvailability(
    @Query('date') date: string,
    @Query('time') time: string,
  ): Promise<{ available: boolean }> {
    if (!date || !time) {
      throw new BadRequestException('Both date and time parameters are required');
    }
    const available = await this.reservationService.checkSlotAvailability(date, time);
    return { available };
  }
}
