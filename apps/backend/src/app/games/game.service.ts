import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PayloadService } from '../payload/payload.service';
import { Game, GameAbility } from '@gamebox/shared';

@Injectable()
export class GameService {
  constructor(private readonly payloadService: PayloadService) {}
  private readonly logger = new Logger(GameService.name);

  async getGames(): Promise<Game[]> {
    this.logger.debug('Fetching all games from Payload CMS');
    const response = await this.payloadService.makeRequest<{ docs: Game[] }>(
      'games?limit=100&sort=-createdAt&depth=1',
    );
    const games = response.docs || [];
    return games.map((game) => this.processGameMedia(game));
  }

  async getGame(slug: string): Promise<Game> {
    this.logger.debug('Fetching game by slug from Payload CMS', { slug });
    const response = await this.payloadService.makeRequest<{ docs: Game[] }>(
      `games?where[slug][equals]=${slug}&depth=1`,
    );
    if (!response.docs || response.docs.length === 0) {
      throw new NotFoundException(`Game with slug '${slug}' not found`);
    }
    return this.processGameMedia(response.docs[0]);
  }

  private getPayloadUrl(): string {
    return process.env.PAYLOAD_URL || 'http://localhost:3000';
  }

  private processGameMedia(game: Game): Game {
    const payloadUrl = this.getPayloadUrl();

    if (game.picture && !game.picture.startsWith('http')) {
      game.picture = `${payloadUrl}${game.picture}`;
    }

    if (game.thumbnail && !game.thumbnail.startsWith('http')) {
      game.thumbnail = `${payloadUrl}${game.thumbnail}`;
    }
    if (game.media && Array.isArray(game.media)) {
      game.media = game.media.map((mediaItem) => {
        if (mediaItem.url && !mediaItem.url.startsWith('http')) {
          mediaItem.url = `${payloadUrl}${mediaItem.url}`;
        }

        if (mediaItem.mediaField?.url && !mediaItem.mediaField.url.startsWith('http')) {
          mediaItem.mediaField.url = `${payloadUrl}${mediaItem.mediaField.url}`;
        }

        return mediaItem;
      });
    }

    // Transform abilities to ensure they have the correct format with scores
    // The afterRead hook in Payload should have already transformed the score fields to abilities array
    // But we ensure the format is correct and handle icon URLs
    if (game.abilities && Array.isArray(game.abilities)) {
      game.abilities = game.abilities.map((item: any): GameAbility => {
        if (item && typeof item === 'object' && item.slug && item.score !== undefined) {
          // Process icon URL if needed
          let iconUrl = '';
          if (item.icon) {
            if (typeof item.icon === 'object' && item.icon.url) {
              iconUrl = item.icon.url;
            } else if (typeof item.icon === 'string') {
              iconUrl = item.icon;
            }
            // Ensure full URL if relative
            if (iconUrl && !iconUrl.startsWith('http')) {
              iconUrl = `${payloadUrl}${iconUrl}`;
            }
          }

          return {
            slug: item.slug,
            name: item.name || '',
            description: item.description || '',
            icon: iconUrl ? {
              url: iconUrl,
              filename: item.icon?.filename,
            } : undefined,
            score: Math.max(0, Math.min(100, item.score || 0)),
            id: item.id?.toString(),
          };
        }
        // Return a minimal valid GameAbility if format is unexpected
        return {
          slug: item?.slug || '',
          name: item?.name || '',
          description: item?.description || '',
          score: 0,
        };
      }).filter((ability: GameAbility) => ability.slug !== '');
    }

    return game;
  }
}
