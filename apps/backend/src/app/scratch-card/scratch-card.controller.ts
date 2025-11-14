import { Controller, Get, Logger, Request, UseGuards } from '@nestjs/common';
import { ScratchCardService } from './scratch-card.service';
import { ScratchCard } from '@gamebox/shared';
import { AuthGuard } from '../auth/auth.guard';

@Controller('scratch-card')
export class ScratchCardController {
  constructor(private readonly scratchCardService: ScratchCardService) {}
  private readonly logger = new Logger(ScratchCardController.name);

  @Get()
  @UseGuards(AuthGuard)
  async getScratchCard(@Request() req: { user?: { id: string } }): Promise<ScratchCard> {
    this.logger.debug('GET /scratch-card - Fetching scratch card data', { userId: req.user?.id });
    return this.scratchCardService.getScratchCard(req.user?.id);
  }
}
