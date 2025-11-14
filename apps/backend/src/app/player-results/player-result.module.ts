import { Module } from '@nestjs/common';
import { PlayerResultController } from './player-result.controller';
import { PlayerResultService } from './player-result.service';
import { ScoreCalculationService } from './score-calculation.service';
import { SupabaseModule } from '../supabase/supabase.module';
import { GameModule } from '../games/game.module';

@Module({
  imports: [SupabaseModule, GameModule],
  controllers: [PlayerResultController],
  providers: [PlayerResultService, ScoreCalculationService],
  exports: [PlayerResultService, ScoreCalculationService],
})
export class PlayerResultModule {}
