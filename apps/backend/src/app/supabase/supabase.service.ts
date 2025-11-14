import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { createClient } from '@supabase/supabase-js';

@Injectable()
export class SupabaseService {
  private readonly logger = new Logger(SupabaseService.name);
  private readonly DB_SCHEMA = 'gamebox';

  // Client for user operations (with RLS)
  readonly supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_ANON_KEY,
    {
      db: {
        schema: this.DB_SCHEMA,
      },
    }
  );

  // Admin client for backend operations (bypasses RLS)
  readonly supabaseAdmin = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY,
    {
      db: {
        schema: this.DB_SCHEMA,
      },
    }
  );

  handleSupabaseError(
    operation: string,
    error: any,
    context?: any
  ): never {
    this.logger.error(`Supabase operation failed: ${operation}`, {
      error: error.message,
      context,
    });

    // Handle specific Supabase error types
    if (error.code === 'PGRST116' || error.message?.includes('not found')) {
      throw new NotFoundException(`${operation} failed: Resource not found`);
    }

    if (error.code === '23505' || error.message?.includes('duplicate key')) {
      throw new BadRequestException(`${operation} failed: Duplicate entry`);
    }

    if (error.code === '23503' || error.message?.includes('foreign key')) {
      throw new BadRequestException(`${operation} failed: Invalid reference`);
    }

    if (
      error.message?.includes('permission denied') ||
      error.message?.includes('unauthorized')
    ) {
      throw new UnauthorizedException(`${operation} failed: Permission denied`);
    }

    throw new BadRequestException(
      `${operation} failed: ${error.message || 'Unknown error'}`
    );
  }
}
