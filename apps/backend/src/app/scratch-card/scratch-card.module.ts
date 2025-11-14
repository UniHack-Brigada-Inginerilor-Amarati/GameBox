import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { ScratchCardController } from './scratch-card.controller';
import { ScratchCardService } from './scratch-card.service';
import { GameModule } from '../games/game.module';
import { SupabaseModule } from '../supabase/supabase.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [HttpModule, GameModule, SupabaseModule, AuthModule],
  controllers: [ScratchCardController],
  providers: [ScratchCardService],
  exports: [ScratchCardService],
})
export class ScratchCardModule {}
