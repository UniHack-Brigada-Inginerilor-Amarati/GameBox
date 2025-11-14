import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';

@Injectable()
export class PayloadService {
  private readonly logger = new Logger(PayloadService.name);
  private readonly payloadUrl: string;

  constructor(private readonly httpService: HttpService) {
    this.payloadUrl = process.env.PAYLOAD_URL || 'http://localhost:3000';
  }

  async makeRequest<T>(endpoint: string): Promise<T> {
    try {
      this.logger.debug(`Making request to Payload CMS: ${endpoint}`);

      const response = await firstValueFrom(
        this.httpService.get<T>(`${this.payloadUrl}/api/${endpoint}`),
      );

      return response.data;
    } catch (error) {
      this.logger.error(`Payload CMS request failed: ${endpoint}`, {
        error: error.message,
        status: error.response?.status,
        statusText: error.response?.statusText,
      });

      if (error.response?.status === 404) {
        throw new NotFoundException(`Resource not found: ${endpoint}`);
      }

      if (error.response?.status >= 400 && error.response?.status < 500) {
        throw new BadRequestException(`Bad request to Payload CMS: ${error.response?.statusText}`);
      }

      throw new BadRequestException(`Payload CMS request failed: ${error.message}`);
    }
  }
}
