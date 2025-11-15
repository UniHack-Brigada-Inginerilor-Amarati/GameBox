import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Request,
  Logger,
  UseGuards,
} from '@nestjs/common';
import { TournamentService } from './tournament.service';
import { Tournament, TournamentRegistration } from '@gamebox/shared';
import { AuthGuard } from '../auth/auth.guard';

@Controller('tournaments')
export class TournamentController {
  constructor(private readonly tournamentService: TournamentService) {}
  private readonly logger = new Logger(TournamentController.name);

  @Get()
  async getTournaments(@Request() req?: any): Promise<Tournament[]> {
    this.logger.debug('GET /tournaments - Fetching all tournaments');
    const userId = req?.user?.id;
    return this.tournamentService.getTournaments(userId);
  }

  @Get(':slug')
  async getTournament(@Param('slug') slug: string, @Request() req?: any): Promise<Tournament> {
    this.logger.debug('GET /tournaments/:slug - Fetching tournament by slug', {
      slug,
    });
    const userId = req?.user?.id;
    return this.tournamentService.getTournament(slug, userId);
  }

  @Get('id/:id')
  async getTournamentById(@Param('id') id: string, @Request() req?: any): Promise<Tournament> {
    this.logger.debug('GET /tournaments/id/:id - Fetching tournament by ID', {
      id,
    });
    const tournamentId = parseInt(id, 10);
    if (isNaN(tournamentId)) {
      throw new Error('Invalid tournament ID');
    }
    const userId = req?.user?.id;
    return this.tournamentService.getTournamentById(tournamentId, userId);
  }

  @Post(':id/join')
  @UseGuards(AuthGuard)
  async joinTournament(
    @Param('id') id: string,
    @Request() req: any,
  ): Promise<TournamentRegistration> {
    this.logger.debug('POST /tournaments/:id/join - Joining tournament', { id });
    const tournamentId = parseInt(id, 10);
    if (isNaN(tournamentId)) {
      throw new Error('Invalid tournament ID');
    }
    const userId = req.user?.id;
    if (!userId) {
      throw new Error('User ID not found in request');
    }
    return this.tournamentService.joinTournament(tournamentId, userId);
  }

  @Delete(':id/leave')
  @UseGuards(AuthGuard)
  async leaveTournament(@Param('id') id: string, @Request() req: any): Promise<void> {
    this.logger.debug('DELETE /tournaments/:id/leave - Leaving tournament', { id });
    const tournamentId = parseInt(id, 10);
    if (isNaN(tournamentId)) {
      throw new Error('Invalid tournament ID');
    }
    const userId = req.user?.id;
    if (!userId) {
      throw new Error('User ID not found in request');
    }
    return this.tournamentService.leaveTournament(tournamentId, userId);
  }
}

