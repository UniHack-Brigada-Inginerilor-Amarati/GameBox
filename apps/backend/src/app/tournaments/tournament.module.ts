import { Module, Logger } from '@nestjs/common';
import { TournamentController } from './tournament.controller';
import { TournamentService } from './tournament.service';
import { PayloadModule } from '../payload/payload.module';
import { SupabaseModule } from '../supabase/supabase.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [PayloadModule, SupabaseModule, AuthModule],
  controllers: [TournamentController],
  providers: [TournamentService, Logger],
  exports: [TournamentService],
})
export class TournamentModule {}

