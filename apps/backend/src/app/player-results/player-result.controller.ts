import { Controller, Get, Post, Put, Body, Param, HttpStatus, HttpCode, Logger } from '@nestjs/common';
import { PlayerResultService } from './player-result.service';
import { PlayerRanks } from './score-calculation.service';
import { PlayerGameResult } from '@gamebox/shared';

export class CreatePlayerResultRequestDto {
  gameResultId: string;
  playerName: string;
  baseScore: number;
  isWin: boolean;
  playerRanks: PlayerRanks;
}

export class UpdatePlayerResultDto {
  score: number;
}

export class CreateMultiplePlayerResultsDto {
  gameResultId: string;
  playerResults: Array<{
    playerName: string;
    baseScore: number;
    isWin: boolean;
    playerRanks: PlayerRanks;
  }>;
}

@Controller('player-results')
export class PlayerResultController {
  private readonly logger = new Logger(PlayerResultController.name);

  constructor(private readonly playerResultService: PlayerResultService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async createPlayerResult(
    @Body() dto: CreatePlayerResultRequestDto,
  ): Promise<PlayerGameResult> {
    this.logger.log(`Creating player result for ${dto.playerName}`);
    return this.playerResultService.createPlayerResult(dto);
  }

  @Post('batch')
  @HttpCode(HttpStatus.CREATED)
  async createMultiplePlayerResults(
    @Body() dto: CreateMultiplePlayerResultsDto,
  ): Promise<PlayerGameResult[]> {
    this.logger.log(`Creating ${dto.playerResults.length} player results for game ${dto.gameResultId}`);
    return this.playerResultService.createMultiplePlayerResults(
      dto.gameResultId,
      dto.playerResults,
    );
  }

  @Get('player/:playerName')
  async getPlayerResults(
    @Param('playerName') playerName: string,
  ): Promise<PlayerGameResult[]> {
    this.logger.log(`Getting player results for ${playerName}`);
    return this.playerResultService.getPlayerResults(playerName);
  }

  @Get('player/:playerName/stats')
  async getPlayerStats(@Param('playerName') playerName: string) {
    this.logger.log(`Getting player stats for ${playerName}`);
    return this.playerResultService.getPlayerStats(playerName);
  }

  @Get(':id')
  async getPlayerResult(@Param('id') id: string): Promise<PlayerGameResult> {
    this.logger.log(`Getting player result ${id}`);
    return this.playerResultService.getPlayerResult(id);
  }

  @Put(':id')
  async updatePlayerResult(
    @Param('id') id: string,
    @Body() dto: UpdatePlayerResultDto,
  ): Promise<PlayerGameResult> {
    this.logger.log(`Updating player result ${id}`);
    return this.playerResultService.updatePlayerResult(id, dto.score);
  }


  @Get('health')
  async healthCheck() {
    return {
      status: 'ok',
      service: 'PlayerResultService',
      timestamp: new Date().toISOString(),
    };
  }
}
