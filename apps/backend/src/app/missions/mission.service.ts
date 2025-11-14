import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PayloadService } from '../payload/payload.service';
import { Game, Mission } from '@gamebox/shared';

@Injectable()
export class MissionService {
  constructor(private readonly payloadService: PayloadService) {}
  private readonly logger = new Logger(MissionService.name);

  async getMissions(): Promise<Mission[]> {
    this.logger.debug('Fetching all missions from Payload CMS');
    const response = await this.payloadService.makeRequest<{ docs: Mission[] }>(
      'missions?limit=100&sort=-createdAt&depth=1',
    );

    const missions = response.docs || [];
    return missions.map((mission) => this.processMissionMedia(mission));
  }

  async getMission(slug: string): Promise<Mission> {
    this.logger.debug('Fetching mission by slug from Payload CMS', { slug });
    const response = await this.payloadService.makeRequest<{ docs: Mission[] }>(
      `missions?where[slug][equals]=${slug}&depth=2&populate=games`,
    );

    if (!response.docs || response.docs.length === 0) {
      throw new NotFoundException(`Mission with slug '${slug}' not found`);
    }

    return this.processMissionMedia(response.docs[0]);
  }

  async getMissionGames(slug: string): Promise<Game[]> {
    const mission = await this.getMission(slug);
    return [
      mission.games.strengthEndurance,
      mission.games.agilitySpeed,
      mission.games.aimPrecision,
      mission.games.memoryAttention,
      mission.games.communication,
      mission.games.logicProblemSolving,
    ];
  }

  private getPayloadUrl(): string {
    return process.env.PAYLOAD_URL || 'http://localhost:3000';
  }

  private processMissionMedia(mission: Mission): Mission {
    if (mission.media?.url && !mission.media.url.startsWith('http')) {
      const payloadUrl = this.getPayloadUrl();
      mission.media.url = `${payloadUrl}${mission.media.url}`;
    }
    return mission;
  }
}
