import {
  Controller,
  Get,
  Query,
  Param,
  UseGuards,
  Logger,
  BadRequestException,
} from '@nestjs/common';
import { AuthGuard } from '../auth/auth.guard';
import { RiotService } from './riot.service';

@Controller('riot')
export class RiotController {
  private readonly logger = new Logger(RiotController.name);

  constructor(private readonly riotService: RiotService) {}

  @Get('league/past-week')
  @UseGuards(AuthGuard)
  async getLeagueMatchesPastWeek(
    @Query('username') username?: string,
    @Query('riotUsername') riotUsername?: string,
    @Query('region') region?: string,
  ) {
    const targetUsername = riotUsername || username;
    
    if (!targetUsername) {
      throw new BadRequestException('Riot username is required (use ?riotUsername=gameName#tagLine)');
    }

    this.logger.debug(`GET /riot/league/past-week - Fetching League matches from past week`, {
      riotUsername: targetUsername,
      region: region || 'americas',
    });

    return this.riotService.getLeagueMatchesPastWeek(targetUsername, region);
  }

  @Get('league/last-match')
  @UseGuards(AuthGuard)
  async getLastLeagueMatch(
    @Query('username') username?: string,
    @Query('riotUsername') riotUsername?: string,
    @Query('region') region?: string,
  ) {
    const targetUsername = riotUsername || username;
    
    if (!targetUsername) {
      throw new BadRequestException('Riot username is required (use ?riotUsername=gameName#tagLine)');
    }

    this.logger.debug(`GET /riot/league/last-match - Fetching last League match`, {
      riotUsername: targetUsername,
      region: region || 'americas',
    });

    return this.riotService.getLastLeagueMatch(targetUsername, region);
  }

  @Get('valorant/last-match')
  @UseGuards(AuthGuard)
  async getLastValorantMatch(
    @Query('username') username?: string,
    @Query('riotUsername') riotUsername?: string,
    @Query('region') region?: string,
  ) {
    const targetUsername = riotUsername || username;
    
    if (!targetUsername) {
      throw new BadRequestException('Riot username is required (use ?riotUsername=gameName#tagLine)');
    }

    this.logger.debug(`GET /riot/valorant/last-match - Fetching last Valorant match`, {
      riotUsername: targetUsername,
      region: region || 'na',
    });

    return this.riotService.getLastValorantMatch(targetUsername, region);
  }

  @Get('league/last-match/:riotUsername')
  @UseGuards(AuthGuard)
  async getLastLeagueMatchByParam(
    @Param('riotUsername') riotUsername: string,
    @Query('region') region?: string,
  ) {
    this.logger.debug(`GET /riot/league/last-match/:riotUsername - Fetching last League match`, {
      riotUsername,
      region: region || 'americas',
    });

    return this.riotService.getLastLeagueMatch(riotUsername, region);
  }

  @Get('valorant/last-match/:riotUsername')
  @UseGuards(AuthGuard)
  async getLastValorantMatchByParam(
    @Param('riotUsername') riotUsername: string,
    @Query('region') region?: string,
  ) {
    this.logger.debug(`GET /riot/valorant/last-match/:riotUsername - Fetching last Valorant match`, {
      riotUsername,
      region: region || 'na',
    });

    return this.riotService.getLastValorantMatch(riotUsername, region);
  }
}

