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
    const url = `${this.payloadUrl}/api/${endpoint}`;
    try {
      this.logger.debug(`Making request to Payload CMS: ${url}`);

      const response = await firstValueFrom(
        this.httpService.get<T>(url),
      );

      return response.data;
    } catch (error: any) {
      const status = error.response?.status || error.status;
      const statusText = error.response?.statusText || error.statusText || 'Unknown error';
      const errorMessage = error.response?.data?.message || error.message || 'Unknown error';
      const errorDetails = error.response?.data || {};

      this.logger.error(`Payload CMS request failed: ${endpoint}`, {
        url,
        status,
        statusText,
        errorMessage,
        errorDetails,
        payloadUrl: this.payloadUrl,
      });

      if (status === 404) {
        throw new NotFoundException(`Resource not found: ${endpoint}`);
      }

      if (status >= 400 && status < 500) {
        const detailedMessage = errorDetails?.message 
          ? `Bad request to Payload CMS (${endpoint}): ${errorDetails.message}`
          : `Bad request to Payload CMS (${endpoint}): ${statusText}`;
        throw new BadRequestException(detailedMessage);
      }

      // Network errors or other issues
      const networkMessage = error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND'
        ? `Cannot connect to Payload CMS at ${this.payloadUrl}. Is it running?`
        : `Payload CMS request failed (${endpoint}): ${errorMessage}`;
      
      throw new BadRequestException(networkMessage);
    }
  }
}
