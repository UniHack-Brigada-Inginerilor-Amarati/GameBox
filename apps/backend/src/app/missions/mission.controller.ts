import { Controller, Get, Param, Logger, UseGuards, Request, Patch, Body, Post } from '@nestjs/common';
import { MissionService } from './mission.service';
import { Mission } from '@gamebox/shared';
import { AdminGuard } from '../admin/admin.guard';
import { AuthGuard } from '../auth/auth.guard';
import { AuthService } from '../auth/auth.service';

@Controller('missions')
export class MissionController {
  constructor(
    private readonly missionsService: MissionService,
    private readonly authService: AuthService,
  ) {}
  private readonly logger = new Logger(MissionController.name);

  @Get()
  async getMissions(@Request() req?: any): Promise<Mission[]> {
    this.logger.debug('GET /missions - Fetching all missions');
    
    // Try to extract user ID from token if present (optional auth)
    let userId: string | undefined;
    const authHeader = req?.headers?.authorization;
    if (authHeader) {
      const [type, token] = authHeader.split(' ') ?? [];
      if (type === 'Bearer' && token) {
        try {
          const profile = await this.authService.verifyJWT(token);
          userId = profile.id;
          this.logger.debug('User authenticated for missions list', { userId });
        } catch (error) {
          // Token invalid or expired, continue without user
          this.logger.debug('Optional auth failed, continuing without user');
        }
      }
    }
    
    return this.missionsService.getMissions(userId);
  }

  @Get(':slug/players')
  @UseGuards(AdminGuard)
  async getMissionPlayers(@Param('slug') slug: string) {
    this.logger.debug('GET /missions/:slug/players - Fetching mission players', {
      slug,
    });
    return this.missionsService.getMissionPlayers(slug);
  }

  @Patch(':slug/players/:playerId/score')
  @UseGuards(AdminGuard)
  async updatePlayerScore(
    @Param('slug') slug: string,
    @Param('playerId') playerId: string,
    @Body() body: { score: number | null },
  ) {
    this.logger.debug('PATCH /missions/:slug/players/:playerId/score - Updating player score', {
      slug,
      playerId,
      score: body.score,
    });
    return this.missionsService.updatePlayerScore(slug, playerId, body.score);
  }

  @Patch(':slug/players/:playerId/ability-scores')
  @UseGuards(AdminGuard)
  async updatePlayerAbilityScores(
    @Param('slug') slug: string,
    @Param('playerId') playerId: string,
    @Body() body: {
      mental_fortitude_composure_score?: number | null;
      adaptability_decision_making_score?: number | null;
      aim_mechanical_skill_score?: number | null;
      game_sense_awareness_score?: number | null;
      teamwork_communication_score?: number | null;
      strategy_score?: number | null;
    },
  ) {
    this.logger.debug('PATCH /missions/:slug/players/:playerId/ability-scores - Updating player ability scores', {
      slug,
      playerId,
      abilityScores: body,
    });
    return this.missionsService.updatePlayerAbilityScores(slug, playerId, body);
  }

  @Post(':slug/complete')
  @UseGuards(AdminGuard)
  async completeMission(
    @Param('slug') slug: string,
    @Body() body: {
      playerScores: Array<{
        playerId: string;
        score: number | null;
        mental_fortitude_composure_score?: number | null;
        adaptability_decision_making_score?: number | null;
        aim_mechanical_skill_score?: number | null;
        game_sense_awareness_score?: number | null;
        teamwork_communication_score?: number | null;
        strategy_score?: number | null;
      }>;
    },
  ) {
    this.logger.debug('POST /missions/:slug/complete - Completing mission', {
      slug,
      playerCount: body.playerScores.length,
    });
    return this.missionsService.completeMission(slug, body.playerScores);
  }

  @Get(':slug')
  async getMission(@Param('slug') slug: string): Promise<Mission> {
    this.logger.debug('GET /missions/:slug - Fetching mission by slug', {
      slug,
    });
    return this.missionsService.getMission(slug);
  }
}
