import { Module, Logger, forwardRef } from '@nestjs/common';
import { ProfileController } from './profile.controller';
import { ProfileService } from './profile.service';
import { SupabaseModule } from '../supabase/supabase.module';
import { AuthModule } from '../auth/auth.module';
import { AbilityService } from '../profile/ability.service';
import { MissionModule } from '../missions/mission.module';
import { GameModule } from '../games/game.module';

@Module({
  imports: [SupabaseModule, AuthModule, forwardRef(() => MissionModule), GameModule],
  controllers: [ProfileController],
  providers: [ProfileService, Logger, AbilityService],
  exports: [ProfileService, AbilityService],
})
export class ProfileModule {}
