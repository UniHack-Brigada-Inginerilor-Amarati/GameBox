import { Module } from '@nestjs/common';
import { SessionController } from './session.controller';
import { SessionService } from './session.service';
import { SupabaseModule } from '../supabase/supabase.module';
import { MissionModule } from '../missions/mission.module';
import { ProfileModule } from '../profile/profile.module';
import { Logger } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [SupabaseModule, MissionModule, ProfileModule, AuthModule],
  controllers: [SessionController],
  providers: [SessionService, Logger],
  exports: [SessionService],
})
export class SessionModule {}
