import { Module, forwardRef } from '@nestjs/common';
import { MissionController } from './mission.controller';
import { MissionService } from './mission.service';
import { PayloadModule } from '../payload/payload.module';
import { SupabaseModule } from '../supabase/supabase.module';
import { ProfileModule } from '../profile/profile.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [PayloadModule, SupabaseModule, forwardRef(() => ProfileModule), AuthModule],
  controllers: [MissionController],
  providers: [MissionService],
  exports: [MissionService],
})
export class MissionModule {}
