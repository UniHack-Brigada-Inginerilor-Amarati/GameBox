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
import { AuthService } from '../auth/auth.service';

@Controller('tournaments')
export class TournamentController {
  constructor(
    private readonly tournamentService: TournamentService,
    private readonly authService: AuthService,
  ) {}
  private readonly logger = new Logger(TournamentController.name);

  @Get()
  async getTournaments(@Request() req?: any): Promise<Tournament[]> {
    this.logger.debug('GET /tournaments - Fetching all tournaments');
    
    // Try to extract user ID from token if present (optional auth)
    let userId: string | undefined;
    const authHeader = req?.headers?.authorization;
    if (authHeader) {
      const [type, token] = authHeader.split(' ') ?? [];
      if (type === 'Bearer' && token) {
        try {
          const profile = await this.authService.verifyJWT(token);
          userId = profile.id;
          this.logger.debug('User authenticated for tournaments list', { userId });
        } catch (error) {
          // Token invalid or expired, continue without user
          this.logger.debug('Optional auth failed, continuing without user');
        }
      }
    }
    
    return this.tournamentService.getTournaments(userId);
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
    
    // Try to extract user ID from token if present (optional auth)
    let userId: string | undefined;
    const authHeader = req?.headers?.authorization;
    if (authHeader) {
      const [type, token] = authHeader.split(' ') ?? [];
      if (type === 'Bearer' && token) {
        try {
          const profile = await this.authService.verifyJWT(token);
          userId = profile.id;
        } catch (error) {
          // Token invalid or expired, continue without user
        }
      }
    }
    
    return this.tournamentService.getTournamentById(tournamentId, userId);
  }

  @Get('check-registration/:id')
  @UseGuards(AuthGuard)
  async checkRegistration(@Param('id') id: string, @Request() req: any): Promise<{ isRegistered: boolean }> {
    this.logger.debug('GET /tournaments/check-registration/:id - Checking registration status', { id });
    const tournamentId = parseInt(id, 10);
    if (isNaN(tournamentId)) {
      throw new Error('Invalid tournament ID');
    }
    const userId = req.user?.id;
    if (!userId) {
      throw new Error('User ID not found in request');
    }
    const isRegistered = await this.tournamentService.isUserRegistered(tournamentId, userId);
    return { isRegistered };
  }

  @Get(':slug')
  async getTournament(@Param('slug') slug: string, @Request() req?: any): Promise<Tournament> {
    this.logger.debug('GET /tournaments/:slug - Fetching tournament by slug', {
      slug,
    });
    
    // Try to extract user ID from token if present (optional auth)
    let userId: string | undefined;
    const authHeader = req?.headers?.authorization;
    if (authHeader) {
      const [type, token] = authHeader.split(' ') ?? [];
      if (type === 'Bearer' && token) {
        try {
          const profile = await this.authService.verifyJWT(token);
          userId = profile.id;
        } catch (error) {
          // Token invalid or expired, continue without user
        }
      }
    }
    
    return this.tournamentService.getTournament(slug, userId);
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

