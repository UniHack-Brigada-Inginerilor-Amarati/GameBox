import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  UseGuards,
  Logger,
  Patch,
} from '@nestjs/common';
import { SessionService } from './session.service';
import { UserProfileDTO, Session, PlayerGameResult } from '@gamebox/shared';
import { AdminGuard } from '../admin/admin.guard';
import { AuthGuard } from '../auth/auth.guard';
import { BadRequestException } from '@nestjs/common';

@Controller('sessions')
export class SessionController {
  constructor(private readonly sessionService: SessionService) {}
  private readonly logger = new Logger(SessionController.name);

  @Post()
  @UseGuards(AdminGuard)
  async createSession(@Body() body: { missionSlug: string; gameMaster: string }): Promise<Session> {
    return this.sessionService.createSession(body.missionSlug, body.gameMaster);
  }

  @Get()
  @UseGuards(AdminGuard)
  async getSessions(): Promise<Session[]> {
    this.logger.debug('GET /sessions - Fetching all sessions');
    return this.sessionService.getSessions();
  }

  @Get(':id')
  @UseGuards(AdminGuard)
  async getSession(@Param('id') id: string): Promise<Session> {
    this.logger.debug('GET /sessions/:id - Fetching session by ID', { id });
    return this.sessionService.getSession(id);
  }

  @Get(':id/players')
  @UseGuards(AdminGuard)
  async getSessionPlayers(@Param('id') id: string): Promise<UserProfileDTO[]> {
    this.logger.debug('GET /sessions/:id/players - Fetching session players', {
      id,
    });
    return this.sessionService.getSessionPlayers(id);
  }

  @Post(':id/players')
  @UseGuards(AdminGuard)
  async addSessionPlayers(
    @Param('id') id: string,
    @Body() body: { playerNames?: string[]; player_ids?: string[] },
  ): Promise<PlayerGameResult[]> {
    this.logger.debug('POST /sessions/:id/players - Adding session players', {
      id,
      body,
    });
    // Support both playerNames (usernames) and player_ids (UUIDs)
    if (body.player_ids && body.player_ids.length > 0) {
      return this.sessionService.addSessionPlayersByIds(id, body.player_ids);
    } else if (body.playerNames && body.playerNames.length > 0) {
      return this.sessionService.addSessionPlayers(id, body.playerNames);
    } else {
      throw new BadRequestException('Either playerNames or player_ids must be provided');
    }
  }

  @Patch(':id/start')
  @UseGuards(AdminGuard)
  async startSession(@Param('id') id: string): Promise<Session> {
    this.logger.debug('PUT /sessions/:id - Updating session time', {
      id,
    });
    return this.sessionService.setStartTime(id);
  }

  @Patch(':id/end')
  @UseGuards(AdminGuard)
  async endSession(@Param('id') id: string): Promise<Session> {
    this.logger.debug('PUT /sessions/:id - Updating session time', {
      id,
    });
    return this.sessionService.setEndTime(id);
  }

  @Get(':id/game-results')
  @UseGuards(AuthGuard)
  async getGameResults(@Param('id') id: string): Promise<PlayerGameResult[]> {
    this.logger.debug('GET /sessions/:id - Fetching player game results', { id });
    return this.sessionService.getGameResults(id);
  }
}
