import { Module, Logger } from '@nestjs/common';
import { FriendsController } from './friends.controller';
import { FriendsService } from './friends.service';
import { SupabaseModule } from '../supabase/supabase.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [SupabaseModule, AuthModule],
  controllers: [FriendsController],
  providers: [FriendsService, Logger],
  exports: [FriendsService],
})
export class FriendsModule {}

