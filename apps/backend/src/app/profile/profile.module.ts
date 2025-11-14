import { Module, Logger } from '@nestjs/common';
import { ProfileController } from './profile.controller';
import { ProfileService } from './profile.service';
import { SupabaseModule } from '../supabase/supabase.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [SupabaseModule, AuthModule],
  controllers: [ProfileController],
  providers: [ProfileService, Logger],
  exports: [ProfileService],
})
export class ProfileModule {}
