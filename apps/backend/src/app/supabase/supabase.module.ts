import { Module } from '@nestjs/common';
import { SupabaseService } from './supabase.service';
import { Logger } from '@nestjs/common';
@Module({
  providers: [SupabaseService, Logger],
  exports: [SupabaseService],
})
export class SupabaseModule {}
