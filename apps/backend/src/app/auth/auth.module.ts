import { Module, Logger } from '@nestjs/common';
import { AuthGuard } from './auth.guard';
import { AuthService } from './auth.service';
import { SupabaseModule } from '../supabase/supabase.module';

@Module({
  imports: [SupabaseModule],
  providers: [AuthService, AuthGuard, Logger],
  exports: [AuthGuard, AuthService],
})
export class AuthModule {}
