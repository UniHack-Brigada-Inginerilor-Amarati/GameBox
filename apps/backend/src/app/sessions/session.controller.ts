import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  UseGuards,
  Logger,
  Delete,
  Patch,
} from '@nestjs/common';
import { SessionService } from './session.service';
import {
  UserProfileDTO,
  MissionSession,
  SessionPlayer,
  GameResult,
  PlayerGameResult,
} from '@gamebox/shared';
import { AdminGuard } from '../admin/admin.guard';
import { BadRequestException } from '@nestjs/common';

@Controller('sessions')
export class SessionController {
  constructor(private readonly sessionService: SessionService) {}
  private readonly logger = new Logger(SessionController.name);

  @Post()
  @UseGuards(AdminGuard)
  async createSession(
    @Body() body: { missionSlug: string; gameMaster: string },
  ): Promise<MissionSession> {
    return this.sessionService.createSession(body.missionSlug, body.gameMaster);
  }

  @Get()
  @UseGuards(AdminGuard)
  async getSessions(): Promise<MissionSession[]> {
    this.logger.debug('GET /sessions - Fetching all sessions');
    return this.sessionService.getSessions();
  }

  @Get(':id')
  @UseGuards(AdminGuard)
  async getSession(@Param('id') id: string): Promise<MissionSession> {
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
  ): Promise<SessionPlayer[]> {
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

  @Delete(':id/players')
  @UseGuards(AdminGuard)
  async removeSessionPlayers(
    @Param('id') id: string,
    @Body() body: { playerNames: string[] },
  ): Promise<void> {
    this.logger.debug('DELETE /sessions/:id/players - Removing session players', {
      id,
      body,
    });
    return this.sessionService.removeSessionPlayers(id, body.playerNames);
  }

  @Patch(':id/start')
  @UseGuards(AdminGuard)
  async startSession(@Param('id') id: string): Promise<MissionSession> {
    this.logger.debug('PUT /sessions/:id - Updating session time', {
      id,
    });
    return this.sessionService.setStartTime(id);
  }

  @Patch(':id/end')
  @UseGuards(AdminGuard)
  async endSession(@Param('id') id: string): Promise<MissionSession> {
    this.logger.debug('PUT /sessions/:id - Updating session time', {
      id,
    });
    return this.sessionService.setEndTime(id);
  }

  @Get(':id/game-results')
  @UseGuards(AdminGuard)
  async getGameResults(@Param('id') id: string): Promise<PlayerGameResult[]> {
    this.logger.debug('GET /sessions/:id - Fetching player game results', { id });
    return this.sessionService.getGameResults(id);
  }

  @Post(':id/game-results')
  @UseGuards(AdminGuard)
  async createGameResults(
    @Param('id') id: string,
    @Body()
    body: {
      gameSlug: string;
      playerNames: string[];
    },
  ): Promise<GameResult[]> {
    this.logger.debug('POST /sessions/:id/game-results - Creating game results', { id, body });
    return this.sessionService.createGameResults(id, body.gameSlug, body.playerNames);
  }
}
