import { Controller, Get, Param, Logger } from '@nestjs/common';
import { MissionService } from './mission.service';
import { Mission } from '@gamebox/shared';

@Controller('missions')
export class MissionController {
  constructor(private readonly missionsService: MissionService) {}
  private readonly logger = new Logger(MissionController.name);

  @Get()
  async getMissions(): Promise<Mission[]> {
    this.logger.debug('GET /missions - Fetching all missions');
    return this.missionsService.getMissions();
  }

  @Get(':slug')
  async getMission(@Param('slug') slug: string): Promise<Mission> {
    this.logger.debug('GET /missions/:slug - Fetching mission by slug', {
      slug,
    });
    return this.missionsService.getMission(slug);
  }
}
