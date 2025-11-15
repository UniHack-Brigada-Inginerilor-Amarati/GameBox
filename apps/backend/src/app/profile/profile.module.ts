import { Module, Logger, forwardRef } from '@nestjs/common';
import { ProfileController } from './profile.controller';
import { ProfileService } from './profile.service';
import { SupabaseModule } from '../supabase/supabase.module';
import { AuthModule } from '../auth/auth.module';
import { AbilityService } from '../profile/ability.service';
import { LeagueScoreService } from './league-score.service';
import { MissionModule } from '../missions/mission.module';
import { GameModule } from '../games/game.module';
import { RiotModule } from '../riot/riot.module';
import { GeminiModule } from '../gemini/gemini.module';

@Module({
  imports: [
    SupabaseModule,
    AuthModule,
    forwardRef(() => MissionModule),
    GameModule,
    RiotModule,
    GeminiModule,
  ],
  controllers: [ProfileController],
  providers: [ProfileService, Logger, AbilityService, LeagueScoreService],
  exports: [ProfileService, AbilityService],
})
export class ProfileModule {}
