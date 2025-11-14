import {
  Controller,
  Get,
  Put,
  Param,
  Body,
  UseGuards,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { AdminService } from './admin.service';
import { AuthGuard } from '../auth/auth.guard';
import { AdminGuard } from '../admin/admin.guard';

@Controller('admin')
@UseGuards(AuthGuard, AdminGuard)
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('test')
  async test() {
    return { message: 'Admin module is working!' };
  }

  @Get('reservations')
  async getReservations() {
    try {
      const result = await this.adminService.getReservations();
      return { success: true, data: result };
    } catch (error) {
      throw new HttpException(
        `Failed to fetch reservations: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('stats')
  async getAdminStats() {
    try {
      const result = await this.adminService.getAdminStats();
      return { success: true, data: result };
    } catch (error) {
      throw new HttpException(
        `Failed to fetch admin stats: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Put('reservations/:id/status')
  async updateReservationStatus(@Param('id') id: string, @Body() body: { status: string }) {
    try {
      const result = await this.adminService.updateReservationStatus(id, body.status);
      return { success: true, data: result };
    } catch (error) {
      throw new HttpException(
        `Failed to update reservation status: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Put('reservations/:id')
  async updateReservation(@Param('id') id: string, @Body() updateData: any) {
    try {
      const result = await this.adminService.updateReservation(id, updateData);
      return { success: true, data: result };
    } catch (error) {
      throw new HttpException(
        `Failed to update reservation: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Put('reservations/:id/delete')
  async deleteReservation(@Param('id') id: string) {
    try {
      const result = await this.adminService.deleteReservation(id);
      return { success: true, data: result };
    } catch (error) {
      throw new HttpException(
        `Failed to delete reservation: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('reservations/:id/participants')
  async getReservationParticipants(@Param('id') id: string) {
    try {
      const result = await this.adminService.getReservationParticipants(id);
      return { success: true, data: result };
    } catch (error) {
      throw new HttpException(
        `Failed to fetch reservation participants: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
