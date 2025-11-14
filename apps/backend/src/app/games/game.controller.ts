import { Controller, Get, Param, Logger } from '@nestjs/common';
import { GameService } from './game.service';
import { Game } from '@gamebox/shared';

@Controller('games')
export class GameController {
  constructor(private readonly gamesService: GameService) {}
  private readonly logger = new Logger(GameController.name);

  @Get()
  async getGames(): Promise<Game[]> {
    this.logger.debug('GET /games - Fetching all games');
    return this.gamesService.getGames();
  }

  @Get(':slug')
  async getGame(@Param('slug') slug: string): Promise<Game> {
    this.logger.debug('GET /games/:slug - Fetching game by slug', { slug });
    return this.gamesService.getGame(slug);
  }
}
