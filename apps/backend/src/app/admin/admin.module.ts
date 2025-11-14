import { Module, Logger } from '@nestjs/common';
import { AdminController } from './admin.controller';
import { AdminGuard } from './admin.guard';
import { AdminService } from './admin.service';
import { SupabaseModule } from '../supabase/supabase.module';
import { AuthModule } from '../auth/auth.module';
import { ProfileService } from '../profile/profile.service';

@Module({
  imports: [SupabaseModule, AuthModule],
  controllers: [AdminController],
  providers: [Logger, AdminService, AdminGuard, ProfileService],
  exports: [AdminService, AdminGuard],
})
export class AdminModule {}
